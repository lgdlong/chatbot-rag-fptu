# API Đặc Tả: Phân Hệ Xác Thực & Quản Lý Tài Khoản (Better Auth)

Tài liệu này đặc tả chi tiết 100% tất cả các endpoint thuộc phân hệ Xác thực (Authentication) và Quản trị viên (Admin) được cấu hình và hoạt động thực tế trên thư viện **Better Auth** (OpenAPI JSON `api-1.json`).

> [!NOTE]
> **Yêu cầu Nghiệp vụ:** Hệ thống được phát triển để phục vụ cho **một trường học duy nhất (đơn trường)**, không chạy đa trường (multi-tenant) và không cần xây dựng cơ chế bảo mật cô lập nhiều trường học phức tạp. Do đó, phân hệ `organization()` mặc định của Better Auth đã được loại bỏ hoàn toàn để tinh gọn mã nguồn, tối ưu hóa hiệu năng và đơn giản hóa tích hợp.

---

## 🔐 Cơ Chế Xác Thực & Phân Quyền (Security Schemes)

Hệ thống hỗ trợ 2 cơ chế xác thực chính được cấu hình ở môi trường runtime:
1. **`apiKeyCookie` (Session Cookie):** Xác thực phiên thông qua cookie trình duyệt (mặc định là `better-auth.session_token`). Yêu cầu cho hầu hết các API người dùng và quản trị.
2. **`bearerAuth` (Bearer Token):** Sử dụng access token truyền trong header `Authorization: Bearer <token>` dành cho các API REST, ứng dụng mobile hoặc luồng API liên kết ngoài.

Mọi API Better Auth được mount trên Hono API Server tại prefix path: `/api/auth` (ví dụ: `/api/auth/sign-in/email`).

---

## 📂 1. Mô Hình Dữ Liệu Lõi (Core Schemas)

### User (Người dùng)
```json
{
  "id": "string (UUID)",
  "name": "string",
  "email": "string (Email format)",
  "emailVerified": "boolean (default: false)",
  "image": "string (URL, nullable)",
  "role": "string (STUDENT | LECTURER | ADMIN)",
  "banned": "boolean (default: false)",
  "banReason": "string (nullable)",
  "banExpires": "string (date-time, nullable)",
  "createdAt": "string (date-time)",
  "updatedAt": "string (date-time)"
}
```

### Session (Phiên làm việc)
```json
{
  "id": "string (UUID)",
  "userId": "string (UUID)",
  "token": "string (Session Token)",
  "expiresAt": "string (date-time)",
  "ipAddress": "string (nullable)",
  "userAgent": "string (nullable)",
  "impersonatedBy": "string (UUID, nullable)",
  "createdAt": "string (date-time)",
  "updatedAt": "string (date-time)"
}
```

---

## 🔑 2. Phân Hệ Xác Thực & Tài Khoản Cơ Bản (Default Endpoints)

Đây là các endpoint mặc định được tích hợp trong lõi Better Auth, hỗ trợ đăng ký, đăng nhập bằng email, OAuth mạng xã hội, quản lý mật khẩu, tài khoản và quản lý phiên (Sessions).

### 2.1 Đăng ký bằng Email/Mật khẩu
`POST /api/auth/sign-up/email`

*   **Mô tả:** Đăng ký tài khoản người dùng mới.
*   **Request Body (JSON):**
    *   `name` (string, bắt buộc): Họ tên đầy đủ.
    *   `email` (string, bắt buộc): Địa chỉ email.
    *   `password` (string, bắt buộc): Mật khẩu (tối thiểu 8 ký tự).
    *   `image` (string, tùy chọn): URL ảnh đại diện.
    *   `callbackURL` (string, tùy chọn): URL callback sau khi xác thực email.
    *   `rememberMe` (boolean, tùy chọn): Phiên làm việc lâu dài (mặc định `true`).
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "token": "session_token_xyz123",
      "user": {
        "id": "user-uuid-1",
        "name": "Nguyễn Văn A",
        "email": "student-test@fpt.edu.vn",
        "emailVerified": false,
        "role": "STUDENT",
        "createdAt": "2026-05-27T17:30:00.000Z",
        "updatedAt": "2026-05-27T17:30:00.000Z"
      }
    }
    ```

### 2.2 Đăng nhập bằng Email/Mật khẩu
`POST /api/auth/sign-in/email`

*   **Mô tả:** Xác thực thông tin tài khoản và lấy session token.
*   **Request Body (JSON):**
    *   `email` (string, bắt buộc)
    *   `password` (string, bắt buộc)
    *   `callbackURL` (string, tùy chọn)
    *   `rememberMe` (boolean, tùy chọn)
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "redirect": false,
      "token": "session_token_xyz123",
      "user": {
        "id": "user-uuid-1",
        "name": "Nguyễn Văn A",
        "email": "student-test@fpt.edu.vn",
        "role": "STUDENT"
      }
    }
    ```

### 2.3 Đăng nhập qua Nhà cung cấp MXH (Social OAuth)
`POST /api/auth/sign-in/social`

*   **Mô tả:** Đăng nhập thông qua Google, GitHub hoặc các nhà cung cấp OAuth khác.
*   **Request Body (JSON):**
    *   `provider` (string, bắt buộc): `"google"` | `"github"`
    *   `callbackURL` (string, tùy chọn): URL chuyển hướng sau khi đăng nhập thành công.
    *   `disableRedirect` (boolean, tùy chọn): Tắt chuyển hướng tự động để tự xử lý flow ở Client.
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "redirect": true,
      "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
    }
    ```

### 2.4 Callback xử lý OAuth
`GET/POST /api/auth/callback/{id}`

*   **Mô tả:** Endpoint tiếp nhận mã ủy quyền (authorization code) gửi về từ Nhà cung cấp MXH (`id` là tên provider). Tự động thiết lập session và chuyển hướng về `callbackURL`.

### 2.5 Đăng xuất khỏi hệ thống
`POST /api/auth/sign-out`

*   **Mô tả:** Hủy phiên hiện tại trên server và xóa session cookie ở phía client.
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "success": true
    }
    ```

### 2.6 Lấy thông tin phiên hiện tại
`GET/POST /api/auth/get-session`

*   **Mô tả:** Lấy thông tin User và Session hoạt động liên kết với Cookie/Bearer Token gửi lên.
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "user": {
        "id": "user-uuid-1",
        "name": "Nguyễn Văn A",
        "email": "student-test@fpt.edu.vn"
      },
      "session": {
        "id": "session-uuid-1",
        "userId": "user-uuid-1",
        "expiresAt": "2026-06-27T17:30:00.000Z",
        "token": "session_token_xyz123"
      }
    }
    ```

### 2.7 Yêu cầu đặt lại mật khẩu (Gửi Mail)
`POST /api/auth/request-password-reset`

*   **Mô tả:** Gửi một liên kết chứa mã token đặt lại mật khẩu về email người dùng.
*   **Request Body (JSON):**
    *   `email` (string, bắt buộc)
    *   `redirectTo` (string, tùy chọn): Trang đặt lại mật khẩu của front-end.
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "status": true,
      "message": "Password reset email sent"
    }
    ```

### 2.8 Đặt lại mật khẩu mới bằng Token
`POST /api/auth/reset-password`

*   **Mô tả:** Sử dụng token từ email để đặt lại mật khẩu mới cho tài khoản.
*   **Request Body (JSON):**
    *   `newPassword` (string, bắt buộc)
    *   `token` (string, bắt buộc)
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "status": true
    }
    ```

### 2.9 Thay đổi Email người dùng
`POST /api/auth/change-email`

*   **Mô tả:** Đổi địa chỉ email của tài khoản hiện tại sang email mới.
*   **Request Body (JSON):**
    *   `newEmail` (string, bắt buộc)
    *   `callbackURL` (string, tùy chọn)
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "status": true,
      "message": "Verification email sent",
      "user": { "id": "user-uuid-1" }
    }
    ```

### 2.10 Thay đổi mật khẩu tài khoản
`POST /api/auth/change-password`

*   **Mô tả:** Thay đổi mật khẩu khi người dùng đã đăng nhập và biết mật khẩu hiện tại.
*   **Request Body (JSON):**
    *   `newPassword` (string, bắt buộc)
    *   `currentPassword` (string, bắt buộc)
    *   `revokeOtherSessions` (boolean, tùy chọn): Hủy bỏ tất cả các phiên đăng nhập khác.
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "user": { "id": "user-uuid-1" }
    }
    ```

### 2.11 Xác thực Email qua Token
`GET /api/auth/verify-email`

*   **Mô tả:** Thực thi xác minh email bằng mã token gửi qua query parameters.
*   **Query Parameters:**
    *   `token` (string, bắt buộc)
    *   `callbackURL` (string, tùy chọn)
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "status": true,
      "user": { "id": "user-uuid-1", "emailVerified": true }
    }
    ```

### 2.12 Gửi lại Email xác thực tài khoản
`POST /api/auth/send-verification-email`

*   **Mô tả:** Gửi lại email kích hoạt / xác thực tài khoản cho người dùng.
*   **Request Body (JSON):**
    *   `email` (string, bắt buộc)
    *   `callbackURL` (string, tùy chọn)

### 2.13 Xác thực lại Mật khẩu hiện tại
`POST /api/auth/verify-password`

*   **Mô tả:** Xác minh nhanh xem mật khẩu gửi lên có đúng với tài khoản hiện tại không (dùng trước các tác vụ nhạy cảm).
*   **Request Body (JSON):**
    *   `password` (string, bắt buộc)

### 2.14 Cập nhật thông tin Người dùng
`POST /api/auth/update-user`

*   **Mô tả:** Cập nhật họ tên hoặc ảnh đại diện của tài khoản hiện tại.
*   **Request Body (JSON):**
    *   `name` (string, tùy chọn)
    *   `image` (string, tùy chọn)

### 2.15 Xóa tài khoản người dùng
`POST /api/auth/delete-user`

*   **Mô tả:** Yêu cầu xóa vĩnh viễn tài khoản người dùng khỏi hệ thống.
*   **Request Body (JSON):**
    *   `password` (string, tùy chọn): Cần thiết nếu phiên đăng nhập không còn mới (fresh).
    *   `callbackURL` (string, tùy chọn)

### 2.16 Lấy danh sách các Phiên hoạt động
`GET /api/auth/list-sessions`

*   **Mô tả:** Trả về danh sách tất cả các phiên đăng nhập đang hoạt động của người dùng (thiết bị, IP, thời gian tạo).
*   **Ví dụ Response (200 OK):**
    ```json
    [
      {
        "id": "session-uuid-1",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "expiresAt": "2026-06-27T17:30:00.000Z",
        "createdAt": "2026-05-27T17:30:00.000Z"
      }
    ]
    ```

### 2.17 Thu hồi một Phiên đăng nhập
`POST /api/auth/revoke-session`

*   **Mô tả:** Đăng xuất từ xa một phiên đăng nhập bằng mã token phiên đó.
*   **Request Body (JSON):**
    *   `token` (string, bắt buộc)

### 2.18 Thu hồi tất cả Phiên đăng nhập
`POST /api/auth/revoke-sessions`

*   **Mô tả:** Thu hồi toàn bộ mọi phiên đăng nhập của người dùng.

### 2.19 Thu hồi các Phiên đăng nhập khác (Revoke Other)
`POST /api/auth/revoke-other-sessions`

*   **Mô tả:** Đăng xuất tài khoản khỏi tất cả các thiết bị khác, ngoại trừ phiên hiện tại.

### 2.20 Liên kết tài khoản MXH mới
`POST /api/auth/link-social`

*   **Mô tả:** Liên kết thêm tài khoản Google/GitHub vào tài khoản email hiện hành để cho phép đăng nhập kép.
*   **Request Body (JSON):**
    *   `provider` (string, bắt buộc): `"google"` | `"github"`
    *   `callbackURL` (string, tùy chọn)

### 2.21 Hủy liên kết tài khoản MXH
`POST /api/auth/unlink-account`

*   **Mô tả:** Loại bỏ liên kết OAuth MXH đã gán với tài khoản.
*   **Request Body (JSON):**
    *   `providerId` (string, bắt buộc): `"google"`

### 2.22 Liệt kê danh sách liên kết MXH
`GET /api/auth/list-accounts`

*   **Mô tả:** Liệt kê toàn bộ các tài khoản nhà cung cấp (OAuth Accounts) đã liên kết với người dùng.

### 2.23 Làm mới Session Token (Refresh Token)
`POST /api/auth/refresh-token`

*   **Mô tả:** Dùng refresh token để xin cấp mới access token.
*   **Request Body (JSON):**
    *   `providerId` (string, bắt buộc)

### 2.24 Kiểm tra API hoạt động (Health-check Auth)
`GET /api/auth/ok`

*   **Mô tả:** Trả về `{ "ok": true }` để kiểm tra kết nối phân hệ xác thực Better Auth.

---

## ⚡ 3. Phân Hệ Quản Trị Viên Hệ Thống (Admin Plugin)

Better Auth cung cấp plugin Admin tích hợp các API dành riêng cho quản trị viên tối cao để kiểm soát cơ sở dữ liệu người dùng, quản trị phiên và thực thi lệnh cấm (Ban) tài khoản.

### 3.1 Thiết lập Vai trò Người dùng
`POST /api/auth/admin/set-role`

*   **Mô tả:** Gán quyền quản trị hệ thống cho tài khoản.
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)
    *   `role` (string, bắt buộc): `"ADMIN"` | `"LECTURER"` | `"STUDENT"`
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "user": {
        "id": "user-uuid-1",
        "name": "Nguyễn Văn A",
        "role": "LECTURER"
      }
    }
    ```

### 3.2 Lấy chi tiết thông tin Người dùng bất kỳ
`GET /api/auth/admin/get-user`

*   **Mô tả:** Lấy chi tiết thông tin người dùng trong DB (kể cả thông tin cấm).
*   **Query Parameters:**
    *   `id` (string, bắt buộc): ID người dùng cần tra cứu.

### 4.3 Khởi tạo tài khoản Người dùng mới
`POST /api/auth/admin/create-user`

*   **Mô tả:** Tạo một tài khoản người dùng trực tiếp không cần qua form đăng ký client.
*   **Request Body (JSON):**
    *   `name` (string, bắt buộc)
    *   `email` (string, bắt buộc)
    *   `password` (string, tùy chọn)
    *   `role` (string, tùy chọn): Vai trò mặc định.

### 3.4 Danh sách tất cả Người dùng (Phân trang & Tìm kiếm)
`GET /api/auth/admin/list-users`

*   **Mô tả:** Danh sách người dùng hệ thống kèm bộ lọc, phân trang, sắp xếp nâng cao.
*   **Query Parameters:**
    *   `limit` (string, tùy chọn): Giới hạn dòng.
    *   `offset` (string, tùy chọn): Vị trí bắt đầu.
    *   `searchValue` (string, tùy chọn): Giá trị tìm kiếm.
    *   `searchField` (string, tùy chọn): Tìm theo cột nào (`"email"` | `"name"`).
    *   `sortBy` (string, tùy chọn): Cột sắp xếp.
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "users": [
        {
          "id": "user-uuid-1",
          "name": "Nguyễn Văn A",
          "email": "student-test@fpt.edu.vn"
        }
      ],
      "total": 1,
      "limit": 10,
      "offset": 0
    }
    ```

### 3.5 Cấm tài khoản người dùng (Ban User)
`POST /api/auth/admin/ban-user`

*   **Mô tả:** Khóa tài khoản người dùng, ngăn chặn họ đăng nhập vào hệ thống.
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)
    *   `banReason` (string, tùy chọn): Lý do khóa tài khoản.
    *   `banExpiresIn` (number, tùy chọn): Thời hạn cấm tài khoản tính bằng giây.
*   **Ví dụ Response (200 OK):**
    ```json
    {
      "user": {
        "id": "user-uuid-1",
        "banned": true,
        "banReason": "Vi phạm chính sách bảo mật."
      }
    }
    ```

### 3.6 Gỡ cấm tài khoản người dùng (Unban User)
`POST /api/auth/admin/unban-user`

*   **Mô tả:** Kích hoạt lại tài khoản đã bị khóa.
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)

### 3.7 Đóng vai người dùng (Impersonate User)
`POST /api/auth/admin/impersonate-user`

*   **Mô tả:** Cho phép Admin "nhập vai" vào tài khoản của người dùng bất kỳ để debug lỗi giao diện mà không cần biết mật khẩu. Thiết lập trường `impersonatedBy` trong session.
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)

### 3.8 Dừng đóng vai người dùng
`POST /api/auth/admin/stop-impersonating`

*   **Mô tả:** Admin dừng quá trình nhập vai và quay lại phiên làm việc quản trị gốc.

### 3.9 Lấy các phiên đăng nhập của người dùng khác
`POST /api/auth/admin/list-user-sessions`

*   **Mô tả:** Admin liệt kê tất cả mọi phiên làm việc của một người dùng cụ thể.
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)

### 3.10 Thu hồi một phiên đăng nhập của người dùng khác
`POST /api/auth/admin/revoke-user-session`

*   **Mô tả:** Admin cưỡng bức đăng xuất một phiên làm việc của user bằng token phiên.
*   **Request Body (JSON):**
    *   `sessionToken` (string, bắt buộc)

### 3.11 Thu hồi mọi phiên đăng nhập của người dùng khác
`POST /api/auth/admin/revoke-user-sessions`

*   **Mô tả:** Admin cưỡng bức đăng xuất tài khoản người dùng bất kỳ ra khỏi tất cả các thiết bị đang kết nối.
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)

### 3.12 Xóa vĩnh viễn người dùng hệ thống
`POST /api/auth/admin/remove-user`

*   **Mô tả:** Admin xóa sạch hoàn toàn thông tin User, Session và các Account liên kết khỏi database (hành động không thể khôi phục).
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)

### 3.13 Cưỡng chế đặt mật khẩu mới cho người dùng
`POST /api/auth/admin/set-user-password`

*   **Mô tả:** Admin đặt lại mật khẩu trực tiếp cho người dùng mà không cần biết mật khẩu cũ.
*   **Request Body (JSON):**
    *   `userId` (string, bắt buộc)
    *   `newPassword` (string, bắt buộc)
