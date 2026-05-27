# Hướng Dẫn Tích Hợp API (API Reference Guide)

Hệ thống API Backend của **FPTU Chatbot RAG** được xây dựng trên nền tảng **Hono.js** kết hợp **TypeScript**, tối ưu hóa cho các tác vụ RAG (Retrieval-Augmented Generation), xử lý slides/tài liệu bài giảng PDF, truyền luồng SSE streaming câu trả lời từ Gemini LLM, và thanh toán nâng cấp tài khoản qua PayOS.

Để dễ dàng quản lý và tích hợp, tài liệu đặc tả chi tiết đã được tách thành **các phân hệ riêng biệt (Modular Reference Docs)** dưới đây.

---

## 📂 Các Phân Hệ Tài Liệu Chi Tiết (Modular Reference Docs)

### 🔐 [Module 0: Xác Thực & Quản Lý Tài Khoản (Better Auth)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_auth.md)
*Đăng ký, Đăng nhập (Email hoặc Google OAuth), Quản lý Session và cấu hình tài khoản.*
- `POST /api/auth/sign-up/email` — Đăng ký tài khoản Email/Mật khẩu.
- `POST /api/auth/sign-in/email` — Đăng nhập tài khoản.
- `POST /api/auth/sign-out` — Đăng xuất.
- `GET /api/auth/get-session` — Lấy thông tin phiên làm việc.

### 🏥 [Module 1: Hệ Thống & Giám Sát (System & Health Check)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_system.md)
*Giám sát sức khỏe API, đo lường độ trễ và theo dõi tài nguyên phần cứng.*
- `GET /api/health` — Chi tiết trạng thái hệ thống.

### 📂 [Module 2: Quản Lý Tài Liệu & RAG Ingestion](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_documents.md)
*Tải slide bài giảng PDF lên, kích hoạt Go Worker xử lý ingestion và dọn dẹp vector db.*
- `POST /api/courses/{courseId}/documents` — Giảng viên tải lên slide/tài liệu (PDF).
- `DELETE /api/courses/{courseId}/documents/{documentId}` — Giảng viên/Admin xóa tài liệu & chỉ mục vector.
- `PATCH /api/internal/documents/{id}` — Webhook nội bộ cho Go worker cập nhật kết quả xử lý.

### 💬 [Module 3: Phân Hệ Trò Chuyện (Chatbot AI RAG)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_chat.md)
*Quản lý phòng chat, lấy lịch sử tin nhắn và gửi câu hỏi nhận SSE streaming.*
- `POST /api/chat/dev-login` — Đăng nhập nhanh cho môi trường thử nghiệm E2E.
- `GET /api/chat/courses` — Lấy danh sách các môn học có tài liệu.
- `GET /api/chat/courses/{courseId}/documents` — Lấy danh sách slide tài liệu môn học.
- `GET /api/chat/sessions` — Lấy danh sách phiên hội thoại của sinh viên.
- `POST /api/chat/sessions` — Tạo phiên hội thoại chat mới.
- `GET /api/chat/sessions/{sessionId}` — Chi tiết tin nhắn & nguồn trích dẫn.
- `PATCH /api/chat/sessions/{sessionId}` — Đổi tên tiêu đề phiên chat.
- `DELETE /api/chat/sessions/{sessionId}` — Xóa phiên chat.
- `POST /api/chat/send` — Gửi câu hỏi và truyền luồng câu trả lời (SSE Stream).

### 🛡️ [Module 4: Quản Lý Giảng Viên & Admin](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_auth_admin.md)
*Yêu cầu cấp tài khoản cho giảng viên, phê duyệt đơn và cấp mật khẩu tạm thời.*
- `POST /api/auth-admin/lecturer-request` — Giảng viên gửi đơn đăng ký tài khoản.
- `GET /api/auth-admin/admin/lecturer-requests` — Admin xem danh sách đơn đăng ký.
- `POST /api/auth-admin/admin/lecturer-requests/{requestId}/approve` — Admin duyệt cấp tài khoản & mật khẩu.
- `POST /api/auth-admin/admin/lecturer-requests/{requestId}/reject` — Admin từ chối yêu cầu cấp tài khoản.

### 💳 [Module 5: Gói Dịch Vụ & Thanh Toán (PayOS)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_subscriptions.md)
*Xem hạn ngạch hằng ngày, nâng cấp tài khoản qua cổng trực tuyến PayOS và xác thực chữ ký.*
- `GET /api/subscriptions/me` — Kiểm tra thông tin gói dịch vụ & lượng tin nhắn trong ngày.
- `POST /api/subscriptions/upgrade` — Tạo link nâng cấp gói dịch vụ (SILVER/GOLD) qua PayOS.
- `POST /api/subscriptions/webhook` — PayOS webhook tự động xác nhận kết quả thanh toán.

---

## 🚀 Thông Tin Cơ Bản (General Information)

- **Base URL (Local Development):** `http://localhost:8000`
- **Định dạng dữ liệu:** `application/json` (Trừ luồng SSE Chat sử dụng `text/event-stream` và upload tài liệu sử dụng `multipart/form-data`).

---

## 🔐 Cơ Chế Xác Thực (Authentication)

### 1. Better Auth (Cookie-based Session)
Dành cho các hoạt động của Sinh viên, Giảng viên, Admin.
- Trình duyệt tự động quản lý và đính kèm cookie `better-auth.session_token` trong các request.
- Bạn có thể truyền header `Authorization` chứa JWT session token trong các môi trường khác.

### 2. Internal Webhook Key (Bearer Token)
Dành riêng cho giao tiếp nội bộ giữa Go Worker và Backend API.
- Tiêu đề bắt buộc: `Authorization: Bearer <INTERNAL_API_KEY>`

---

## ❌ Định Dạng Lỗi Chuẩn (Standard Error Format)

Khi xảy ra lỗi (mã trạng thái `4xx` hoặc `5xx`), các API sẽ trả về cấu trúc JSON thống nhất:

```json
{
  "error": "Mô tả nguyên nhân chi tiết của lỗi"
}
```
Mã trạng thái HTTP phổ biến:
- `400 Bad Request`: Dữ liệu đầu vào thiếu hoặc sai định dạng.
- `401 Unauthorized`: Chưa đăng nhập hoặc session hết hạn.
- `403 Forbidden`: Không có quyền truy cập endpoint.
- `404 Not Found`: Tài nguyên yêu cầu không tồn tại.
- `409 Conflict`: Trạng thái tài nguyên xung đột (ví dụ: tài liệu đang ingestion không được xóa, trùng email).
- `500 Internal Server Error`: Lỗi xử lý hệ thống hoặc database phía server.

---

## 📝 Hướng Dẫn Dành Cho Lập Trình Viên & AI Agent (Developer Guidelines)

Để duy trì, mở rộng hoặc viết thêm tài liệu đặc tả API chất lượng cao trong tương lai, vui lòng tuân thủ các tài liệu hướng dẫn sau:
- **[Quy trình Phân tích cho AI Agent (agent-instructions.md)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/agent-instructions.md)**: Chỉ dẫn Agent quy trình tìm đọc mã nguồn và viết đặc tả.
- **[Quy tắc Viết Tài liệu & Biểu đồ (writing-guidelines.md)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/writing-guidelines.md)**: Quy chuẩn ngôn ngữ Tiếng Việt/Tiếng Anh, sơ đồ Mermaid và định dạng.
- **[Tiêu chuẩn Kiểm soát Chất lượng (quality-checklist.md)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/quality-checklist.md)**: Checklist kiểm tra độ hoàn chỉnh, độ chính xác trước khi commit.
- **[Biểu mẫu Đặc tả API (file-templates.md)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/file-templates.md)**: Các biểu mẫu Markdown mẫu cho endpoints và luồng SSE stream.

