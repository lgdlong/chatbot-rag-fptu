# API Đặc Tả: Phân Hệ Quản Lý Giảng Viên & Admin

Phân hệ này cho phép các giảng viên FPT gửi yêu cầu xin cấp quyền giảng dạy và tải tài liệu môn học. Đồng thời cung cấp các công cụ phê duyệt phân quyền (RBAC) cho tài khoản quản trị hệ thống (Admin).

---

## 🔐 Cơ Chế Xác Thực (Authentication)
- **Đơn xin cấp tài khoản:** Không yêu cầu xác thực (Public endpoint).
- **Quản lý danh sách & Phê duyệt (Admin):** Yêu cầu đăng nhập tài khoản Quản Trị Viên có vai trò `ADMIN` thông qua Session Cookie Better Auth (`better-auth.session_token`).

---

## 📂 Các Endpoint Đặc Tả

### 1. Giảng viên gửi yêu cầu cấp tài khoản
`POST /api/auth-admin/lecturer-request`

#### Mô tả
Giảng viên chưa có tài khoản trên hệ thống gửi thông tin (Họ tên, email FPT, lý do giảng dạy môn học) để xin cấp quyền truy cập. 
**Cơ chế Edge Case bảo vệ hệ thống:** Server kiểm tra xem email đăng ký có trùng với tài khoản người dùng đã tồn tại trong database PostgreSQL hay không. Nếu trùng, server lập tức trả lỗi `409 Conflict` mã `"Email is already registered"`. Yêu cầu gửi thành công sẽ được khởi tạo trong DB ở trạng thái `PENDING`.

#### Yêu cầu
- **Authentication:** ❌ Không yêu cầu.
- **Content-Type:** `application/json`

#### Request Body (JSON)
| Tên Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | ✅ | Họ và tên của giảng viên xin cấp tài khoản. | `"Nguyễn Văn A"` |
| `email` | string | ✅ | Email công vụ FPT (bắt buộc đuôi `@fpt.edu.vn`). | `"anv@fpt.edu.vn"` |
| `reason` | string | ✅ | Lý do chi tiết phục vụ việc đối chiếu xét duyệt môn học. | `"Tôi cần tải lên slides giảng dạy SWD392 kỳ Summer."` |

**Ví dụ JSON Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "anv@fpt.edu.vn",
  "reason": "Tôi cần tải lên slides giảng dạy SWD392 kỳ Summer."
}
```

#### Response Schema

**Thành công - 200 OK:**
*Trả về khi lưu yêu cầu đăng ký vào PostgreSQL thành công.*

```json
{
  "success": true,
  "request": {
    "id": "req-111",
    "name": "Nguyễn Văn A",
    "email": "anv@fpt.edu.vn",
    "reason": "Tôi cần tải lên slides giảng dạy SWD392 kỳ Summer.",
    "status": "PENDING",
    "createdAt": "2026-05-27T16:38:00.000Z"
  }
}
```

**Thất bại - 400 Bad Request:**
*Trả về khi thiếu các trường bắt buộc.*
```json
{
  "error": "Name, email, and reason are required"
}
```

**Thất bại - 409 Conflict:**
*Trả về khi email đã đăng ký thành công tài khoản hoặc trùng đơn đăng ký đang chờ duyệt.*
```json
{
  "error": "Email is already registered in the system"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X POST http://localhost:8000/api/auth-admin/lecturer-request \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn A",
    "email": "anv@fpt.edu.vn",
    "reason": "Tôi cần tải lên slides giảng dạy SWD392 kỳ Summer."
  }'
```

---

### 2. Admin lấy danh sách yêu cầu cấp tài khoản
`GET /api/auth-admin/admin/lecturer-requests`

#### Mô tả
Quản trị viên lấy danh sách toàn bộ các đơn xin cấp tài khoản của giảng viên trên hệ thống để theo dõi và đưa ra quyết định phê duyệt.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Session Cookie Better Auth vai trò `ADMIN`).

#### Response Schema

**Thành công - 200 OK:**
```json
{
  "requests": [
    {
      "id": "req-111",
      "name": "Nguyễn Văn A",
      "email": "anv@fpt.edu.vn",
      "reason": "Tôi giảng dạy môn SWD392.",
      "status": "PENDING",
      "createdAt": "2026-05-27T16:38:00.000Z"
    }
  ]
}
```

**Thất bại - 403 Forbidden:**
*Trả về khi tài khoản đăng nhập không phải Admin.*
```json
{
  "error": "Forbidden: Admin access required"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X GET http://localhost:8000/api/auth-admin/admin/lecturer-requests \
  -H "Cookie: better-auth.session_token=your_admin_session_cookie_token_here"
```

---

### 3. Admin phê duyệt cấp tài khoản giảng viên
`POST /api/auth-admin/admin/lecturer-requests/{requestId}/approve`

#### Mô tả
Phê duyệt đơn đăng ký của giảng viên. 
**Quy trình nghiệp vụ bảo mật (Workflow):**
1. Server kiểm tra sự tồn tại của đơn đăng ký. Nếu status không phải `PENDING`, API báo lỗi `400 Bad Request`.
2. Hệ thống sinh tự động ngẫu nhiên một **mật khẩu tạm thời** có độ bảo mật cao (ví dụ: `Lecturer@852194`).
3. Thực hiện băm mật khẩu (Hash) thủ công bằng thuật toán mã hóa pbkdf2 (`sha512` kết hợp `salt` 16 bytes ngẫu nhiên, số vòng lặp `1000`) để định cấu hình định dạng mật khẩu tương thích 100% với hệ thống mã hóa mật khẩu tự động của Better Auth.
4. Mở Transaction PostgreSQL, cùng lúc tạo bản ghi `User` vai trò `LECTURER`, bản ghi xác thực `Account` đính kèm chuỗi mật khẩu đã hash, và cập nhật trạng thái đơn xin thành `APPROVED`.
5. Trả về thông tin mật khẩu tạm thời cho Admin hiển thị duy nhất **1 lần** để Admin chủ động gửi lại cho Giảng viên.

#### Tham số Đường Dẫn (Path Parameters)
| Tên Tham Số | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `requestId` | string | ✅ | ID của đơn xin cấp tài khoản cần duyệt. | `"req-111"` |

#### Response Schema

**Thành công - 200 OK:**
```json
{
  "success": true,
  "message": "Lecturer account created successfully",
  "credentials": {
    "email": "anv@fpt.edu.vn",
    "temporaryPassword": "Lecturer@582194"
  }
}
```

**Thất bại - 400 Bad Request:**
*Trả về khi đơn đăng ký đã được duyệt hoặc từ chối trước đó.*
```json
{
  "error": "Request is already processed"
}
```

**Thất bại - 404 Not Found:**
*Trả về khi ID đơn xin không tồn tại trong hệ thống.*
```json
{
  "error": "Request not found"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X POST http://localhost:8000/api/auth-admin/admin/lecturer-requests/req-111/approve \
  -H "Cookie: better-auth.session_token=your_admin_session_cookie_token_here"
```

---

### 4. Admin từ chối cấp tài khoản giảng viên
`POST /api/auth-admin/admin/lecturer-requests/{requestId}/reject`

#### Mô tả
Từ chối đơn xin cấp tài khoản của giảng viên. Cập nhật trạng thái đơn xin trong PostgreSQL thành `REJECTED`.

#### Tham số Đường Dẫn (Path Parameters)
| Tên Tham Số | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `requestId` | string | ✅ | ID của đơn xin cấp tài khoản cần từ chối. | `"req-111"` |

**Ví dụ JSON Response (200 OK):**
```json
{
  "success": true
}
```
