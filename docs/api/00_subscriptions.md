# API Đặc Tả: Gói Dịch Vụ & Thanh Toán (PayOS)

Phân hệ này quản lý việc theo dõi gói dịch vụ (BASIC, SILVER, GOLD), số câu hỏi đã gửi trong cửa sổ 5 giờ hiện tại của sinh viên và tích hợp thanh toán trực tuyến qua PayOS để nâng cấp gói dịch vụ tăng hạn ngạch.

---

## 🔐 Cơ Chế Xác Thực (Authentication)
- **Xem & Nâng cấp gói:** Xác thực bằng Better Auth Session Cookie (Yêu cầu vai trò `STUDENT`).
- **PayOS Webhook:** Endpoint công khai không yêu cầu cookie đăng nhập, nhưng bắt buộc xác thực tự động bằng thuật toán băm mã hóa đối chiếu chữ ký số (`signature`) truyền trực tiếp từ cổng PayOS để chống giả mạo request.

---

## 📂 Các Endpoint Đặc Tả

### 1. Lấy thông tin gói dịch vụ cá nhân
`GET /api/subscriptions/me`

#### Mô tả
Kiểm tra gói dịch vụ hiện tại (Basic/Silver/Gold), số lượng câu hỏi sinh viên đã gửi trong cửa sổ 5 giờ hiện tại và hạn mức tối đa của gói.
**Cơ chế Edge Case tự động reset:** Khi API nhận request, server tự động so sánh thời điểm hiện tại với thời điểm reset cuối cùng (`lastReset`). Nếu đã trôi qua ít nhất 5 giờ, server sẽ tự động cập nhật số câu hỏi đã dùng (`messageCount`) về `0` và cập nhật `lastReset` mới vào database PostgreSQL, đảm bảo hạn mức của sinh viên được khôi phục theo từng cửa sổ 5 giờ mà không cần chạy cron job ngầm.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Session Cookie Better Auth).

#### Response Schema

**Thành công - 200 OK:**
```json
{
  "subscription": {
    "id": "sub-222",
    "userId": "user-123",
    "tier": "BASIC",
    "startDate": "2026-05-27T16:38:00.000Z",
    "endDate": "2126-05-27T16:38:00.000Z",
    "maxMessages": 10,
    "messageCount": 3,
    "lastReset": "2026-05-27T16:38:00.000Z"
  }
}
```

*Mô tả chi tiết các trường trả về (Success Response):*
| Trường | Loại | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- |
| `subscription.id` | string | ID duy nhất của bản ghi gói dịch vụ. | `"sub-222"` |
| `subscription.tier` | string | Gói hiện tại: `"BASIC"` (mặc định), `"SILVER"`, hoặc `"GOLD"`. | `"BASIC"` |
| `subscription.maxMessages` | integer | Số câu hỏi tối đa sinh viên được gửi trong một cửa sổ 5 giờ. | `10` |
| `subscription.messageCount` | integer | Số câu hỏi sinh viên đã gửi thành công trong cửa sổ 5 giờ hiện tại. | `3` |
| `subscription.lastReset` | string | Thời gian reset hạn ngạch tin nhắn gần nhất. | `"2026-05-27T16:38:00.000Z"` |

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X GET http://localhost:8000/api/subscriptions/me \
  -H "Cookie: better-auth.session_token=your_student_session_cookie_token"
```

---

### 2. Nâng cấp gói dịch vụ (Tạo link thanh toán PayOS)
`POST /api/subscriptions/upgrade`

#### Mô tả
Tạo link thanh toán để nâng cấp gói dịch vụ tăng hạn mức hỏi đáp theo cửa sổ 5 giờ:
- **Gói SILVER:** Chi phí 10.000 VNĐ, tăng hạn mức lên **50** câu hỏi/5 giờ.
- **Gói GOLD:** Chi phí 20.000 VNĐ, tăng hạn mức lên **200** câu hỏi/5 giờ.

**Quy trình xử lý (Workflow):**
1. Server khởi tạo bản ghi `Transaction` trạng thái `PENDING` kèm mã số đơn hàng `payosOrderId` duy nhất.
2. Server gọi SDK PayOS truyền thông tin đơn hàng để sinh link checkout thanh toán chính thức.
3. **Cơ chế giả lập (Mock Mode):** Nếu hệ thống đang cấu hình mock credentials (chưa bật key PayOS thật), server tự động trả về link thanh toán giả lập có địa chỉ cổng dev: `http://localhost:3000/mock-payment` giúp sinh viên/tester dễ dàng thử nghiệm thanh toán thành công ngay lập tức mà không cần tài khoản thật.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Session Cookie Better Auth).
- **Content-Type:** `application/json`

#### Request Body (JSON)
| Tên Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `tier` | string | ✅ | Gói nâng cấp mong muốn: `"SILVER"` hoặc `"GOLD"`. | `"SILVER"` |
| `returnUrl` | string | ✅ | URL chuyển hướng về client khi người dùng thanh toán thành công. | `"http://localhost:3000/success"` |
| `cancelUrl` | string | ✅ | URL chuyển hướng về client khi người dùng hủy bỏ giao dịch. | `"http://localhost:3000/cancel"` |

**Ví dụ JSON Request Body:**
```json
{
  "tier": "SILVER",
  "returnUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/cancel"
}
```

#### Response Schema

**Thành công - 200 OK:**
```json
{
  "success": true,
  "checkoutUrl": "https://pay.payos.vn/web/123456",
  "transactionId": "trans-abc",
  "orderCode": 852194
}
```

**Thất bại - 400 Bad Request:**
*Trả về khi lựa chọn gói dịch vụ nâng cấp sai định dạng.*
```json
{
  "error": "Invalid tier. Choose SILVER or GOLD"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X POST http://localhost:8000/api/subscriptions/upgrade \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=your_student_session_cookie_token" \
  -d '{
    "tier": "SILVER",
    "returnUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'
```

---

### 3. Webhook nhận xác nhận thanh toán từ PayOS
`POST /api/subscriptions/webhook`

#### Mô tả
Cổng thanh toán PayOS gọi tự động (HTTP POST Webhook) về server để thông báo kết quả giao dịch.
**Quy trình xử lý bảo mật (Workflow):**
1. API tiến hành giải mã chữ ký bảo mật signature gửi kèm bằng thuật toán băm khớp mã `PAYOS_CHECKSUM_KEY`. Nếu phát hiện dữ liệu giả mạo hoặc sai lệch chữ ký, lập tức phản hồi lỗi `400 Bad Request`.
2. Kiểm tra xem giao dịch có thành công hay không (mã `code === "00"` hoặc `success === true`).
3. Truy vấn `Transaction` tương ứng đang ở trạng thái `PENDING` trong PostgreSQL.
4. Mở Transaction PostgreSQL, cùng lúc cập nhật Transaction thành `PAID`, cập nhật gói của User tương ứng lên `SILVER`/`GOLD`, thiết lập ngày hết hạn Premium là **30 ngày** kể từ thời điểm hiện tại và thiết lập hạn mức tối đa mới (50 hoặc 200).
5. **Cơ chế chống spam:** Trả về kết quả `200 OK` nhanh chóng để xác nhận với PayOS, kể cả khi xử lý gặp lỗi phát sinh phụ nhằm tránh việc cổng PayOS bắn lại webhook liên tục gây hao tổn tài nguyên server.

#### Yêu cầu
- **Authentication:** ❌ Không yêu cầu cookie (Bảo mật tự động qua xác thực chữ ký số).
- **Content-Type:** `application/json`

#### Request Body (JSON)
| Tên Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `success` | boolean | ✅ | Trạng thái thanh toán của đơn hàng. | `true` |
| `data` | object | ✅ | Chứa chi tiết đơn hàng: `orderCode`, `amount`, `code` giao dịch. | `{ "orderCode": 852194, "amount": 10000, "code": "00" }` |
| `signature` | string | ✅ | Chữ ký số mã hóa chống giả mạo của PayOS. | `"abc_secure_signature"` |

**Ví dụ JSON Request Body:**
```json
{
  "success": true,
  "data": {
    "orderCode": 852194,
    "amount": 10000,
    "code": "00"
  },
  "signature": "abc_secure_signature"
}
```

#### Response Schema

**Thành công - 200 OK:**
```json
{
  "success": true
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X POST http://localhost:8000/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "data": {
      "orderCode": 852194,
      "amount": 10000,
      "code": "00"
    },
    "signature": "mock_signature_test"
  }'
```
