# Review Report: Edge Cases Chưa Cover Trong Chat Scope + Intent Router Plan

## Mục tiêu

Rà soát plan hiện tại để tìm các edge case còn thiếu hoặc chưa khóa quyết định đủ chặt, đặc biệt ở các điểm có thể gây sai hành vi, hở quyền truy cập, hoặc phát sinh nợ kỹ thuật khi implement.

## Findings

### 1. Trạng thái sau khi vá plan

Mức độ: `info`

- Ownership check trước router/quota đã được thêm vào phase 03 và phase 05.
- Access-filter cho `ALL_COURSES` đã được thêm vào phase 01 và plan root.
- Quota policy đã được chốt ở plan root, phase 02, phase 03, phase 05.
- Citation scope đã được khóa là `pdf/docx/pptx`.

Những finding bên dưới chỉ còn giá trị với các khoảng hở chưa được vá tiếp trong lần review này.

### 2. Thiếu chặn quyền gửi message vào session không thuộc user

Mức độ: `high`

- Hiện code `POST /api/chat/send` chưa verify `chatSession.userId === session.user.id` trước khi xử lý message.
- Plan chưa ghi rõ phải thêm check này vào flow mới.
- Nếu bỏ sót, user có thể gửi message vào session của người khác nếu biết `sessionId`.

Nơi cần vá:
- `phase-03-rag-scope-and-guardrails.md`
- `phase-05-tests-and-compatibility.md`

Quyết định cần thêm:
- Mọi nhánh trong `/api/chat/send` phải chặn `403` nếu session không thuộc user hiện tại, trước router và trước quota.

### 3. `ALL_COURSES` chưa được ràng bởi access filter thật

Mức độ: `high`

- Plan đang dùng khái niệm “toàn bộ tài liệu”, nhưng chưa khóa rõ là “toàn bộ tài liệu user được phép thấy”.
- Code hiện mới có các ràng buộc theo user/session/course, nên access control thực tế phải bám theo các lớp này.
- Nếu plan không chốt access layer từ đầu, `ALL_COURSES` rất dễ biến thành truy vấn toàn DB thay vì toàn bộ tài liệu user được phép truy cập.

Nơi cần vá:
- `phase-01-session-scope-and-data-model.md`
- `phase-03-rag-scope-and-guardrails.md`

Quyết định cần thêm:
- Session scope resolve phải trả về tập `courseIds` đã qua access control.
- Không có nhánh nào query `documents` hoặc `document_chunks` trực tiếp bằng “all rows”.

### 4. Chưa định nghĩa intent nào tính quota

Mức độ: `high`

- Metadata path, `SMALL_TALK`, `CLARIFY_INTENT`, `SESSION_SCOPE_SHOW`, `CITATION_LOOKUP` đều có thể đi qua `/api/chat/send`.
- Plan chưa chốt:
  - intent nào bị trừ quota
  - intent nào không trừ quota
  - khi stream lỗi giữa chừng có rollback hay không

Nơi cần vá:
- `plan.md`
- `phase-02-intent-router-and-metadata-path.md`
- `phase-05-tests-and-compatibility.md`

Quyết định cần thêm:
- Mọi request đi qua `/api/chat/send` tạo được assistant response thành công đều tính quota.
- Request lỗi hệ thống hoặc không tạo được assistant response thì không tăng quota.
- Quota reset theo cửa sổ `5 giờ` dựa trên `lastReset`, không theo ngày lịch.

### 5. Chưa khóa document-level filter cho RAG

Mức độ: `high`

- Phase 02 có intent kiểu `trong file CP2 có yêu cầu gì`, nhưng Phase 03 chưa nêu rõ cơ chế filter theo `documentId` hoặc `documentName`.
- Nếu implementer chỉ lọc theo scope session, retrieval có thể kéo nhầm chunk từ tài liệu khác.

Nơi cần vá:
- `phase-03-rag-scope-and-guardrails.md`

Quyết định cần thêm:
- `parsedEntities.documentNameQuery` phải được resolve thành `documentIds[]` bằng SQL query có giới hạn trong scope hiện tại, ưu tiên tên chuẩn hóa gần đúng và `ILIKE`, không dùng `LIKE` mù toàn DB.
- `RagService` phải hỗ trợ filter thêm theo `documentIds[]` bên cạnh `courseIds[]`.

### 6. Confidence threshold cho router chưa được chốt

Mức độ: `medium`

- Phase 02 có `confidence` trong output typed result, nhưng không định nghĩa khi nào route sang `CLARIFY_INTENT`.
- Nếu thiếu điểm này, implementer có thể đẩy quá nhiều câu mơ hồ sang `RAG_QA`.

Nơi cần vá:
- `phase-02-intent-router-and-metadata-path.md`

Quyết định cần thêm:
- Nếu không đủ tín hiệu metadata rõ, không có referent từ history, và không có keyword học thuật mạnh, route `CLARIFY_INTENT`.
- Không dùng `RAG_QA` như default mù.

### 7. `DOCUMENT_LIST` chưa có giới hạn số lượng và hành vi khi dữ liệu lớn

Mức độ: `medium`

- Với scope rộng, trả toàn bộ danh sách tài liệu có thể làm response quá dài, khó đọc, và phình lịch sử chat.
- Plan chưa có pagination, hard limit, hoặc “summary + ask to narrow down”.

Nơi cần vá:
- `phase-02-intent-router-and-metadata-path.md`
- `phase-05-tests-and-compatibility.md`

Quyết định cần thêm:
- `DOCUMENT_LIST` mặc định `LIMIT 20`.
- Nếu nhiều hơn giới hạn, trả `20 tài liệu đầu tiên + tổng count`.

### 8. Chưa cover input không dấu, typo, và mixed language

Mức độ: `medium`

- User thực tế có thể nhập không dấu hoặc gõ sai.
- Plan hiện nói không bỏ dấu tiếng Việt trong pha này; điều đó có thể làm router hụt quá nhiều case metadata phổ biến.

Nơi cần vá:
- `phase-02-intent-router-and-metadata-path.md`

Quyết định cần thêm:
- Normalize thêm bản không dấu song song để match keyword metadata.
- Cho phép fuzzy match nhẹ cho document name và course name, có giới hạn để tránh false positive.

### 9. `SESSION_SCOPE_CHANGE` chưa có contract response rõ

Mức độ: `medium`

- Phase 02 nói router nhận diện intent này nhưng chưa khóa:
  - có lưu user message không
  - có tạo assistant response mẫu nào
  - có yêu cầu UI mở scope picker hay không

Nơi cần vá:
- `phase-02-intent-router-and-metadata-path.md`
- `phase-04-student-ui-and-session-flow.md`

Quyết định cần thêm:
- Không hỗ trợ đổi scope inline qua chat trong phase này.
- Lưu user message bình thường.
- Assistant trả template cố định hướng dẫn dùng UI đổi/tạo session mới.
- Vẫn tính quota như mọi request thành công khác trong cửa sổ `5 giờ` hiện tại.

### 10. Chưa khóa behavior cho citations đa phương thức

Mức độ: `medium`

- Tài liệu trước đó còn lẫn giữa citation cho PDF/page và video/timestamp.
- Nếu không khóa lại sớm, implementer rất dễ thiết kế type citation rộng hơn phạm vi project thực tế.

Nơi cần vá:
- `phase-03-rag-scope-and-guardrails.md`
- `phase-05-tests-and-compatibility.md`

Quyết định cần thêm:
- Phase này chỉ hỗ trợ citations cho `pdf`, `docx`, `pptx`.
- Video và timestamp là out-of-scope cho project hiện tại.

### 11. Chưa cover race condition giữa chat và document lifecycle

Mức độ: `medium`

- Tài liệu có thể bị lecturer xóa hoặc đổi trạng thái giữa lúc metadata query, retrieval, đọc chunk file, và lưu citations.
- Plan mới cover một phần “file chunk đọc fail”, chưa cover test và expected fallback ở lifecycle đầy đủ.

Nơi cần vá:
- `phase-03-rag-scope-and-guardrails.md`
- `phase-05-tests-and-compatibility.md`

Quyết định cần thêm:
- Nếu document/chunk biến mất giữa chừng, bỏ qua nguồn đó.
- Nếu không còn nguồn hợp lệ nào sau cùng, trả fallback `Mình không biết...`

### 12. Duplicate names across courses chưa đủ rõ

Mức độ: `low`

- Trong `ALL_COURSES`, cùng một tên ngắn như `CP1` có thể khớp nhiều môn.
- Plan có nói trả ứng viên, nhưng chưa yêu cầu hiển thị `course code/name` trong candidate list.

Nơi cần vá:
- `phase-02-intent-router-and-metadata-path.md`

Quyết định cần thêm:
- Candidate list phải hiển thị ít nhất `documentName + courseCode`.

### 13. Test plan chưa phản ánh taxonomy intent mới

Mức độ: `low`

- Phase 05 vẫn thiên về list/count/status/RAG cơ bản.
- Chưa có test cho:
  - `SESSION_SCOPE_SHOW`
  - `SESSION_SCOPE_CHANGE`
  - `COURSE_LIST`
  - `CITATION_LOOKUP`
  - `OUT_OF_SCOPE_SYSTEM_REQUEST`
  - `SMALL_TALK`
  - `CLARIFY_INTENT`

Nơi cần vá:
- `phase-05-tests-and-compatibility.md`

Quyết định cần thêm:
- Bổ sung test matrix theo nhóm intent, không chỉ theo nhóm feature.

## Khuyến nghị cập nhật plan

1. Vá ngay các vấn đề `high` vào phase 02, 03, 05 trước khi implement.
2. Bổ sung một mục `Policy Decisions` ngắn ở `plan.md` cho:
   - access scope
   - quota policy
   - router confidence fallback
   - document-level filter behavior
3. Mở rộng phase 05 thành test matrix theo intent và failure mode, không chỉ theo flow chính.

## Kết luận

Plan hiện đã gần decision-complete hơn bản đầu, nhưng vẫn cần rà tiếp nếu muốn “implementation-ready” tuyệt đối. Các vùng còn cần đặc biệt giữ chặt là contract router, contract schema/migration, và rollout compatibility cho API session.
