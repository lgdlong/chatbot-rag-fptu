# API Documentation - File Templates (Chatbot RAG FPTU)

Biểu mẫu mẫu để AI Agent áp dụng khi viết hoặc cập nhật các tệp tài liệu đặc tả API phân hệ của dự án.

---

## 🏥 Biểu mẫu Tệp Đặc Tả Phân Hệ (Module API File Template)

Mỗi tệp đặc tả module (ví dụ: `00_documents.md`, `00_chat.md`) nên tuân thủ biểu mẫu chuẩn hóa sau:

```markdown
# API Đặc Tả: Phân Hệ {Tên Phân Hệ Tiếng Việt} ({Tên Tiếng Anh})

{Mô tả ngắn gọn khoảng 2-3 câu về vai trò và nghiệp vụ cốt lõi của phân hệ này trong hệ thống}

---

## 🔐 Cơ Chế Xác Thực (Authentication)
- **Hình thức xác thực:** {Better Auth Cookie-based Session / Bearer Token / Không cần}
- **Yêu cầu phân quyền:** {STUDENT / LECTURER / ADMIN / Nội bộ}

---

## 📂 Các Endpoint Đặc Tả

### 1. {Tên Hành Động Ví Dụ: Tải lên slide bài giảng}
`{HTTP_METHOD} /api/{đường-dẫn-endpoint}`

- **Mô tả:** {Giải thích chi tiết nghiệp vụ bằng Tiếng Việt}
- **Xác thực:** {Có/Không}
- **Tham số Đường Dẫn (Path Parameters):** *{Bỏ qua nếu không có}*

| Tên Tham Số | Loại | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | string | ✅ | Mã định danh UUID. |

- **Tham số Truy Vấn (Query Parameters):** *{Bỏ qua nếu không có}*

| Tên Tham Số | Loại | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `limit` | integer | `10` | Giới hạn số lượng bản ghi trả về. |

- **Request Body (JSON / Multipart):** *{Bỏ qua nếu phương thức là GET/DELETE không nhận body}*

| Trường | Loại | Bắt buộc | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- | :--- |
| `title` | string | ✅ | Tiêu đề của tài nguyên. | `"Chương 1"` |

**Ví dụ JSON Request Body:**
```json
{
  "title": "Chương 1"
}
```

- **Mã phản hồi (Response):**

**Ví dụ JSON Response Thành Công (200 OK / 201 Created):**
```json
{
  "success": true,
  "id": "uuid-123456"
}
```

**Ví dụ JSON Response Thất Bại (400 Bad Request / 401 Unauthorized / 409 Conflict):**
```json
{
  "error": "Mô tả nguyên nhân xảy ra lỗi chi tiết"
}
```
```

---

## 🏥 Biểu mẫu Đặc Tả Cho Luồng Truyền SSE (SSE Stream Endpoint Template)

Đối với các endpoint truyền luồng SSE (như `/api/chat/send`), sử dụng biểu mẫu đặc tả luồng sự kiện sau trong phần Response:

```markdown
- **Mã phản hồi (Response):**
  - **`200 OK`**: Thành công, trả về MIME `text/event-stream`.

- **Cơ chế truyền luồng (Stream Event Format):**
  Trong quá trình kết nối hoạt động, server gửi liên tiếp các dòng sự kiện (events):

  1. **Sự kiện `message`:** Gửi từng chunk văn bản do AI sinh ra.
     ```text
     event: message
     data: {"chunk": "Văn bản"}
     ```

  2. **Sự kiện `citations`:** Gửi mảng trích dẫn nguồn khi hoàn thành câu trả lời.
     ```text
     event: citations
     data: {"citations": [{"documentId": "doc-1", "page": 2}]}
     ```

  3. **Sự kiện `error`:** Gửi thông báo lỗi nếu xảy ra sự cố đột ngột phía AI.
     ```text
     event: error
     data: "Lỗi kết nối API Gemini"
     ```
```

---

## 🔗 Liên kết Hữu ích
- [Writing Guidelines](./writing-guidelines.md)
- [Quality Checklist](./quality-checklist.md)
- [Agent Instructions](./agent-instructions.md)
