# QUY TẮC CẤU TRÚC THƯ MỤC DỰ ÁN (FOLDER-STRUCTURE-RULES.MD)

Tài liệu này là quy tắc hành vi bắt buộc dành cho mọi AI Agent khi thực hiện các tác vụ tạo mới, chỉnh sửa hoặc cấu trúc mã nguồn trong repository **Chatbot RAG FPTU**. 

Mọi thay đổi mã nguồn phải tuân thủ tuyệt đối sơ đồ phân vùng dưới đây để bảo vệ cấu trúc Clean Architecture và Domain-Driven Design (DDD) lai của hệ thống.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1.  **Không ô nhiễm thư mục gốc:** Không tạo bất kỳ file code hoặc thư mục nào ngoài phạm vi `api/`, `web/`, `docs/`, và `.agents/` mà không có sự đồng ý của User.
2.  **Phân rã theo nghiệp vụ (Domain Isolation):** Logic của Backend phải nằm gọn trong các module của thư mục `api/src/modules/`. Không viết logic nghiệp vụ trực tiếp trong các middleware hoặc file `index.ts`.
3.  **Tách biệt UI và Logic ở Frontend:** Giao diện Next.js phải được phân mảnh thành các stateless UI components (trong `components/ui/` hoặc `components/common/`) và chuyển trạng thái logic phức tạp vào các custom React hooks (trong `hooks/`) hoặc feature components (trong `components/features/`).

---

## 2. Đặc Tả Chi Tiết Từng Thư Mục

### 📂 Phân Hệ Backend (`api/src/`)

Mọi file tạo mới ở backend phải nằm đúng trong các phân vùng được định nghĩa dưới đây:

| Tên Thư Mục | Quy Định Nội Dung Chứa | Các Quy Tắc Bắt Buộc |
| :--- | :--- | :--- |
| **`config/`** | File cấu hình hệ thống, thiết lập kết nối cơ sở dữ liệu (Prisma Client), khởi tạo API client bên thứ 3 (OpenAI SDK, Gemini SDK), nạp biến môi trường (`.env`). | *Tuyệt đối không hardcode API key. Tất cả phải đi qua lớp config này.* |
| **`constants/`** | Chứa các hằng số dùng chung toàn hệ thống, mã lỗi nghiệp vụ, các định nghĩa hằng số HTTP Status Codes. | *Giúp tránh lỗi gõ nhầm string (magic strings).* |
| **`middlewares/`** | Chứa các Hono middlewares giải quyết các bài toán cắt ngang (cross-cutting concerns) như Authentication (`auth.middleware.ts`), Multi-tenant Isolation (`tenant.middleware.ts`), Global Exception Handler (`error.middleware.ts`). | *Không chứa logic nghiệp vụ đặc thù của bất kỳ môn học hay chatbot nào.* |
| **`services/`** | Chứa các dịch vụ nền tảng dùng chung trên toàn hệ thống như kết nối Vector DB (`vector-db.service.ts`), xử lý file vật lý (`storage.service.ts`), gọi API nhúng văn bản (`embedding.service.ts`). | *Các dịch vụ này được thiết kế dưới dạng singleton hoặc static class để tái sử dụng tối đa.* |
| **`types/`** | Chứa các file khai báo kiểu dữ liệu TypeScript (`.d.ts` hoặc `.ts`) dùng chung cho toàn bộ backend. | *Không định nghĩa các type cục bộ ở đây.* |
| **`utils/`** | Chứa các hàm tiện ích thuần túy (Pure helper functions) như chuẩn hóa chuỗi tiếng Việt, xử lý định dạng ngày tháng, tính toán toán học. | *Hàm tiện ích ở đây không được phép phụ thuộc vào bất kỳ cơ sở dữ liệu hay thư viện ngoài nào.* |

#### Phân Phối Chi Tiết Trong `modules/` (Business Domains)
Mỗi folder trong `modules/` đại diện cho một phân hệ độc lập (e.g. `chat/`, `courses/`, `documents/`). Mỗi module bắt buộc phải tuân thủ cấu trúc 3 tầng:
1.  **`[domain].controller.ts` (Tầng giao tiếp):** Chỉ làm nhiệm vụ định tuyến (routes), kiểm tra xác thực, validate payload qua Zod schema, gọi tầng service và trả về HTTP Response.
2.  **`[domain].service.ts` (Tầng nghiệp vụ):** Thực hiện tính toán, CRUD cơ sở dữ liệu, truy xuất vector, tổng hợp prompt gửi cho LLM.
3.  **`[domain].schema.ts` (Tầng kiểm định):** Khai báo các đối tượng Zod Schema để validate input.

---

### 📂 Phân Hệ Frontend (`web/`)

Next.js 15+ App Router yêu cầu tính tổ chức cao để tối ưu hóa hiệu năng render phía server (RSC) và client (RCC):

| Tên Thư Mục | Quy Định Nội Dung Chứa | Các Quy Tắc Bắt Buộc |
| :--- | :--- | :--- |
| **`app/`** | Chứa các route path của ứng dụng Next.js. Bắt buộc sử dụng Route Groups: `(auth)` cho đăng nhập/đăng ký và `(dashboard)` cho các trang nghiệp vụ sau đăng nhập để kế thừa Layout điều hướng thống nhất. | *Hạn chế tối đa việc viết code giao diện trực tiếp trong `page.tsx`. Hãy tách nhỏ thành các component.* |
| **`components/ui/`** | Chứa các component giao diện nguyên tử, không chứa trạng thái nghiệp vụ (Stateless). Thường được cài đặt qua `shadcn/ui` (e.g. `button.tsx`, `input.tsx`, `dialog.tsx`). | *Không được import trực tiếp API service hoặc custom hooks của nghiệp vụ vào đây.* |
| **`components/common/`** | Chứa các component bộ khung Layout hệ thống (e.g. `sidebar.tsx`, `navbar.tsx`, `footer.tsx`). | *Đảm bảo tính tái sử dụng cao trên nhiều layout khác nhau.* |
| **`components/features/`** | Chứa các component giao diện phức tạp ghép nối theo từng tính năng cụ thể (e.g. `chat/chat-bubble.tsx`, `documents/upload-zone.tsx`). Lớp này được phép chứa trạng thái nghiệp vụ và giao tiếp trực tiếp với custom hooks. | *Phân chia thư mục con theo đúng tên tính năng.* |
| **`hooks/`** | Chứa các custom React Hooks xử lý logic nghiệp vụ và state của UI (e.g. `useChatStream.ts` để kết nối SSE, `useAuth.ts` để kiểm tra session). | *Giúp tách biệt hoàn toàn phần Logic ra khỏi phần hiển thị (UI).* |
| **`context/`** | Chứa các React Context Provider quản lý trạng thái toàn cục như `AuthContext.tsx` hoặc `ThemeContext.tsx`. | *Chỉ sử dụng cho các trạng thái thực sự cần chia sẻ toàn hệ thống.* |
| **`lib/`** | Chứa các wrapper khởi tạo thư viện ngoài như cấu hình Axios/Fetch client chung (`api-client.ts`), cấu hình helper gộp class CSS (`utils.ts`). | *Giữ cấu hình tập trung để dễ cấu hình header/token.* |
| **`services/`** | Chứa các module khai báo hàm gọi API lên Hono backend (e.g. `auth.ts`, `chat.ts`), ánh xạ đúng các API endpoint của backend. | *Trả về kiểu dữ liệu sạch cho frontend sử dụng.* |

---

## 3. Quy Tắc Ràng Buộc Cho AI Agent (Mandatory Guardrails)

> [!IMPORTANT]
> 1.  **Enforce `.gitkeep`:** Khi tạo bất kỳ thư mục mới nào trong `api/` hoặc `web/` mà chưa có file code ngay lập tức, **bắt buộc** phải tạo kèm file `.gitkeep` bên trong thư mục đó để đảm bảo cấu trúc được tracking trong Git.
> 2.  **No Direct Database Access in Controllers:** Controller của backend Hono tuyệt đối không được phép gọi trực tiếp `prisma.model.findMany()` hoặc tương tự. Mọi hành động tương tác dữ liệu bắt buộc phải thông qua lớp Service.
> 3.  **Strict File Naming:** 
>     *   Ở Backend: Sử dụng kebab-case cho tên file (e.g. `auth.middleware.ts`, `vector-db.service.ts`).
>     *   Ở Frontend: Tên component viết bằng PascalCase (e.g. `ChatBubble.tsx`), các file hook, service, helper viết bằng camelCase (e.g. `useChatStream.ts`, `apiClient.ts`).
