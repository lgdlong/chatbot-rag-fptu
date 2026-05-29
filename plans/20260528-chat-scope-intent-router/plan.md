# Kế Hoạch: Chat Scope Nhiều Môn + Intent Router

## Tóm tắt

Mục tiêu là tách rõ hai luồng hỏi đáp:
- Câu hỏi metadata tài liệu đi SQL trực tiếp, không qua Gemini.
- Câu hỏi nội dung học thuật đi RAG, nhưng chỉ trong phạm vi session.

Phạm vi mặc định của session mới là toàn bộ tài liệu. Sinh viên có thể chọn một hay nhiều môn để thu hẹp phạm vi. Scope được gắn theo session, không đổi theo từng message.

## Quyết định chính

- Không đưa thêm framework mới như LangChain, LlamaIndex, Haystack trong pha này.
- Giữ backend Hono + Prisma + PostgreSQL/pgvector hiện có.
- Giữ `chat_sessions.course_id` làm trường legacy; session mới dùng `scopeMode` và danh sách `courseIds`.
- Metadata answers được dựng bằng template backend, `citations = []`.
- RAG chỉ gọi Gemini khi có chunk hợp lệ trong scope và đạt ngưỡng relevance.
- Giữ cơ chế quota chat hiện có nhưng đổi cửa sổ reset từ `1 ngày` sang `5 giờ`.

## Policy Decisions

- `ALL_COURSES` luôn được hiểu là toàn bộ tài liệu người dùng hiện tại được phép truy cập theo user/session/course, không phải toàn DB.
- Mọi request đi qua `/api/chat/send` đều tính quota nếu tạo được assistant response thành công, kể cả metadata, `SMALL_TALK`, `CLARIFY_INTENT`, `OUT_OF_SCOPE_SYSTEM_REQUEST`, và `SESSION_SCOPE_CHANGE`.
- Quota reset theo cửa sổ trượt `5 giờ` dựa trên `lastReset`; nếu thời điểm hiện tại cách `lastReset` ít nhất `5 giờ` thì `messageCount` được reset về `0` và `lastReset` cập nhật sang thời điểm mới.
- `SESSION_SCOPE_CHANGE` không được hỗ trợ inline qua chat trong pha này; bot chỉ hướng dẫn dùng UI tạo session mới hoặc chọn lại phạm vi.
- RAG có thể nhận thêm filter theo tài liệu cụ thể nếu router parse được tên file và resolve ra candidate documents trong scope.
- Citation trong pha này chỉ hỗ trợ tài liệu dạng `pdf`, `docx`, `pptx`; không hỗ trợ video và timestamp.

## Các pha triển khai

1. [Phase 01 - Session Scope và Data Model](./phase-01-session-scope-and-data-model.md)
   Trạng thái: `done`
2. [Phase 02 - Intent Router và Metadata Path](./phase-02-intent-router-and-metadata-path.md)
   Trạng thái: `done`
3. [Phase 03 - RAG Scope và Guardrails](./phase-03-rag-scope-and-guardrails.md)
   Trạng thái: `done`
4. [Phase 04 - Student UI và Session Flow](./phase-04-student-ui-and-session-flow.md)
   Trạng thái: `done`
5. [Phase 05 - Tests và Compatibility](./phase-05-tests-and-compatibility.md)
   Trạng thái: `done`

## Public API thay đổi

- `POST /api/chat/sessions`
  Từ `{ courseId?: string }`
  Sang `{ scopeMode: 'ALL_COURSES' | 'SELECTED_COURSES', courseIds?: string[] }`
  Trong pha chuyển tiếp, backend vẫn accept payload legacy `{ courseId?: string }`:
  - `courseId != null` -> map thành `SELECTED_COURSES` với 1 course
  - `courseId == null` -> map thành `ALL_COURSES`
  Khi frontend mới đã rollout ổn định, mới cân nhắc bỏ payload legacy ở pha sau.
- `GET /api/chat/sessions` và `GET /api/chat/sessions/:sessionId`
  Thêm `scopeMode` và `scopedCourses`
- `ChatSession` client type
  Bỏ phụ thuộc chính vào `courseId`, thay bằng `scopeMode` và `scopedCourses`

## Tiêu chí hoàn thành

- Hỏi “hiện có những tài liệu nào” trả danh sách thật từ SQL trong đúng scope session.
- Hỏi nội dung ngoài tài liệu trả fallback “Mình không biết...”, không sinh tên file ảo.
- Session mới hỗ trợ `ALL_COURSES` hoặc nhiều `courseIds`.
- Session legacy vẫn đọc và chat tiếp được.
- API và UI hiển thị rõ phạm vi session hiện tại.

## Ghi chú triển khai

- Không cleanup dữ liệu cũ trong plan này.
- Không cho đổi scope giữa chừng trong cùng một session.
- Relevance threshold nên đưa vào config backend, mặc định `0.35`.
- `DOCUMENT_LIST` mặc định trả tối đa `20` kết quả đầu tiên kèm tổng số kết quả phù hợp.
- Hạn mức gói được hiểu theo `5 giờ`: `BASIC = 10`, `SILVER = 50`, `GOLD = 200`.
- Trong domain hiện tại, `ALL_COURSES` được resolve thành toàn bộ course có tài liệu mà user hiện tại được backend cho phép thấy trong chat; helper resolve scope phải là nguồn sự thật duy nhất cho rule này.
