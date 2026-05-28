# API Đặc Tả: Phân Hệ Trò Chuyện (Chatbot AI RAG)

Phân hệ này cho phép sinh viên lựa chọn ngữ cảnh môn học, quản lý các phiên hội thoại, lấy lịch sử tin nhắn và gửi câu hỏi để nhận câu trả lời dạng truyền luồng trực tiếp SSE (Server-Sent Events) từ Gemini LLM kết hợp dữ liệu slide bài giảng được trích xuất từ Qdrant Vector DB.

---

## 🔐 Cơ Chế Xác Thực (Authentication)
Tất cả các endpoint (trừ dev-login) yêu cầu đăng nhập tài khoản Sinh viên (`STUDENT`) hoặc Giảng viên/Admin thông qua Session Cookie từ Better Auth (`better-auth.session_token`).

---

## 📂 Các Endpoint Đặc Tả

### 1. Đăng nhập nhanh thử nghiệm E2E (Dev Mode)
`POST /api/chat/dev-login`

#### Mô tả
Endpoint hỗ trợ môi trường phát triển (Dev Mode). Khi gọi, hệ thống tự động gán session cho tài khoản sinh viên thử nghiệm (`user-test-e2e-id`), thiết lập vai trò `STUDENT`, tự tạo seed dữ liệu mẫu trong PostgreSQL và phản hồi đính kèm Cookie Header (`Set-Cookie`) giúp Client đăng nhập tức thì mà không cần qua giao diện đăng nhập Better Auth thông thường.

#### Yêu cầu
- **Authentication:** ❌ Không yêu cầu.
- **Content-Type:** `application/json`

#### Response Schema

**Thành công - 200 OK:**
```json
{
  "success": true,
  "user": {
    "id": "user-test-e2e-id",
    "name": "Sinh viên E2E Test",
    "email": "student-test@fpt.edu.vn",
    "role": "STUDENT"
  },
  "token": "cryptographic_jwt_session_token"
}
```

---

### 2. Lấy danh sách các môn học
`GET /api/chat/courses`

#### Mô tả
Lấy toàn bộ danh sách các môn học hiện có trong hệ thống để người dùng chọn lựa ngữ cảnh hội thoại.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Session Cookie Better Auth).

**Ví dụ JSON Response (200 OK):**
```json
{
  "courses": [
    {
      "id": "course-123",
      "code": "SWD392",
      "name": "Software Architecture and Design",
      "description": "Môn học thiết kế và kiến trúc phần mềm"
    }
  ]
}
```

---

### 3. Lấy tài liệu slide bài giảng theo môn học
`GET /api/chat/courses/{courseId}/documents`

#### Mô tả
Truy xuất danh sách tất cả các slide bài giảng PDF đã được nạp và lập chỉ mục RAG thành công thuộc về một môn học cụ thể.

#### Tham số Đường Dẫn (Path Parameters)
| Tên Tham Số | Loại | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `courseId` | string | ✅ | ID của môn học cần lấy slide bài giảng. |

**Ví dụ JSON Response (200 OK):**
```json
{
  "documents": [
    {
      "id": "doc-456",
      "name": "Chapter_1_Introduction.pdf",
      "fileUrl": "/uploads/1716382025_Chapter_1.pdf",
      "fileType": "pdf",
      "status": "SUCCESS",
      "courseId": "course-123",
      "createdAt": "2026-05-27T16:38:00.000Z"
    }
  ]
}
```

---

### 4. Lấy danh sách phiên chat của Sinh viên
`GET /api/chat/sessions`

#### Mô tả
Lấy toàn bộ các phiên hội thoại (phòng chat) của người dùng hiện tại, sắp xếp theo thứ tự thời gian tạo mới nhất lên đầu.

**Ví dụ JSON Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "session-789",
      "title": "Hỏi về SOLID principles",
      "userId": "user-123",
      "courseId": "course-123",
      "createdAt": "2026-05-27T16:38:00.000Z"
    }
  ]
}
```

---

### 5. Tạo một phiên chat mới
`POST /api/chat/sessions`

#### Mô tả
Khởi tạo một cuộc hội thoại mới. Có thể truyền lên `courseId` để thu hẹp phạm vi tìm kiếm RAG theo môn học đó, hoặc không truyền để thực hiện chat đa môn học toàn cục.

#### Request Body (JSON)
| Tên Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `courseId` | string | ❌ | ID môn học để khoanh vùng tài liệu RAG. | `"course-123"` |

**Ví dụ JSON Request Body:**
```json
{
  "courseId": "course-123"
}
```

**Ví dụ JSON Response (200 OK):**
```json
{
  "session": {
    "id": "session-789",
    "title": "Cuộc hội thoại mới",
    "userId": "user-123",
    "courseId": "course-123",
    "createdAt": "2026-05-27T16:38:00.000Z"
  }
}
```

---

### 6. Chi tiết phiên chat & lịch sử tin nhắn
`GET /api/chat/sessions/{sessionId}`

#### Mô tả
Lấy đầy đủ chi tiết lịch sử tin nhắn của cuộc hội thoại.
**Cơ chế Edge Case bảo vệ UI:** API tự động đối chiếu các nguồn trích dẫn slide (`citations`) đi kèm tin nhắn của trợ lý AI với dữ liệu slide thực tế trong PostgreSQL. Nếu slide gốc đã bị giảng viên xóa khỏi hệ thống, API tự động trả về thêm trường `"isDeleted": true` cho trích dẫn đó để giao diện Front-end có thể ẩn liên kết tải ảnh slide, tránh lỗi `404` Page Not Found cho sinh viên.

#### Tham số Đường Dẫn (Path Parameters)
| Tên Tham Số | Loại | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `sessionId` | string | ✅ | ID cuộc hội thoại cần lấy chi tiết. |

**Ví dụ JSON Response (200 OK):**
```json
{
  "session": {
    "id": "session-789",
    "title": "Hỏi về SOLID principles",
    "userId": "user-123",
    "courseId": "course-123",
    "createdAt": "2026-05-27T16:38:00.000Z",
    "messages": [
      {
        "id": "msg-1",
        "sender": "USER",
        "content": "SOLID là gì?",
        "createdAt": "2026-05-27T16:38:02.000Z"
      },
      {
        "id": "msg-2",
        "sender": "ASSISTANT",
        "content": "SOLID là 5 nguyên tắc thiết kế hướng đối tượng giúp lập trình viên viết code dễ bảo trì...",
        "citations": [
          {
            "documentId": "doc-456",
            "documentName": "Chapter_1_Introduction.pdf",
            "page": 3,
            "text": "SOLID principles stand for Single responsibility, Open-closed...",
            "isDeleted": false
          }
        ],
        "createdAt": "2026-05-27T16:38:05.000Z"
      }
    ]
  }
}
```

---

### 7. Đổi tên phiên chat
`PATCH /api/chat/sessions/{sessionId}`

#### Mô tả
Cập nhật lại tiêu đề (Title) cho cuộc trò chuyện.
#### Tham số Đường Dẫn
| Tên Tham Số | Loại | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `sessionId` | string | ✅ | ID cuộc hội thoại cần đổi tên. |

#### Request Body (JSON)
| Tên Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `title` | string | ✅ | Tiêu đề mới (không được để trống). | `"Hỏi về Liskov Substitution"` |

**Ví dụ JSON Response (200 OK):**
```json
{
  "success": true,
  "session": {
    "id": "session-789",
    "title": "Hỏi về Liskov Substitution",
    "userId": "user-123"
  }
}
```

---

### 8. Xóa phiên chat
`DELETE /api/chat/sessions/{sessionId}`

#### Mô tả
Xóa vĩnh viễn phiên chat và toàn bộ lịch sử tin nhắn liên quan khỏi cơ sở dữ liệu.

**Ví dụ JSON Response (200 OK):**
```json
{
  "success": true
}
```

---

### 9. Gửi tin nhắn & truyền luồng câu trả lời (SSE Stream)
`POST /api/chat/send`

#### Mô tả
Điểm cuối cốt lõi của cuộc hội thoại:
1. **Kiểm tra hạn mức:** Server tự động kiểm tra số lượng tin nhắn đã gửi trong cửa sổ 5 giờ hiện tại của sinh viên. Nếu vượt quá giới hạn gói dịch vụ (Basic tối đa 10 câu/5 giờ), server lập tức chặn và trả về lỗi `403 Forbidden` mã `"LIMIT_EXCEEDED"`.
2. **Truy vấn RAG:** Thực hiện tìm kiếm ngữ nghĩa thô trên Qdrant Vector DB để trích xuất các phân đoạn slide bài giảng PDF phù hợp nhất làm tài liệu tham khảo.
3. **Gọi AI Gemini & Streaming:** Gửi prompt kết hợp ngữ cảnh slide cùng lịch sử trò chuyện lên Gemini LLM, mở luồng kết nối **Server-Sent Events (SSE)** truyền luồng câu trả lời từng từ về phía Client thời gian thực để tạo hiệu ứng gõ chữ mượt mà.
4. **Tự động tóm tắt:** Nếu là câu hỏi đầu tiên của phòng chat, hệ thống tự động gọi Gemini phụ để tóm tắt câu hỏi thành một tiêu đề ngắn dưới 5 từ làm tên phòng chat.
5. **Lưu trữ:** Ghi nhận tin nhắn của sinh viên và câu trả lời kèm nguồn trích dẫn (`citations`) của AI vào database PostgreSQL.

#### Yêu cầu
- **Authentication:** ✅ Có yêu cầu (Session Cookie Better Auth).
- **Content-Type:** `application/json`

#### Request Body (JSON)
| Tên Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `sessionId` | string | ✅ | ID phiên chat đang trò chuyện. | `"session-789"` |
| `message` | string | ✅ | Nội dung câu hỏi cần chatbot giải đáp. | `"SOLID là gì?"` |

**Ví dụ JSON Request Body:**
```json
{
  "sessionId": "session-789",
  "message": "SOLID là gì?"
}
```

#### Response Schema

**Thành công - 200 OK (MIME: `text/event-stream`):**
Server sẽ mở kết nối luồng truyền trực tiếp và gửi các sự kiện sau liên tục:

1. **Sự kiện `message`:** Trả về các phân đoạn chữ của câu trả lời.
   ```text
   event: message
   data: {"chunk":"SOLID "}

   event: message
   data: {"chunk":"là "}
   ```
2. **Sự kiện `citations`:** Trả về nguồn trích dẫn khi câu trả lời hoàn tất.
   ```text
   event: citations
   data: {"citations":[{"documentId":"doc-456","documentName":"Chapter_1.pdf","page":3,"text":"SOLID principles...","isDeleted":false}]}
   ```
3. **Sự kiện `error`:** Trả về nếu gặp sự cố xử lý AI đột ngột.
   ```text
   event: error
   data: "Lỗi kết nối API Gemini"
   ```

**Thất bại - 403 Forbidden (Vượt hạn ngạch tin nhắn):**
```json
{
  "error": "LIMIT_EXCEEDED",
  "message": "Bạn đã dùng hết giới hạn câu hỏi trong 5 giờ hiện tại. Hãy nâng cấp gói dịch vụ (Silver/Gold) để tiếp tục hỏi chatbot!"
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=your_student_session_cookie_token" \
  -d '{
    "sessionId": "session-789",
    "message": "SOLID là gì?"
  }'
```
