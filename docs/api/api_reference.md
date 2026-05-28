# Đặc Tả Chi Tiết API (API Reference Details)

Tài liệu đặc tả chi tiết các endpoint API của dự án đã được tách thành **các phân hệ riêng biệt (Modular Reference Docs)** để dễ dàng quản lý và cập nhật:

---

## 📂 Danh Sách Các Phân Hệ Tài Liệu (Modular Reference Docs)

0. **🔐 [Module 0: Xác Thực & Quản Lý Tổ Chức (Better Auth)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_auth.md)**
   *Đặc tả các endpoint đăng ký, đăng nhập email/mật khẩu hoặc Google OAuth, lấy session và phân quyền tổ chức Multi-tenant.*

1. **🏥 [Module 1: Hệ Thống & Giám Sát (System & Health Check)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_system.md)**
   *Đặc tả endpoint kiểm tra trạng thái sức khỏe của server API và cơ sở dữ liệu PostgreSQL.*

2. **📂 [Module 2: Quản Lý Tài Luận & RAG Ingestion](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_documents.md)**
   *Đặc tả các endpoint upload slide, xóa slide tài liệu học tập môn học và webhook cập nhật tiến trình RAG.*

3. **💬 [Module 3: Phân Hệ Trò Chuyện (Chatbot AI RAG)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_chat.md)**
   *Đặc tả các endpoint quản lý session chat, lấy tài liệu slide môn học và truyền luồng câu trả lời SSE (Server-Sent Events) thời gian thực.*

4. **🛡️ [Module 4: Quản Lý Giảng Viên & Admin](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_auth_admin.md)**
   *Đặc tả các endpoint gửi đơn xin cấp tài khoản của giảng viên, phê duyệt tạo tài khoản & mật khẩu tạm thời của Admin.*

5. **💳 [Module 5: Gói Dịch Vụ & Thanh Toán (PayOS)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/00_subscriptions.md)**
   *Đặc tả các endpoint lấy thông tin gói dịch vụ, tạo link thanh toán nâng cấp tài khoản qua PayOS và webhook nhận kết quả thanh toán tự động.*

---

*Để tìm hiểu hướng dẫn cơ bản về Base URL, Authentication (Xác thực) và định dạng lỗi chuẩn, vui lòng xem tại:* **[Hướng Dẫn Tổng Quan API (README.md)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/api/README.md)**.
