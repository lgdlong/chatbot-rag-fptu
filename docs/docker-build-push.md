# Hướng Dẫn Build & Push Docker Image (Chatbot RAG FPTU)

Tài liệu này hướng dẫn chi tiết quy trình đóng gói ứng dụng (Dockerize) ở máy trạm cục bộ (Local Dev) và triển khai kéo thả (Pull & Run) trên máy chủ VPS Production.

---

## ⚡ Lệnh Nhanh (Quick Commands)

### 1. Ở máy Phát Triển Cục Bộ (Windows/macOS/Linux)
Đảm bảo bạn đã chạy `docker login` trên terminal trước khi đẩy.

```bash
# Sử dụng Batch Script tiện lợi trên Windows (CMD/PowerShell)
.\build-and-push.bat

# Hoặc sử dụng Shell Script trên Bash / Linux / Git Bash
./build-and-push.sh

# Hoặc sử dụng Makefile
make docker-all
```

*Lưu ý: Các tập lệnh trên sẽ build cả 2 Image dưới nhãn hiệu (tag) `latest` và đẩy lên Docker Hub cá nhân:*
*   API Image: `lgdlong/chatbot-swd-api:latest`
*   Worker Image: `lgdlong/chatbot-swd-worker:latest`

---

## 🚀 Chu Trình Triển Khai Đầy Đủ (Dev → VPS)

Quy trình Deploy cực kỳ tối ưu, giúp VPS không tốn CPU/RAM để biên dịch code:

### **Bước 1: Trên Máy Phát Triển (Local Machine) — Build & Push**
Chạy một trong các cách sau để đóng gói và đẩy lên đám mây Docker Hub:

```bash
# Cách 1: Sử dụng Make
make docker-all

# Cách 2: Chạy thủ công từng lệnh
docker build -t lgdlong/chatbot-swd-api:latest ./api
docker build -t lgdlong/chatbot-swd-worker:latest ./services/ingestion-worker

docker push lgdlong/chatbot-swd-api:latest
docker push lgdlong/chatbot-swd-worker:latest
```

---

### **Bước 2: Trên VPS Production — Pull & Deploy**
Tải 3 tệp tin lên VPS cùng một thư mục: `docker-compose.prod.yml`, `.env`, và `Makefile.prod`. Sau đó sử dụng các tiện ích sau để cập nhật dịch vụ:

#### 🔹 Trường hợp 1: Cập nhật toàn bộ stack dịch vụ (Hono API, Go Worker, Redis, DB)
```bash
# Tự động pull các image mới nhất và khởi động lại stack
make -f Makefile.prod restart
```

#### 🔹 Trường hợp 2: Chỉ cập nhật riêng Hono API (Không ảnh hưởng DB/Redis/Worker)
```bash
make -f Makefile.prod deploy-api
```

#### 🔹 Trường hợp 3: Chỉ cập nhật riêng Golang Ingestion Worker
```bash
make -f Makefile.prod deploy-worker
```

---

## 🛠️ Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### **1. Lỗi: Cơ sở dữ liệu trống rỗng (Relation "document_chunks" does not exist)**
*   **Nguyên nhân:** Do bạn chạy `migrate deploy` nhưng dự án đang đồng bộ trực tiếp bằng `db push`.
*   **Khắc phục:** API Dockerfile đã cấu hình tự động chạy `npx prisma db push` trên container startup để tự kiến tạo bảng. Nếu muốn chạy thủ công trên VPS để ép buộc đồng bộ schema:
    ```bash
    make -f Makefile.prod db-sync
    ```

### **2. Truy cập trực tiếp vào DB trên VPS để debug dữ liệu**
*   Bạn có thể mở một trình shell tương tác SQL trực tiếp bằng lệnh:
    ```bash
    make -f Makefile.prod db-shell
    ```

### **3. Đĩa cứng VPS đầy do cache và image cũ**
*   Mỗi lần deploy bản mới, các image cũ sẽ trở thành dạng ẩn (dangling images). Hãy chạy lệnh dọn dẹp hệ thống định kỳ:
    ```bash
    make -f Makefile.prod clean
    ```
