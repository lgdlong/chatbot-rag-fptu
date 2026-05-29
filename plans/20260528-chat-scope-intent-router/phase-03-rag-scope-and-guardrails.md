# Phase 03: RAG Scope và Guardrails

## Mục tiêu

Giữ luồng RAG cho câu hỏi học thuật nhưng giới hạn chặt theo phạm vi session và relevance thật.

## Yêu cầu

- `/api/chat/send` phải verify session thuộc user hiện tại trước router và trước quota.
- RAG chỉ tìm trong scope session.
- Không gọi Gemini nếu không có chunk hợp lệ.
- Không để câu trả lời nhảy ra ngoài phạm vi tài liệu của session.
- Chỉ hỗ trợ citations cho `pdf`, `docx`, `pptx` trong phase này.
- Quota gate của `/api/chat/send` dùng cửa sổ reset `5 giờ`, không còn dùng mốc đổi ngày.

## Thay đổi thiết kế

- `RagService.retrieveAndGenerate` nhận session scope đã resolve, không chỉ `courseId | null`.
- Query `document_chunks` join `documents` với filter:
  - `documents.status = 'COMPLETED'`
  - `course_id` theo tập course được phép dùng trong session
  - nếu có `candidateDocumentIds`, thêm filter `document_id IN (...)`
- Thêm relevance threshold config, ví dụ `RAG_MAX_DISTANCE = 0.35`.

## Guardrails

- Nếu không có chunk sau khi filter threshold -> trả fallback `Mình không biết...`
- Nếu file chunk vật lý không đọc được hết -> chỉ dùng các chunk còn hợp lệ.
- Nếu document hoặc chunk biến mất trong lúc xử lý -> bỏ qua nguồn đó và tiếp tục với các nguồn còn hợp lệ.
- Nếu sau khi loại bỏ nguồn lỗi không còn context hợp lệ -> trả fallback `Mình không biết...`
- Chỉ gửi Gemini những context parts còn hợp lệ.

## Files chính

- `api/src/modules/rag/services/rag.service.ts`
- `api/src/modules/rag/services/gemini.service.ts`
- `api/src/config/env.ts` nếu thêm config threshold

## Bước triển khai

1. Chèn check ownership ở `/api/chat/send`: session không thuộc user hiện tại -> `403`.
2. Refactor API của `RagService` để nhận scope đa môn và `candidateDocumentIds` tùy chọn.
3. Cập nhật SQL truy xuất chunk theo danh sách course IDs và filter tài liệu cụ thể nếu có.
4. Thêm threshold và lọc kết quả trước khi dựng context.
5. Giữ fallback cố định khi không có context.
6. Rà lại logic `citations` để luôn phản ánh đúng document thật và chỉ chứa nguồn tài liệu text/pdf/pptx/docx.

## Success criteria

- Không còn sinh tên tài liệu không tồn tại trong DB.
- Câu hỏi học thuật chỉ dùng tài liệu trong scope session.
- Khi không đủ nguồn, bot trả đúng fallback thay vì bịa.
- Câu hỏi nhắm một file cụ thể không bị kéo nhầm chunk từ tài liệu khác cùng scope.
