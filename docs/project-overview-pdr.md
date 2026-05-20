# TÀI LIỆU YÊU CẦU PHÁT TRIỂN SẢN PHẨM (PDR)
## Product Development Requirements

Tài liệu này định nghĩa các yêu cầu chức năng và phi chức năng cho hệ thống **FPTU Chatbot RAG**, bao gồm Actor models, Use Cases, và acceptance criteria.

---

## 1. Tổng Quan Sản Phẩm

* **Tên sản phẩm:** FPTU Chatbot RAG - Hệ thống truy xuất kiến thức đa phương thức hỗ trợ học tập
* **Loại sản phẩm:** Web Application (Multi-tenant SaaS)
* **Mục tiêu chính:** Cho phép sinh viên hỏi đáp dựa trên tài liệu môn học (PDF, Slide, Video) bằng phương pháp RAG (Retrieval-Augmented Generation)

---

## 2. Mô Hình Actor (Actors)

| Actor | Mô tả | Quyền hạn |
|-------|-------|-----------|
| **Student** | Sinh viên đã đăng ký trong tổ chức | Xem tài liệu, Chat hỏi đáp, Đánh giá câu trả lời |
| **Lecturer** | Giảng viên được quản trị viên approve | Tải lên tài liệu, Quản lý khóa học, Xem thống kê |
| **Admin** | Quản trị viên tổ chức | Quản lý thành viên, Quản lý khóa học, Xem chi phí API |
| **Super Admin** | Quản trị viên hệ thống | Quản lý Organization/Tenant, Cấu hình hệ thống |

---

## 3. Yêu Cầu Chức Năng (Functional Requirements)

### 3.1 Authentication & Authorization
- [x] Đăng ký / Đăng nhập email/password
- [x] Đăng nhập Google OAuth (FPT SSO)
- [x] Xác thực Multi-tenant qua Organization Plugin
- [ ] Xác thực 2FA (TOTP)

### 3.2 Document Management
- [x] Tải lên tài liệu (PDF, DOCX, PPTX)
- [ ] Tải lên video (MP4)
- [x] Xem danh sách tài liệu theo khóa học
- [x] Xóa tài liệu (đồng bộ Qdrant)

### 3.3 Course Management
- [x] Tạo / Cập nhật khóa học
- [x] Gán tài liệu vào khóa học

### 3.4 RAG Chat
- [x] Tạo phiên chat mới
- [x] Gửi tin nhắn / Nhận streaming response
- [x] Hiển thị citations (trang slide, timestamp)
- [x] Lưu lịch sử chat

### 3.5 Dashboard (Planned)
- [ ] Thống kê câu hỏi phổ biến
- [ ] Theo dõi chi phí API Token

---

## 4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

| Requirement | Tiêu chí | Độ ưu tiên |
|-------------|---------|-----------|
| **Performance** | API response time < 500ms (không tính LLM) | HIGH |
| **Scalability** | Hỗ trợ 1000+ concurrent users | HIGH |
| **Security** | Multi-tenant data isolation bắt buộc | CRITICAL |
| **Availability** | Uptime 99.5% | MEDIUM |
| **Latency** | Streaming response < 2s đến token đầu tiên | MEDIUM |

---

## 5. API Endpoints Specification

### 5.1 Auth Endpoints
```
POST   /api/v1/auth/register     # Đăng ký tài khoản mới
POST   /api/v1/auth/sign-in     # Đăng nhập email/password
POST   /api/v1/auth/sign-out    # Đăng xuất
GET    /api/v1/auth/session   # Lấy session hiện tại
```

### 5.2 Course Endpoints
```
GET    /api/v1/courses              # Danh sách khóa học của tenant
POST   /api/v1/courses              # Tạo khóa học mới
GET    /api/v1/courses/:id          # Chi tiết khóa học
PUT    /api/v1/courses/:id          # Cập nhật khóa học
DELETE /api/v1/courses/:id          # Xóa khóa học
```

### 5.3 Document Endpoints
```
GET    /api/v1/courses/:courseId/documents    # Danh sách tài liệu
POST   /api/v1/courses/:courseId/documents    # Tải lên tài liệu
DELETE /api/v1/courses/:courseId/documents/:id # Xóa tài liệu
```

### 5.4 Chat Endpoints
```
POST   /api/v1/chat/sessions   # Tạo phiên chat mới
GET    /api/v1/chat/sessions  # Danh sách phiên chat
POST   /api/v1/chat/send     # Gửi tin nhắn (SSE streaming)
GET    /api/v1/chat/history/:sessionId  # Lịch sử chat
```

---

## 6. Database Schema (Prisma)

```prisma
// Organization (Tenant)
model Organization {
  id          String   @id @default(uuid())
  name        String
  domain      String   @unique
  createdAt   DateTime @default(now())
  users      User[]
  courses    Course[]
}

// User
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  name           String
  role           Role     @default(STUDENT)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
}

enum Role {
  STUDENT
  LECTURER
  ADMIN
}

// Course
model Course {
  id             String   @id @default(uuid())
  code           String   // e.g., "SWD392"
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  documents     Document[]
  chatSessions  ChatSession[]
  createdAt     DateTime @default(now())
}

// Document
model Document {
  id        String   @id @default(uuid())
  name      String
  fileUrl   String
  fileType  String
  status    String   // PENDING, PROCESSING, COMPLETED, FAILED
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id])
  createdAt DateTime @default(now())
}

// ChatSession
model ChatSession {
  id        String        @id @default(uuid())
  userId    String
  courseId  String
  messages  ChatMessage[]
  createdAt DateTime     @default(now())
}

// ChatMessage
model ChatMessage {
  id        String      @id @default(uuid())
  sessionId String
  sender    SenderType
  content   String     @db.Text
  citations Json?
  createdAt DateTime    @default(now())
}

enum SenderType {
  USER
  ASSISTANT
}
```

---

## 7. Acceptance Criteria

### 7.1 Authentication
- [ ] User có thể đăng ký với email/password
- [ ] User có thể đăng nhập Google OAuth
- [ ] Session được lưu trữ an toàn trong database
- [ ] Multi-tenant isolation được enforce

### 7.2 Document Upload
- [ ] Lecturer có thể tải lên PDF/DOCX/PPTX
- [ ] File được lưu vào storage (Local/MinIO)
- [ ] Document record được lưu vào PostgreSQL với status
- [ ] Vector embeddings được lưu vào Qdrant

### 7.3 RAG Chat
- [ ] Student có thể gửi câu hỏi bằng tiếng Việt
- [ ] System trả lời streaming (SSE)
- [ ] Citations hiển thị chính xác (page number, timestamp)
- [ ] Lịch sử chat được lưu

### 7.4 Performance
- [ ] API Health check < 100ms
- [ ] Vector search < 200ms
- [ ] Time to first token < 2s

---

## 8. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| API Token Cost | HIGH | Implement caching, cost tracking dashboard |
| Multi-tenant Data Leak | CRITICAL | Double-check tenantId in every query |
| Slow Vector Search | MEDIUM | Optimize Qdrant index, use payload filtering |
| LLM Hallucination | MEDIUM | Strict prompt template, guardrails |

---

> **Last Updated:** 2026-05-20
> **Version:** 1.0