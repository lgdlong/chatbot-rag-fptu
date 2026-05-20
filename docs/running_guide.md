# Hướng dẫn Khởi chạy Hệ thống FPTU Chatbot RAG

Tài liệu này cung cấp hướng dẫn từng bước để thiết lập môi trường, khởi tạo cơ sở dữ liệu và chạy toàn bộ hệ thống FPTU Chatbot RAG (bao gồm Backend API, Frontend Web, và các dịch vụ cơ sở hạ tầng như PostgreSQL, Qdrant, Redis).

---

## 🛠️ Yêu cầu môi trường (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
1. **Node.js** (Phiên bản v20 trở lên) hoặc **Bun**.
2. **Docker & Docker Compose** (để khởi chạy PostgreSQL, Qdrant và Redis).
3. **Go** (Phiên bản 1.21 trở lên) - để chạy Ingestion Worker.
4. **Make** (tùy chọn - hữu ích để chạy các lệnh tắt nhanh, đặc biệt trên macOS/Linux hoặc Windows Git Bash).

---

## 🔑 Thiết lập biến môi trường (Environment Variables)

Hệ thống sử dụng một file `.env` duy nhất đặt tại **thư mục gốc (root)** của dự án. Cả Backend (`api/`) và Frontend (`web/`) sẽ nạp các cấu hình từ file này.

1. Tạo file `.env` bằng cách sao chép từ file ví dụ:
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` mới tạo và điền đầy đủ các thông tin:
   * **Cơ sở dữ liệu**: Điền thông tin kết nối PostgreSQL (mặc định đã được cấu hình trùng với file `docker-compose.yml`).
   * **Better Auth**: Cấu hình `BETTER_AUTH_SECRET` (khóa bí mật phiên đăng nhập) và `BETTER_AUTH_URL` (URL của backend, mặc định là `http://localhost:3000`).
   * **Qdrant**: Cấu hình `QDRANT_URL` (mặc định là `http://localhost:6333`) và `QDRANT_API_KEY` (nếu cần bảo mật).
   * **Gemini API Key**: Điền `GEMINI_API_KEY` của bạn. Đây là khóa **bắt buộc** để thực hiện sinh nhúng Vector (Embedding 2) và gọi LLM trả lời câu hỏi.

---

## 🐳 Khởi động các dịch vụ hạ tầng (Docker Compose)

Hệ thống yêu cầu PostgreSQL, Qdrant (Vector Database) và Redis (Caching/Session). Cách khởi chạy nhanh nhất là sử dụng Docker Compose.

* **Sử dụng Makefile:**
  ```bash
  make db-up
  ```
* **Hoặc sử dụng lệnh Docker trực tiếp:**
  ```bash
  docker compose up -d
  ```

* **Kiểm tra trạng thái các container:**
  ```bash
  make db-status
  # Hoặc: docker compose ps
  ```

---

## 🗄️ Cấu hình Cơ sở dữ liệu (Prisma Database Setup)

Sau khi cơ sở dữ liệu PostgreSQL đã khởi chạy thành công trong Docker, bạn cần đồng bộ schema và tạo các client thư viện.

1. **Cài đặt thư viện phụ thuộc (Dependencies)**:
   * **Sử dụng Makefile:**
     ```bash
     make install
     ```
   * **Hoặc từng thư mục:**
     ```bash
     npm install --prefix api
     npm install --prefix web
     ```

2. **Tạo Prisma Client**:
   * **Sử dụng Makefile:**
     ```bash
     make prisma-generate
     ```
   * **Sử dụng CLI trực tiếp:**
     ```bash
     npx --prefix api prisma generate --schema=api/prisma/schema.prisma
     ```

3. **Đồng bộ cấu trúc bảng (Migrations/Push)**:
   * **Sử dụng Makefile:**
     ```bash
     make migrate
     ```
   * **Sử dụng CLI trực tiếp:**
     ```bash
     npx --prefix api prisma db push --schema=api/prisma/schema.prisma
     ```

4. **Trình quản lý cơ sở dữ liệu trực quan (Prisma Studio)**:
   Nếu muốn xem trực tiếp các bảng và dữ liệu trong Database (như bảng User, Session, v.v.):
   ```bash
   make prisma-studio
   # Hoặc: npx --prefix api prisma studio --schema=api/prisma/schema.prisma
   ```

---

## 🚀 Khởi chạy ứng dụng (Running the Application)

Hệ thống gồm ba thành phần cần chạy song song để hoạt động đầy đủ: Backend API (cổng `3000`), Frontend Web Next.js (cổng `3001`), và Go Ingestion Worker (xử lý tài liệu và Vector ở background).

### Cách 1: Sử dụng Makefile & Scripts (Khuyến nghị)

Mở ba cửa sổ Terminal riêng biệt tại thư mục gốc và chạy các lệnh tương ứng:

* **Terminal 1 - Chạy Backend API:**
  ```bash
  make dev-api
  ```
* **Terminal 2 - Chạy Frontend Web:**
  ```bash
  make dev-web
  ```
* **Terminal 3 - Chạy Go Ingestion Worker (Xử lý tài liệu):**
  * *Trên Windows (PowerShell)*:
    ```powershell
    ./services/ingestion-worker/run.ps1
    ```
  * *Trên macOS/Linux (Bash)*:
    ```bash
    cd services/ingestion-worker
    export $(grep -v '^#' ../../.env | xargs)
    go run main.go
    ```

---

### Cách 2: Sử dụng lệnh CLI trực tiếp

Mở ba cửa sổ Terminal riêng biệt và thực hiện:

* **Terminal 1 - Chạy Backend API:**
  Chuyển vào thư mục `api/` và chạy:
  ```bash
  cd api
  npm run dev
  ```
* **Terminal 2 - Chạy Frontend Web:**
  Chuyển vào thư mục `web/` và chạy:
  ```bash
  cd web
  npm run dev
  ```
* **Terminal 3 - Chạy Go Ingestion Worker:**
  Chuyển vào thư mục `services/ingestion-worker/` và chạy:
  * *Windows (PowerShell)*:
    ```powershell
    cd services/ingestion-worker
    ./run.ps1
    ```
  * *macOS/Linux/Bash*:
    ```bash
    cd services/ingestion-worker
    export $(grep -v '^#' ../../.env | xargs)
    go run main.go
    ```

---

## 🏗️ Lệnh Build & Lint (Build & Lint Commands)

### Build Commands

* **Build cả hai workspace (API + Web):**
  ```bash
  make build-all
  # Hoặc: npm run build --prefix api && npm run build --prefix web
  ```

* **Build chỉ Backend API:**
  ```bash
  make build-api
  # Hoặc: npm run build --prefix api
  ```

* **Build chỉ Frontend Web:**
  ```bash
  make build-web
  # Hoặc: npm run build --prefix web
  ```

### Lint Commands

* **Lint Backend API:**
  ```bash
  make lint-api
  # Hoặc: npm run lint --prefix api
  ```

* **Lint Frontend Web:**
  ```bash
  make lint-web
  # Hoặc: npm run lint --prefix web
  ```

### Test Commands

* **Chạy tests:**
  ```bash
  make test
  # Hoặc: npm run test --prefix api
  ```

### Clean Commands

* **Xóa build artifacts:**
  ```bash
  make clean
  ```

---

## 🔄 Lệnh Reset & Quick Start (Reset & Quick Start)

### Database Reset

* **Xóa và tạo lại database (bao gồm cả volumes):**
  ```bash
  make db-reset
  ```

### Quick Start (Chạy tất cả trong một lệnh)

Nếu muốn cài đặt + khởi db + migrate + chạy dev:
  ```bash
  make install       # Cài đặt tất cả dependencies
  make db-up        # Khởi Docker services
  make migrate     # Tạo bảng trong database
  make prisma-generate
  make dev-api     # Terminal 1: API
  make dev-web     # Terminal 2: Web
  make worker     # Terminal 3: Worker
  ```

---

## 🧪 Kiểm tra hoạt động (Verification)

1. **Kiểm tra Backend API**:
   * Chạy lệnh kiểm tra nhanh: `make health-check`
   * Hoặc truy cập đường dẫn: `http://localhost:3000/api/health` trên trình duyệt. Bạn sẽ nhận được phản hồi JSON:
     ```json
     {
       "status": "ok",
       "services": {
         "database": "connected",
         "qdrant": "connected",
         "redis": "connected"
       }
     }
     ```

2. **Truy cập ứng dụng Web**:
   * Truy cập: `http://localhost:3001/chat`
   * Nếu chưa có tài khoản, hãy nhấn nút **Dev Auto Login** ở góc dưới thanh Sidebar trái để đăng nhập tự động bằng tài khoản thử nghiệm của nhà phát triển (Dev Mode).
   * Tạo phiên chat mới bằng nút **"+"**, chọn môn học và bắt đầu trải nghiệm hỏi đáp chatbot tích hợp RAG.

---

## ⚠️ Các lỗi thường gặp và cách xử lý (Troubleshooting)

### 1. Lỗi kết nối Database (`Can't reach database server...`)
* **Nguyên nhân**: Container PostgreSQL chưa khởi chạy hoặc cổng kết nối `5432` bị xung đột với một phiên bản PostgreSQL cài đặt sẵn trên máy của bạn.
* **Cách khắc phục**:
  * Chạy `docker compose ps` để kiểm tra container `chatbot-rag-postgres` có ở trạng thái `Up` không.
  * Nếu bị xung đột cổng, hãy dừng PostgreSQL trên máy cục bộ hoặc đổi biến `POSTGRES_PORT` trong file `.env` sang cổng khác (ví dụ: `5433`).

### 2. Lỗi `Gemini API key is invalid or empty`
* **Nguyên nhân**: Không điền hoặc điền sai `GEMINI_API_KEY` ở file `.env` gốc.
* **Cách khắc phục**: Truy cập [Google AI Studio](https://aistudio.google.com/) để nhận API key miễn phí và cập nhật vào file `.env`, sau đó khởi động lại Backend API.

### 3. Không tải được các tài liệu trích dẫn (Citations)
* **Nguyên nhân**: Kết nối đến Qdrant (Vector Database) bị lỗi hoặc chưa có file nào được nạp và phân mảnh (chunking) thành công vào Vector DB.
* **Cách khắc phục**: Truy cập giao diện quản trị Admin trên Frontend (nếu đã tích hợp) hoặc kiểm tra log của Backend bằng `docker compose logs qdrant`.
