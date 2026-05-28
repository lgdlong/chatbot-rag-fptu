# API Đặc Tả: Quản Lý Tài Liệu & RAG Ingestion

Phân hệ này dành riêng cho Giảng viên (Lecturer) và Quản trị viên (Admin) quản lý slides bài giảng, giáo trình môn học dưới dạng PDF, kích hoạt tiến trình nạp dữ liệu (RAG Ingestion) vào Vector DB để phục vụ chatbot.

---

## 🔐 Cơ Chế Xác Thực (Authentication)
- **Tải lên & Xóa tài liệu:** Yêu cầu đăng nhập tài khoản Giảng viên (`LECTURER`) hoặc Quản trị viên (`ADMIN`) thông qua Session Cookie từ Better Auth (`better-auth.session_token`).
- **Webhook nội bộ (Go worker):** Yêu cầu đính kèm Bearer Token chứa giá trị bí mật `INTERNAL_API_KEY` trong request header.

---

## 📂 Các Endpoint Đặc Tả

### 1. Giảng viên tải lên slide/tài liệu (PDF)
`POST /api/courses/{courseId}/documents`

#### Mô tả
Tải một tệp tin bài giảng PDF (dung lượng tối đa 50MB theo yêu cầu SRS) lên hệ thống môn học cụ thể. 
**Quy trình xử lý (Workflow):**
1. Server ghi tệp PDF vào thư mục `./uploads/` trên đĩa cục bộ.
2. Tạo bản ghi `Document` trong database PostgreSQL ở trạng thái `PENDING`.
3. Đóng gói Payload và đẩy Job vào hàng đợi Redis `rag:ingestion:queue` bằng lệnh `LPUSH`.
4. Go Ingestion Worker tiếp nhận Job, phân tách slide, trích xuất hình ảnh, tính toán vector embedding (model `BAAI/bge-vi-base`) và nạp dữ liệu vào Qdrant Vector DB.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Session Cookie Better Auth).
- **Content-Type:** `multipart/form-data`

#### Tham số Đường Dẫn (Path Parameters)
| Tên Tham Số | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `courseId` | string | ✅ | ID của môn học cần tải slide bài giảng lên. | `"course-123"` |

#### Tham số Truy Vấn (Query Parameters)
*Không có.*

#### Request Payload (Multipart Form)
| Tên Trường | Loại | Bắt buộc | Định dạng | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `file` | file | ✅ | Binary (.pdf) | Slide bài giảng hoặc giáo trình PDF (dưới 50MB). |

#### Response Schema

**Thành công - 200 OK:**
*Trả về khi lưu file thành công và đã đưa vào hàng đợi Redis thành công.*

```json
{
  "success": true,
  "document": {
    "id": "doc-456",
    "name": "Chapter_1_Introduction.pdf",
    "status": "PROCESSING"
  }
}
```

*Mô tả chi tiết các trường trả về (Success Response):*
| Trường | Loại | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- |
| `success` | boolean | Trạng thái xử lý của API (`true`). | `true` |
| `document.id` | string | ID duy nhất của tài liệu vừa tạo trong PostgreSQL. | `"doc-456"` |
| `document.name` | string | Tên file PDF gốc do người dùng tải lên. | `"Chapter_1_Introduction.pdf"` |
| `document.status` | string | Trạng thái hiện tại của tiến trình nạp RAG (`"PROCESSING"`). | `"PROCESSING"` |

---

**Thất bại - 400 Bad Request:**
*Trả về khi người dùng không chọn file, tệp tin tải lên không phải PDF hoặc dung lượng vượt giới hạn 50MB.*

```json
{
  "error": "Unsupported file format. Please export your slide or document to PDF format before uploading."
}
```

**Thất bại - 401 Unauthorized:**
*Trả về khi người dùng chưa đăng nhập hoặc session cookie đã hết hạn.*

```json
{
  "error": "Unauthorized"
}
```

**Thất bại - 500 Internal Server Error:**
*Trả về khi xảy ra lỗi ghi file lên đĩa hoặc lỗi kết nối hàng đợi Redis.*

```json
{
  "error": "Failed to queue ingestion job"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X POST http://localhost:8000/api/courses/course-123/documents \
  -H "Cookie: better-auth.session_token=your_lecturer_session_cookie_token_here" \
  -F "file=@/path/to/Chapter_1_Introduction.pdf"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "document": {
    "id": "doc-456",
    "name": "Chapter_1_Introduction.pdf",
    "status": "PROCESSING"
  }
}
```

---

### 2. Xóa tài liệu slide giảng dạy
`DELETE /api/courses/{courseId}/documents/{documentId}`

#### Mô tả
Xóa vĩnh viễn tài liệu khỏi hệ thống.
**Quy trình xử lý (Workflow):**
1. Server kiểm tra quyền sở hữu môn học của giảng viên.
2. Kiểm tra trạng thái tài liệu trong PostgreSQL. Nếu đang `PENDING` hoặc `PROCESSING`, API từ chối xóa để tránh xung đột dữ liệu.
3. Tiến hành xóa tệp PDF gốc lưu trên đĩa cứng.
4. Quét thư mục ảnh chunk `./uploads/chunks/` và xóa toàn bộ tệp ảnh phân trang của tài liệu.
5. Gọi `DocumentRepository.delete` để dọn dẹp bản ghi trong PostgreSQL và kích hoạt dọn dẹp các Vector embedding trong Qdrant.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Session Cookie Better Auth).
- **Content-Type:** `application/json`

#### Tham số Đường Dẫn (Path Parameters)
| Tên Tham Số | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `courseId` | string | ✅ | ID môn học chứa slide bài giảng. | `"course-123"` |
| `documentId` | string | ✅ | ID tài liệu cần xóa vĩnh viễn. | `"doc-456"` |

#### Request Schema
*Không có (Phương thức DELETE không nhận body).*

#### Response Schema

**Thành công - 200 OK:**
*Trả về khi xóa thành công tất cả tài nguyên đĩa cứng và DB liên quan.*

```json
{
  "success": true
}
```

**Thất bại - 401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**Thất bại - 403 Forbidden:**
*Trả về khi tài khoản không có quyền truy cập hoặc quản trị môn học này.*
```json
{
  "error": "Unauthorized to access this course"
}
```

**Thất bại - 409 Conflict:**
*Trả về khi tài liệu đang trong tiến trình xử lý RAG, chưa hoàn tất.*
```json
{
  "error": "Document is still processing and cannot be deleted"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X DELETE http://localhost:8000/api/courses/course-123/documents/doc-456 \
  -H "Cookie: better-auth.session_token=your_lecturer_session_cookie_token_here"
```

**Expected Response (200 OK):**
```json
{
  "success": true
}
```

---

### 3. Webhook cập nhật tiến độ Ingestion (Nội bộ)
`PATCH /api/internal/documents/{id}`

#### Mô tả
Endpoint nội bộ bảo mật dành riêng cho Go Ingestion Worker cập nhật tình trạng xử lý slide (Thành công/Thất bại) về cho API Server sau khi hoàn tất chia chunk, trích xuất ảnh phân trang và nạp chỉ mục thành công vào Qdrant.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Bearer Token chứa `INTERNAL_API_KEY`).
- **Content-Type:** `application/json`

#### Tham số Đường Dẫn (Path Parameters)
| Tên Tham Số | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | ✅ | ID tài liệu cần cập nhật trạng thái. | `"doc-456"` |

#### Request Schema (JSON)
| Tên Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `status` | string | ✅ | Trạng thái xử lý mới (`"SUCCESS"` hoặc `"FAILED"`). | `"SUCCESS"` |
| `error` | string | ❌ | Lý do chi tiết nếu trạng thái xử lý thất bại. | `"Lỗi trích xuất trang 5"` |

**Ví dụ JSON Request Body (Thành công):**
```json
{
  "status": "SUCCESS"
}
```

**Ví dụ JSON Request Body (Thất bại):**
```json
{
  "status": "FAILED",
  "error": "pdfcpu split failed: File is password protected"
}
```

#### Response Schema

**Thành công - 200 OK:**
```json
{
  "success": true
}
```

**Thất bại - 401 Unauthorized:**
*Trả về khi Authorization Header rỗng hoặc Bearer Token không khớp với INTERNAL_API_KEY.*
```json
{
  "error": "Unauthorized"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X PATCH http://localhost:8000/api/internal/documents/doc-456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_internal_api_key_here" \
  -d '{
    "status": "SUCCESS"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true
}
```
