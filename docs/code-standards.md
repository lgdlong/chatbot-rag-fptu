# QUY CHUẨN LẬP TRÌNH TIÊU CHUẨN (CODE STANDARDS GUIDE)

Tài liệu này quy định bộ tiêu chuẩn kỹ thuật, phong cách lập trình và các quy chuẩn bảo mật bắt buộc áp dụng khi viết mã nguồn cho toàn bộ dự án **FPTU Chatbot RAG**.

---

## 🎯 1. Quy Chuẩn TypeScript & Clean Code

* **Strict Type Safety:**
  * Luôn luôn bật cấu hình `"strict": true` trong `tsconfig.json`.
  * Tuyệt đối **không sử dụng kiểu `any`** trong bất kỳ trường hợp nào. Nếu một kiểu dữ liệu chưa xác định rõ trong quá trình parse, hãy sử dụng kiểu `unknown` và thực hiện Type Guard.
  * Mọi hàm, phương thức bắt buộc phải khai báo rõ ràng kiểu dữ liệu của các tham số nhận vào và kiểu dữ liệu trả về (Return type).
* **Naming Conventions (Quy ước đặt tên):**
  * **Variables & Functions:** Đặt tên theo dạng `camelCase` (ví dụ: `getUserSession`, `isTenantActive`).
  * **Classes & Interfaces & Types:** Đặt tên theo dạng `PascalCase` (ví dụ: `ChatSessionService`, `CreateUserDto`).
  * **Database Models (Prisma):** Đặt tên theo dạng `PascalCase` ở số ít (ví dụ: `Tenant`, `ChatMessage`).
  * **Constants:** Đặt tên viết hoa cách nhau bằng dấu gạch dưới `UPPER_SNAKE_CASE` (ví dụ: `MAX_VIDEO_DURATION_SECONDS`).

---

## ⚡ 2. Quy Chuẩn Backend Hono.js

* **Tuân thủ Web Standard API:**
  * Hono.js hoạt động dựa trên các tiêu chuẩn Web API (Request, Response, Headers). Luôn sử dụng context `c` để lấy và trả về dữ liệu.
  * Tận dụng `c.req.valid('json')` kết hợp với thư viện **Zod** để tự động kiểm tra tính hợp lệ của dữ liệu đầu vào tại middleware trước khi đi vào controller xử lý logic.
* **Xử lý Lỗi Tập Trung (Global Error Handling):**
  * Không viết các khối `try-catch` lặp đi lặp lại ở mọi endpoint. 
  * Sử dụng `app.onError((err, c) => { ... })` để bắt mọi lỗi không mong muốn, ghi log chi tiết (logger) và trả về Client định dạng JSON chuẩn:
    ```json
    {
      "success": false,
      "error": {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau."
      }
    }
    ```

---

## 🎨 3. Quy Chuẩn Frontend Next.js (Vercel Performance Best Practices)

* **Server Components (RSC) làm Mặc định:**
  * Mọi Component mặc định phải là Server Component để tối ưu hóa SEO và giảm tải lượng JavaScript tải xuống trình duyệt của người dùng.
  * Chỉ thêm từ khóa `'use client'` ở dòng đầu tiên của file khi component đó thực sự cần sử dụng các React Hooks (`useState`, `useEffect`, `useContext`) hoặc lắng nghe trực tiếp các sự kiện tương tác (`onClick`, `onChange`).
* **Tối ưu hóa Data Fetching:**
  * Sử dụng cơ chế fetch song song (Parallel Fetching) thay vì chuỗi fetch tuần tự (Waterfall fetch) để cải thiện tốc độ tải trang.
  * Áp dụng `<Suspense>` của React để hiển thị trạng thái Loading Skeleton mượt mà trong khi chờ đợi dữ liệu tải về.
* **Tối ưu hóa Tài nguyên:**
  * Luôn sử dụng component `<Image>` của Next.js thay cho thẻ `<img>` thô để tự động nén kích thước, chuyển sang định dạng WebP hiện đại và lazy-load ảnh.
  * Sử dụng font chữ được tối ưu hóa qua `next/font` để triệt tiêu hiện tượng nhấp nháy font khi tải trang (Layout Shift).

---

## 🔒 4. Nguyên Tắc Bảo Mật Cô Lập Đa Trường (Multi-tenant Isolation Guardrails)

Đây là yêu cầu bảo mật quan trọng nhất của dự án để đảm bảo tính cô lập dữ liệu giữa các trường học:

* **Không Truy Cập Dữ Liệu Trực Tiếp:**
  * Tuyệt đối không viết các câu lệnh truy vấn cơ sở dữ liệu `prisma.document.findMany()` hoặc tìm kiếm vector trên Vector DB mà không đi kèm điều kiện lọc `tenantId` lấy từ phiên đăng nhập hiện hành.
* **Xác Thực Đầu Vào Header:**
  * Mọi API tương tác với dữ liệu học tập đều phải đi qua Middleware `requireTenant`. Middleware này có nhiệm vụ trích xuất `tenantId` từ JWT/Session của người dùng và ghi nó vào context của Hono (`c.set('tenantId', tenantId)`).
* **Double-Check Rule:**
  * Khi truy xuất hoặc cập nhật bất kỳ bản ghi nào, luôn kiểm tra quyền sở hữu kép:
    ```typescript
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: currentTenantId // Bắt buộc phải có điều kiện lọc này!
      }
    });
    if (!course) {
      throw new HTTPException(403, { message: "Bạn không có quyền truy cập khóa học này." });
    }
    ```

---

## 📦 5. Quy Trình Git & Pull Request (PR)

* **Quy tắc đặt tên nhánh (Branch Naming):**
  * Nhánh tính năng mới: `feature/ten-tinh-nang` (ví dụ: `feature/google-oauth`).
  * Nhánh sửa lỗi: `bugfix/ten-loi` (ví dụ: `bugfix/fix-sse-close-event`).
  * Nhánh viết tài liệu: `docs/ten-tai-lieu` (ví dụ: `docs/add-roadmap`).
* **Quy chuẩn thông điệp Commit (Conventional Commits):**
  * Mọi thông điệp commit phải tuân thủ cấu trúc chuẩn: `<type>(<scope>): <description>`
  * **Các type hợp lệ:**
    * `feat`: Thêm tính năng mới.
    * `fix`: Sửa lỗi.
    * `docs`: Thay đổi hoặc thêm mới tài liệu.
    * `refactor`: Tái cấu trúc code (không sửa lỗi, không thêm tính năng).
    * `test`: Viết thêm unit test hoặc integration test.
    * `chore`: Thay đổi cấu hình build, package dependencies.
  * *Ví dụ:* `feat(auth): integrate google oauth sso provider via better auth`
