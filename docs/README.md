# HỆ THỐNG CHATBOT RAG HỖ TRỢ HỌC TẬP FPTU
## HỆ THỐNG TRUY XUẤT KIẾN THỨC ĐA PHƯƠNG THỨC HỖ TRỢ HỌC TẬP

Chào mừng bạn đến với thư mục tài liệu kỹ thuật của dự án **Chatbot RAG FPTU**. Dự án này được phát triển nhằm giải quyết nhu cầu tra cứu và hỏi đáp tài liệu môn học của sinh viên FPT University bằng phương pháp tối ưu hóa LLM phổ biến hiện nay: **Retrieval-Augmented Generation (RAG)** trong ngữ cảnh xử lý tiếng Việt.

---

## 📌 Tổng Quan Dự Án

### 1. Ý tưởng & Bối cảnh (Context)
* **Tên dự án:** *"Xây dựng chatbot cho phép sinh viên hỏi đáp dựa trên tài liệu môn học (FPTU Chatbot RAG)."*
* **Mục tiêu cốt lõi:** 
  * **Hệ thống thực tế:** Xây dựng một ứng dụng web RAG đa phương thức (hỗ trợ Text, PDF, Slide, Video, Image) cho phép giảng viên/nhà trường tải lên tài liệu học tập (Syllabus, Slide bài giảng, Video bài giảng) và cho phép sinh viên trò chuyện, hỏi đáp dựa trên chính nguồn tài liệu đó.
* **Đối tượng phục vụ:** Sinh viên, giảng viên và các trường đại học (hỗ trợ mô hình đa trường học - multi-tenant).

---

## 🗺️ Bản Đồ Tài Liệu (Documentation Map)

Để thuận tiện cho việc phát triển và tích hợp, tài liệu được phân chia thành các chuyên đề chi tiết sau:

```mermaid
graph TD
    A[docs/README.md <br> Tổng quan & Bản đồ tài liệu] --> B(docs/system_requirements.md <br> Yêu cầu hệ thống - SRS)
    A --> C(docs/system_architecture.md <br> Thiết kế Kiến trúc & Kỹ thuật)
    A --> D(docs/folder_structure.md <br> Cấu trúc thư mục hệ thống)
    A --> E(docs/better_auth_guide.md <br> Cẩm nang Better Auth)
    A --> F(docs/hono_guide.md <br> Cẩm nang Hono.js)
    
    style A fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style B fill:#0EA5E9,stroke:#0369A1,stroke-width:1px,color:#fff
    style C fill:#0EA5E9,stroke:#0369A1,stroke-width:1px,color:#fff
    style D fill:#0EA5E9,stroke:#0369A1,stroke-width:1px,color:#fff
    style E fill:#10B981,stroke:#047857,stroke-width:1px,color:#fff
    style F fill:#10B981,stroke:#047857,stroke-width:1px,color:#fff
```

### Chuyên đề phát triển hệ thống
1. **[Tài liệu Yêu cầu Hệ thống (SRS)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/system_requirements.md)**
   * Định nghĩa các tác nhân (Actors) và mô hình phân quyền (Student, Lecturer, Admin).
   * Chi tiết các tính năng chính: Quản lý tài liệu đa phương thức (PDF, DOCX, Slide, Video, Image), Chat & Hỏi đáp thông minh, Dẫn nguồn trích dẫn, Giới hạn phạm vi tri thức.
   * Yêu cầu phi chức năng: Tính mở rộng (Scalability), Bảo mật, Hiệu năng truy vấn.
2. **[Thiết kế Kiến trúc & Kỹ thuật (Technical Architecture)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/system_architecture.md)**
   * Sơ đồ luồng dữ liệu (Data Flow) tổng thể từ khi tải tài liệu đến khi trả lời.
   * Chi tiết Tech-stack: **Next.js** (Frontend), **Hono.js + TypeScript** (Backend), **Vector Database** (Qdrant/Chroma/SQLite), và các LLM API (Gemini, Claude, GPT-4o).
   * Đặc tả API Hono và Cấu trúc cơ sở dữ liệu.
   * Pipeline xử lý Multimodal (xử lý Video & Audio bằng Gemini Embedding 2).
3. **[Cấu trúc thư mục hệ thống (Folder Structure)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/folder_structure.md)**
   * Chi tiết cấu trúc thư mục quy mô Enterprise cho cả Backend API (`api/`) và Frontend Web (`web/`).
4. **[Cẩm nang Phát triển Better Auth (Better Auth Developer Guide)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/better_auth_guide.md)**
   * Tổng quan kiến trúc xác thực, cấu hình môi trường bảo mật.
   * Đặc tả chi tiết cơ sở dữ liệu Prisma (User, Session, Account, Verification).
   * Hướng dẫn chuyên sâu các Plugin: Multi-Tenant Organizations, Admin, 2FA/TOTP và OpenAPI.
   * Kiến trúc giải pháp giải耦 (decoupled) với `AuthPublicService` để cô lập module nghiệp vụ.
5. **[Cẩm nang Phát triển Hono.js (Hono.js Developer Guide)](file:///e:/FPT/Semester_7/SWD392/chatbot-rag-fptu/docs/hono_guide.md)**
   * Nguyên lý hoạt động dựa trên Web Standard API và Context (`c`).
   * Xây dựng Middleware: Xác thực `requireAuth` và cô lập dữ liệu đa trường `requireTenant`.
   * Luồng phản hồi RAG Chat thời gian thực với Server-Sent Events (SSE) streaming.
   * Hướng dẫn viết Health Check API chi tiết và kiểm thử tích hợp không bộ nhớ (In-memory Integration Testing).

---

## 📦 Sản Phẩm Bàn Giao (Deliverables)

Dự án cam kết bàn giao đầy đủ các cấu phần sau:

| STT | Sản phẩm bàn giao | Mô tả chi tiết | Trạng thái |
|:---:|---|---|:---:|
| **1** | **Web App Chatbot** | Hệ thống web hoàn chỉnh với giao diện đẹp mắt, Responsive, hỗ trợ chế độ Sáng/Tối. Tích hợp RAG đa phương thức và trang quản trị quản lý tài liệu học tập theo khóa học/chương học. | *Đang phát triển* |
| **2** | **Source Code GitHub** | Mã nguồn sạch, cấu trúc rõ ràng: thư mục `web/` (Next.js) và `api/` (Hono.js). Đi kèm file `README.md` hướng dẫn deploy chi tiết. | *Đã khởi tạo* |
| **3** | **Tài liệu Kỹ thuật** | Tập tài liệu đặc tả SRS, Thiết kế Kiến trúc và Hướng dẫn vận hành hệ thống RAG Chatbot hoàn chỉnh. | *Đang biên soạn* |

---

> [!NOTE]
> Hệ thống được thiết kế hướng tới khả năng **Scale đa trường** (Multi-tenant) và hỗ trợ **Multimodal Embedding Native** thông qua Gemini Embedding 2, cho phép nhúng trực tiếp Video/Audio vào cùng không gian vector với văn bản mà không cần chia nhỏ thủ công thành ảnh.

