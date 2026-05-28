package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/redis/go-redis/v9"
)

type JobPayload struct {
	DocumentId     string `json:"documentId"`
	OrganizationId string `json:"organizationId"`
	CourseId       string `json:"courseId"`
	FilePath       string `json:"filePath"`
	DocumentName   string `json:"documentName"`
}

var ctx = context.Background()

func main() {
	redisHost := getEnv("REDIS_HOST", "localhost")
	redisPort := getEnv("REDIS_PORT", "6379")
	dbUrl := normalizePostgresURL(getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/chatbot_rag?sslmode=disable"))

	// 1. Kết nối Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", redisHost, redisPort),
	})
	defer rdb.Close()

	// 2. Kết nối PostgreSQL
	db, err := sql.Open("postgres", dbUrl)
	if err != nil {
		log.Fatalf("[PostgreSQL] Failed to open connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("[PostgreSQL] Failed to ping database: %v", err)
	}
	log.Println("[PostgreSQL] Connected to database")

	log.Println("[Worker] Golang Ingestion Worker is running and listening to queue...")

	// 3. Vòng lặp lắng nghe Hàng đợi Redis
	for {
		// Dùng BRPOP để chặn chờ Job (timeout = 0 nghĩa là chờ vô hạn)
		result, err := rdb.BRPop(ctx, 0, "rag:ingestion:queue").Result()
		if err != nil {
			log.Printf("[Redis] Error popping from queue: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		// result[0] là tên key ("rag:ingestion:queue"), result[1] là payload JSON
		payloadStr := result[1]
		var payload JobPayload
		if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
			log.Printf("[Worker] Failed to unmarshal job payload: %v", err)
			continue
		}

		log.Printf("[Worker] Start processing document: %s (%s)", payload.DocumentName, payload.DocumentId)

		// Kích hoạt webhook báo trạng thái: PROCESSING
		updateDocumentStatus(payload.DocumentId, "PROCESSING", "")

		err = processDocument(payload, db)
		if err != nil {
			log.Printf("[Worker] Failed to process document %s: %v", payload.DocumentId, err)
			updateDocumentStatus(payload.DocumentId, "FAILED", err.Error())
		} else {
			log.Printf("[Worker] Successfully processed document %s", payload.DocumentId)
			updateDocumentStatus(payload.DocumentId, "COMPLETED", "")
		}
	}
}

func processDocument(payload JobPayload, db *sql.DB) error {
	filePath := payload.FilePath

	// Tạo thư mục chunks tạm thời
	// Đối với môi trường phát triển cục bộ, nếu thư mục "../../api" tồn tại, chúng ta sẽ lưu vào "../../api/uploads/chunks"
	chunksDir := "./uploads/chunks"
	if _, err := os.Stat("../../api"); err == nil {
		chunksDir = "../../api/uploads/chunks"
		// Ánh xạ đường dẫn tệp tin gốc sang thư mục api/uploads
		if len(filePath) >= 9 && filePath[:9] == "./uploads" {
			filePath = "../../api/uploads" + filePath[9:]
		} else if len(filePath) >= 7 && filePath[:7] == "uploads" {
			filePath = "../../api/uploads" + filePath[7:]
		}
	}

	// Kiểm tra sự tồn tại của file PDF gốc
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("file does not exist: %s", filePath)
	}

	if err := os.MkdirAll(chunksDir, 0755); err != nil {
		return fmt.Errorf("failed to create chunks dir: %v", err)
	}

	// 1. Sử dụng pdfcpu để trích xuất/cắt nhỏ PDF thành các file 1 trang
	log.Printf("[pdfcpu] Splitting PDF: %s", filePath)
	err := api.SplitFile(filePath, chunksDir, 1, nil)
	if err != nil {
		return fmt.Errorf("pdfcpu split error: %v", err)
	}

	// Quét các file PDF trang đơn đã được tạo
	baseName := filepath.Base(filePath)
	baseNameWithoutExt := baseName[:len(baseName)-len(filepath.Ext(baseName))]

	pageNumber := 1
	for {
		expectedChunkPath := filepath.Join(chunksDir, fmt.Sprintf("%s_%d.pdf", baseNameWithoutExt, pageNumber))
		if _, err := os.Stat(expectedChunkPath); os.IsNotExist(err) {
			break // Hết các trang PDF
		}

		// Đọc file trang đơn thành bytes
		pageBytes, err := os.ReadFile(expectedChunkPath)
		if err != nil {
			return fmt.Errorf("failed to read page %d chunk: %v", pageNumber, err)
		}

		// Rename lại file chunk cho khớp với định dạng: <documentId>_page_<pageNumber>.pdf
		targetChunkPath := filepath.Join(chunksDir, fmt.Sprintf("%s_page_%d.pdf", payload.DocumentId, pageNumber))
		err = os.Rename(expectedChunkPath, targetChunkPath)
		if err != nil {
			return fmt.Errorf("failed to rename chunk path: %v", err)
		}

		// Chuyển sang Base64
		pageBase64 := base64.StdEncoding.EncodeToString(pageBytes)

		// 2. Tạo Embedding qua Gemini API với cơ chế retry Exponential Backoff
		vector, err := generateEmbeddingWithRetry(pageBase64, payload.DocumentName, pageNumber)
		if err != nil {
			return fmt.Errorf("gemini embedding error on page %d: %v", pageNumber, err)
		}

		// Chuyển vector thành chuỗi mảng dạng JSON để insert vào pgvector
		vectorJSON, err := json.Marshal(vector)
		if err != nil {
			return fmt.Errorf("failed to marshal vector on page %d: %v", pageNumber, err)
		}

		// Insert vào PostgreSQL (Bảng document_chunks)
		chunkId := uuid.NewString()
		_, err = db.Exec(`
			INSERT INTO document_chunks (id, document_id, content, page_number, embedding)
			VALUES ($1, $2, $3, $4, $5)
		`, chunkId, payload.DocumentId, "", pageNumber, string(vectorJSON))
		if err != nil {
			return fmt.Errorf("postgres insert error on page %d: %v", pageNumber, err)
		}

		pageNumber++
	}

	// 4. Giữ lại file PDF gốc để người dùng có thể tải về (không xóa)
	// _ = os.Remove(filePath)
	return nil
}

func generateEmbeddingWithRetry(base64Data string, docName string, page int) ([]float32, error) {
	geminiKey := os.Getenv("GEMINI_API_KEY")
	if geminiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY environment variable is empty")
	}

	maxRetries := 5
	baseDelayMs := 2000.0

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=%s", geminiKey)

	payloadMap := map[string]interface{}{
		"model": "models/gemini-embedding-2",
		"content": map[string]interface{}{
			"parts": []interface{}{
				map[string]interface{}{
					"text": fmt.Sprintf("Document: %s | Page: %d", docName, page),
				},
				map[string]interface{}{
					"inlineData": map[string]interface{}{
						"mimeType": "application/pdf",
						"data":     base64Data,
					},
				},
			},
		},
	}

	payloadBytes, err := json.Marshal(payloadMap)
	if err != nil {
		return nil, err
	}

	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			if attempt < maxRetries {
				delay := time.Duration(baseDelayMs*math.Pow(2, float64(attempt))) * time.Millisecond
				time.Sleep(delay)
				continue
			}
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == 429 && attempt < maxRetries {
			delay := time.Duration(baseDelayMs*math.Pow(2, float64(attempt))) * time.Millisecond
			time.Sleep(delay)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			bodyBytes, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("gemini api returned status %d: %s", resp.StatusCode, string(bodyBytes))
		}

		var result struct {
			Embedding *struct {
				Values []float32 `json:"values"`
			} `json:"embedding"`
			Embeddings []struct {
				Values []float32 `json:"values"`
			} `json:"embeddings"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, err
		}

		if result.Embedding != nil && len(result.Embedding.Values) > 0 {
			return result.Embedding.Values, nil
		} else if len(result.Embeddings) > 0 {
			return result.Embeddings[0].Values, nil
		}

		return nil, fmt.Errorf("gemini api response does not contain any embedding values")
	}

	return nil, fmt.Errorf("failed to generate embedding after retries")
}

func updateDocumentStatus(docId string, status string, errorMessage string) {
	apiURL := getEnv("INTERNAL_API_URL", "http://localhost:3000")
	internalKey := os.Getenv("INTERNAL_API_KEY")

	url := fmt.Sprintf("%s/api/internal/documents/%s", apiURL, docId)

	payload := map[string]string{
		"status": status,
		"error":  errorMessage,
	}
	payloadBytes, _ := json.Marshal(payload)

	req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("[Webhook] Failed to create request: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", internalKey))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Webhook] Failed to call webhook: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Webhook] Webhook status error: %d", resp.StatusCode)
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func normalizePostgresURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}

	if parsed.Scheme != "postgres" && parsed.Scheme != "postgresql" {
		return raw
	}

	query := parsed.Query()
	query.Del("schema")
	if query.Get("sslmode") == "" {
		query.Set("sslmode", "disable")
	}
	parsed.RawQuery = query.Encode()

	return parsed.String()
}
