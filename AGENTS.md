# HƯỚNG DẪN DÀNH CHO AI AGENT (AGENTS.md)

Tài liệu này cung cấp các hướng dẫn chi tiết, quy tắc phát triển, tài nguyên kỹ năng (custom skills) và lệnh CLI cần thiết để các AI Agent (Gemini, Claude, v.v.) hoạt động hiệu quả, chính xác và đồng bộ trong repository này.

---

## 1. Cấu Trúc Monorepo & Không Gian Làm Việc

Dự án được cấu trúc theo mô hình Monorepo chứa cả Backend, Frontend và tài liệu nghiên cứu:

*   **`api/`** (Backend): API Gateway và các dịch vụ xử lý viết bằng **Hono.js** + **TypeScript** chạy trên Node.js/Bun.
*   **`web/`** (Frontend): Giao diện người dùng Next.js 15+ (App Router) + **Tailwind CSS**.
*   **`docs/`** (Tài liệu): Chứa toàn bộ tài liệu đặc tả SRS, kiến trúc hệ thống, phương pháp nghiên cứu RAG và thiết kế thực nghiệm.

---

## 2. Thư Mục Cấu Hình Agent (`.agents/`)

Thư mục `.agents/` ở gốc dự án là nơi lưu trữ các bộ quy tắc (rules) và kỹ năng (skills) tùy chỉnh để hướng dẫn hành vi của Agent. Khi làm việc, Agent **bắt buộc** phải đọc và tuân thủ các tài liệu này:

### 2.1 Quy tắc hành vi (`.agents/rules/`)
*   `development-rules.md`: Hướng dẫn lập trình và phát triển hệ thống tổng thể.
*   `documentation-management.md`: Quy trình cập nhật và quản lý tài liệu dự án.
*   `frontend-development-rules.md`: Hướng dẫn phát triển giao diện Next.js, chuẩn thiết kế sang trọng.
*   `git-and-commit-rules.md`: Quy chuẩn đặt thông điệp commit bằng tiếng Việt, tách nhỏ commit và quy tắc phê duyệt lệnh push.
*   `orchestration-protocol.md` & `primary-workflow.md`: Giao thức phối hợp và luồng công việc chính của Agent.

### 2.2 Thư viện kỹ năng (`.agents/skills/`)
Thư mục này chứa các cẩm nang hướng dẫn Agent thực hiện các tác vụ kỹ thuật chuyên biệt:
*   `better-auth-best-practices` & `better-auth-security-best-practices`: Tích hợp Better Auth cho Next.js/Hono.js.
*   `create-auth-skill`: Các bước cài đặt và cấu hình authentication.
*   `email-and-password-best-practices`: Thực thi chính sách bảo mật mật khẩu và xác thực email.
*   `organization-best-practices`: Cấu hình phân quyền tổ chức Multi-tenant.
*   `two-factor-authentication-best-practices`: Cài đặt xác thực 2 lớp (2FA/TOTP).
*   `vercel-react-best-practices`: Các kỹ thuật tối ưu hóa hiệu năng React & Next.js từ Vercel.
*   `sequential-thinking`: Kỹ năng bắt buộc sử dụng để kích hoạt suy nghĩ tuần tự, phân tích sâu và lập luận từng bước (Step-by-step) trước khi thực thi công việc.

> [!IMPORTANT]
> **Yêu Cầu Bắt Buộc Về Suy Nghĩ Tuần Tự (Sequential Thinking):**
> Mọi AI Agent khi hoạt động trong repository này **BẮT BUỘC** phải sử dụng kỹ năng `sequential-thinking` (`mcp__reasoning__sequentialthinking`) trong **mọi prompt** để suy luận tuần tự, lập luận chi tiết từng bước, tự sửa lỗi và tối ưu hóa giải pháp trước khi thực hiện bất kỳ hành động viết code hay chỉnh sửa nào.

---

## 3. Bản Đồ Lệnh CLI (Commands Guide)

Khi làm việc trong môi trường Monorepo, Agent cần chỉ định chính xác thư mục làm việc (`Cwd`) tương ứng khi đề xuất lệnh chạy trong shell (tuyệt đối **không** dùng lệnh `cd` thủ công):

### 💻 Thao tác trên Backend API (`api/`)
*   **Thư mục chạy lệnh (`Cwd`):** `e:\FPT\Semester_7\SWD392\chatbot-rag-fptu\api`
*   **Khởi chạy server Dev:** `npm run dev` (chạy trên cổng `3000`)
*   **Biên dịch mã nguồn (Build):** `npm run build`
*   **Cài đặt thư viện mới:** `npm install <package-name>`

### 💻 Thao tác trên Frontend Next.js (`web/`)
*   **Thư mục chạy lệnh (`Cwd`):** `e:\FPT\Semester_7\SWD392\chatbot-rag-fptu\web`
*   **Khởi chạy ứng dụng Dev:** `npm run dev` (chạy trên cổng `3001` hoặc tự động tìm cổng trống)
*   **Kiểm tra lỗi Lint:** `npm run lint`
*   **Biên dịch sản phẩm (Build Next.js):** `npm run build`
*   **Cài đặt thư viện mới:** `npm install <package-name>`

---

## 4. Nguyên Tắc Lập Trình & Tích Hợp RAG Cốt Lõi

Để giữ vững tính nhất quán của đề tài nghiên cứu so sánh RAG và Fine-tuning, các Agent khi phát triển tính năng cần chú ý:

1.  **Độ Chính Xác của RAG:** Ưu tiên sử dụng mô hình nhúng tiếng Việt **`BAAI/bge-vi-base`** cho các tác vụ tìm kiếm ngữ nghĩa thô và văn bản bài giảng.
2.  **Hỗ Trợ Đa Phương Thức (Multimodal):** Tích hợp luồng nhúng video/âm thanh bài giảng thông qua **`Gemini Embedding 2`** (sử dụng vector 3072 chiều) và lưu trữ kèm timestamp.
3.  **Chiến Lược Chunking:** Triển khai **Document-based chunking** (chia theo trang Slide bài giảng) kết hợp **Semantic chunking** để giữ trọn vẹn ngữ cảnh.
4.  **Bảo Mật Dữ Liệu Đa Trường (Multi-tenant Isolation):** Mọi request chat hoặc quản lý tài liệu từ frontend bắt buộc phải đi qua Middleware xác thực trên Hono.js để kiểm tra `tenantId` và ngăn chặn rò rỉ dữ liệu chéo giữa các trường.
5.  **Trải Nghiệm Hội Thoại:** Sử dụng **Server-Sent Events (SSE) Streaming** để trả về câu chữ thời gian thực (typing effect). Bắt buộc phải trả kèm mảng `citations` chứa nguồn trích dẫn chi tiết (Slide số mấy, trang nào, hoặc giây thứ bao nhiêu trong video).

---

## 5. Tài Liệu Tham Khảo Dành Cho Agent (Developer & Agent Reference Documents)

Để hỗ trợ quá trình phát triển và tích hợp các thư viện hiệu quả, các tài nguyên và đường dẫn hướng dẫn sau được nạp từ `docs/document-url.txt`:

*   **Hono.js Core & Guides:**
    *   Tài liệu tích hợp LLM: https://hono.dev/llms.txt
    *   Xác thực Better Auth: https://hono.dev/examples/better-auth
    *   Truyền luồng dữ liệu (Streaming): https://hono.dev/docs/helpers/streaming
    *   Kiểm tra tính hợp lệ (Validation): https://hono.dev/docs/guides/validation
    *   Middleware Hono: https://hono.dev/docs/guides/middleware
    *   Chuẩn Web Standard: https://hono.dev/docs/concepts/web-standard
*   **OpenAPI & Swagger UI (Hono):**
    *   Tích hợp Swagger UI: https://hono.dev/examples/swagger-ui
    *   Tích hợp Zod OpenAPI: https://hono.dev/examples/zod-openapi
*   **Prisma ORM:**
    *   Hướng dẫn sử dụng Prisma với Hono: https://www.prisma.io/docs/guides/frameworks/hono

---

> [!IMPORTANT]
> **Quy Tắc An Toàn (Safety Guardrails):**
> *   Không bao giờ được thay đổi cấu hình `.gitignore` nhằm loại bỏ việc bỏ qua các file bí mật (như `.env`).
> *   **Quy tắc file cấu hình (.env):** Tuyệt đối không tạo hoặc sử dụng các file `.env` cục bộ trong từng thư mục con (`api/` hay `web/`). Toàn bộ biến môi trường phải được cấu hình tập trung tại duy nhất một file `.env` ở thư mục gốc (root) dự án. Mã nguồn Backend/Frontend sẽ nạp cấu hình từ file `.env` root này.
> *   Luôn kiểm tra các lỗi linting và kiểu dữ liệu (TypeScript) trước khi báo cáo hoàn thành công việc.
