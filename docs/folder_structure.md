# BẢN THIẾT KẾ CẤU TRÚC THƯ MỤC CHUẨN ENTERPRISE (SCALABLE FOLDER STRUCTURE)

Tài liệu này đặc tả cấu trúc thư mục quy mô lớn (Enterprise-level) và có khả năng mở rộng tốt (Scalable) cho cả dự án **Hono.js Backend** (`api/`) và **Next.js Frontend** (`web/`). 

Cấu trúc này được xây dựng dựa trên nguyên lý **Clean Architecture** (Kiến trúc sạch) và **Domain-Driven Design (DDD)** lai, giúp phân tách rõ ràng trách nhiệm giữa các tầng nghiệp vụ, hạn chế tối đa rắc rối phát sinh khi quy mô code phình to, và giúp nhiều lập trình viên có thể làm việc song song mà không sợ xung đột code.

---

## 🗺️ Sơ Đồ Cấu Trúc Tổng Thể Monorepo

```text
chatbot-rag-fptu/
├── .agents/                    # Cấu hình Agent (Quy tắc & Kỹ năng)
├── docs/                       # Tài liệu thiết kế hệ thống và nghiên cứu
│   ├── README.md
│   ├── system_requirements.md
│   ├── system_architecture.md
│   ├── research_methodology.md
│   ├── experimental_design.md
│   └── folder_structure.md      <-- Tài liệu này
│
├── api/                        # BACKEND API (Hono.js + TypeScript)
│   ├── src/
│   │   ├── index.ts            # Entry point chính
│   │   ├── config/             # Cấu hình hệ thống (DB, LLM, ENV)
│   │   ├── constants/          # Hằng số hệ thống
│   │   ├── middlewares/        # Hono Middlewares (Auth, Tenant, Errors)
│   │   ├── modules/            # Thư mục chứa các phân hệ Nghiệp vụ (DDD)
│   │   │   ├── auth/           # Module Xác thực
│   │   │   ├── courses/        # Module Khóa học & Syllabus
│   │   │   ├── documents/      # Module Xử lý tài liệu (Ingestion)
│   │   │   ├── chat/           # Module Hỏi đáp RAG (SSE Stream)
│   │   │   └── analytics/      # Module Thống kê giám sát
│   │   ├── services/           # Dịch vụ dùng chung (VectorDB, LLM Client)
│   │   ├── types/              # Định nghĩa Types chung của Backend
│   │   └── utils/              # Helper functions dùng chung
│   ├── prisma/                 # Schema & Migrations cơ sở dữ liệu quan hệ
│   └── package.json
│
└── web/                        # FRONTEND WEB APP (Next.js 15+ App Router)
    ├── app/                    # Next.js App Router Pages & Layouts
    │   ├── (auth)/             # Route Group: Đăng nhập / Đăng ký
    │   ├── (dashboard)/        # Route Group: Trang quản trị & Chat của Sinh viên
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/             # Reusable React Components
    │   ├── ui/                 # Các component nguyên tử (button, input, card)
    │   ├── common/             # Các component vỏ (sidebar, navbar, footer)
    │   └── features/           # Các component phức tạp ghép theo tính năng
    ├── context/                # Quản lý Global React Context (Auth, Theme)
    ├── hooks/                  # Custom React Hooks (useChatStream, useAuth)
    ├── lib/                    # Cấu hình các thư viện bên thứ ba (Axios, Tailwind merge)
    ├── services/               # API Services gọi lên Hono Backend
    ├── types/                  # Định nghĩa TypeScript Types dùng chung ở Frontend
    ├── constants/              # Hằng số, Route path, Cấu hình giao diện
    ├── public/                 # File ảnh, icons tĩnh
    └── package.json
```

---

## 🛠️ Chi Tiết Cấu Trúc Backend Hono.js (`api/`)

Hono.js mặc định là một micro-framework cực kỳ tối giản. Để biến Hono thành một hệ thống Enterprise có tính bảo trì cao, chúng tôi tổ chức source code trong thư mục `api/src/` theo cấu trúc chặt chẽ sau:

### 1. Thư mục `api/src/modules/` (Tầng nghiệp vụ trọng tâm)
Chúng tôi chia backend thành các **Module nghiệp vụ riêng biệt (Domain Modules)**. Mỗi module tự chứa đầy đủ các tầng xử lý của nó:
*   `*.controller.ts`: Nơi tiếp nhận Request, gọi middleware xác thực cục bộ, validate định dạng dữ liệu (bằng Zod) và trả về HTTP Response.
*   `*.service.ts`: Chứa logic nghiệp vụ cốt lõi, tương tác với Database thông qua Prisma, gọi Vector DB hoặc gọi các dịch vụ AI.
*   `*.schema.ts`: Khai báo các Zod Schemas để tự động validate body/query của request.

### 2. Thư mục `api/src/services/` (Các dịch vụ nền tảng dùng chung)
Chứa các Class/Object chuyên dụng phục vụ hạ tầng, được gọi từ bất kỳ module nào:
*   `vector-db.service.ts`: Wrapper tương tác với Qdrant / ChromaDB (tạo Collection, Upsert vector, Query Vector similarity).
*   `embedding.service.ts`: Tích hợp mô hình nhúng `bge-vi-base` (chạy local/API) và `Gemini Embedding 2` (multimodal embedding).
*   `llm.service.ts`: Khởi tạo và quản lý kết nối LLM (Gemini 2.0, GPT-4o) phục vụ sinh câu trả lời RAG.
*   `storage.service.ts`: Xử lý lưu trữ file vật lý (Local disk hoặc S3/MinIO).

### 3. Thư mục `api/src/middlewares/` (Bộ lọc yêu cầu)
*   `auth.middleware.ts`: Giải mã JWT và xác thực người dùng.
*   `tenant.middleware.ts`: Kiểm tra và đảm bảo người dùng chỉ được phép truy vấn tài nguyên thuộc trường học (`tenantId`) của họ.
*   `error.middleware.ts`: Middleware xử lý ngoại lệ tập trung, đảm bảo API luôn trả về JSON chuẩn khi xảy ra crash hệ thống.

---

## 🎨 Chi Tiết Cấu Trúc Frontend Next.js (`web/`)

Next.js 15 App Router hỗ trợ cấu trúc phân cấp mạnh mẽ. Để đảm bảo giao diện luôn mượt mà, dễ bảo trì, chúng tôi tổ chức theo cấu hình sau:

### 1. Phân nhóm Route (Route Groups)
Sử dụng dấu ngoặc đơn `( folder_name )` để gom cụm các trang có chung bố cục (Layout) mà không làm ảnh hưởng đến cấu trúc đường dẫn URL:
*   **`(auth)`**: Bao gồm các trang Login, Register, Forgot Password. Sử dụng layout tối giản không có sidebar.
*   **`(dashboard)`**: Không gian làm việc chính sau khi đăng nhập. Bao gồm các trang:
    *   `/courses`: Danh sách môn học và syllabus.
    *   `/chat`: Giao diện hội thoại RAG streaming.
    *   `/admin`: Bảng quản lý tài liệu dành cho Giảng viên.
    *   *Sử dụng chung một Layout hệ thống có Sidebar điều hướng và Topbar.*

### 2. Tổ chức Component thông minh (`web/components/`)
Hạn chế tối đa việc viết code giao diện quá dài trong một file page. Giao diện được tách nhỏ thành 3 lớp:
*   **`ui/`**: Các component dùng chung nguyên bản (Atomic), thường được cài đặt qua `shadcn/ui` (ví dụ: `button.tsx`, `input.tsx`, `dialog.tsx`, `dropdown-menu.tsx`).
*   **`common/`**: Thành phần vỏ của trang web (ví dụ: `sidebar.tsx`, `navbar.tsx`, `footer.tsx`).
*   **`features/`**: Các khối chức năng phức tạp, liên kết chặt chẽ với trạng thái (state) nghiệp vụ:
    *   `chat/chat-bubble.tsx`: Bong bóng tin nhắn hiển thị văn bản Markdown và citation.
    *   `chat/stream-panel.tsx`: Khối hiển thị câu trả lời đang stream từ server.
    *   `documents/upload-zone.tsx`: Khối kéo thả upload tài liệu kèm thanh tiến trình chỉ mục hóa.

### 3. Tách biệt logic thông qua Custom Hooks (`web/hooks/`)
Tách biệt toàn bộ logic xử lý sự kiện, gọi API và quản lý state ra khỏi giao diện trực quan:
*   `useChatStream.ts`: Xử lý kết nối SSE Stream, tự động cập nhật mảng tin nhắn khi nhận token mới từ Hono.
*   `useAuth.ts`: Quản lý trạng thái đăng nhập, lưu trữ token, đăng xuất và phân quyền người dùng.

---

## 🔒 Lợi Ích Của Bản Thiết Kế Cấu Trúc
1.  **Dễ bảo trì:** Khi cần sửa đổi logic hỏi đáp, nhà phát triển chỉ cần làm việc trong `api/src/modules/chat/` và `web/components/features/chat/`, không lo ảnh hưởng đến phân hệ Quản lý tài liệu.
2.  **Khả năng mở rộng:** Dễ dàng bổ sung các Module mới (ví dụ: Module chấm điểm tự động `grading/`) bằng cách tạo thêm một thư mục tương tự trong `modules/`.
3.  **Tương thích Đa trường (Multi-tenant):** Việc tách biệt Metadata Database và Vector DB kết hợp Middleware bảo vệ tenant ở backend giúp việc nâng cấp quy mô lên hàng trăm trường đại học diễn ra dễ dàng và an toàn tuyệt đối.
