# Phase 02: Intent Router và Metadata Path

## Mục tiêu

Tách toàn bộ câu hỏi metadata, điều hướng phạm vi, trạng thái hệ thống tài liệu và các câu hỏi không nên đi RAG ra khỏi Gemini/Retrieval path để loại bỏ hallucination và giảm query vector vô nghĩa.

## Nguyên tắc router

- Dùng rule-based router, không dùng LLM router ở pha này.
- Router phải deterministic, có thứ tự ưu tiên rõ ràng, cùng input phải ra cùng kết quả.
- Router chạy trước mọi bước tạo embedding, truy vấn `document_chunks`, hoặc gọi Gemini.
- Router không chỉ chia `metadata` và `RAG`, mà còn phải bao phủ các intent điều hướng, làm rõ phạm vi, citation, và unsupported request.

## Thứ tự ưu tiên match

Router phải match theo thứ tự từ đặc thù nhất đến tổng quát nhất:

1. `SESSION_SCOPE_CHANGE`
2. `SESSION_SCOPE_SHOW`
3. `DOCUMENT_STATUS`
4. `DOCUMENT_EXISTENCE_CHECK`
5. `DOCUMENT_LIST`
6. `DOCUMENT_COUNT`
7. `DOCUMENT_FILTERED_LIST`
8. `DOCUMENT_LATEST_UPLOADS`
9. `DOCUMENT_PROCESSING_SUMMARY`
10. `COURSE_LIST`
11. `COURSE_SCOPE_SUGGESTION`
12. `CITATION_LOOKUP`
13. `OUT_OF_SCOPE_SYSTEM_REQUEST`
14. `SMALL_TALK`
15. `CLARIFY_INTENT`
16. `RAG_QA`

Lý do của thứ tự này:
- Các câu đổi scope hoặc hỏi scope hiện tại phải được chặn trước, nếu không sẽ bị nhầm sang metadata hoặc RAG.
- Các câu có tên file cụ thể phải vào `DOCUMENT_STATUS` hoặc `DOCUMENT_EXISTENCE_CHECK` trước khi rơi xuống `DOCUMENT_LIST`.
- `SMALL_TALK` phải đứng sau các metadata intents để tránh câu như “cho mình hỏi hiện có những tài liệu nào” bị ăn vào small-talk.
- `CLARIFY_INTENT` phải đứng trước `RAG_QA` để chặn các câu mơ hồ, thiếu referent, hoặc confidence thấp.
- `RAG_QA` chỉ là fallback có kiểm soát sau khi đã loại trừ ambiguity, không phải default mù.

## Taxonomy intent đầy đủ

### 1. Metadata intents

- `DOCUMENT_LIST`
  Liệt kê tất cả tài liệu trong scope hiện tại.
  Ví dụ: `hiện có những tài liệu nào`, `liệt kê file`, `danh sách tài liệu`.

- `DOCUMENT_FILTERED_LIST`
  Liệt kê tài liệu theo điều kiện hẹp.
  Ví dụ: `các file PDF`, `tài liệu của môn SWD392`, `những file đang processing`, `file đã hoàn thành`.

- `DOCUMENT_COUNT`
  Đếm tổng số tài liệu hoặc số tài liệu theo điều kiện.
  Ví dụ: `có bao nhiêu tài liệu`, `mấy file PDF`, `bao nhiêu tài liệu completed`.

- `DOCUMENT_STATUS`
  Hỏi trạng thái xử lý của một hoặc nhiều tài liệu cụ thể.
  Ví dụ: `file CP1 đang trạng thái gì`, `Slide X đã xử lý xong chưa`, `file nào bị failed`.

- `DOCUMENT_EXISTENCE_CHECK`
  Kiểm tra một tài liệu có tồn tại trong scope hay không.
  Ví dụ: `có file CP2 không`, `đã có slide chương 3 chưa`.

- `DOCUMENT_LATEST_UPLOADS`
  Hỏi các tài liệu mới nhất theo thời gian.
  Ví dụ: `tài liệu mới tải lên gần đây`, `file upload mới nhất là gì`.

- `DOCUMENT_PROCESSING_SUMMARY`
  Hỏi tóm tắt hàng đợi xử lý ingest.
  Ví dụ: `có bao nhiêu file đang xử lý`, `file nào đang pending`, `còn tài liệu nào failed không`.

### 2. Scope và course intents

- `COURSE_LIST`
  Hỏi danh sách môn học đang có tài liệu.
  Ví dụ: `hiện có những môn nào`, `danh sách môn học`.

- `SESSION_SCOPE_SHOW`
  Hỏi session hiện tại đang chat trong phạm vi nào.
  Ví dụ: `tôi đang hỏi trong môn nào`, `scope hiện tại là gì`, `đang tìm trong những môn nào`.

- `SESSION_SCOPE_CHANGE`
  Yêu cầu đổi phạm vi trong lúc chat.
  Ví dụ: `chỉ tìm trong môn SWD392`, `mở rộng sang tất cả môn`, `chuyển sang môn EXE101`, `thêm môn MAD101 vào phạm vi`.

- `COURSE_SCOPE_SUGGESTION`
  User hỏi một câu metadata hoặc học thuật có vẻ cần thu hẹp phạm vi nhưng session đang quá rộng.
  Ví dụ: `file CP1 là của môn nào`, `quicksort nằm trong môn nào`.

### 3. Citation và history intents

- `CITATION_LOOKUP`
  Hỏi lại về nguồn trích dẫn đã có hoặc yêu cầu xác định tài liệu/trang từ message trước.
  Ví dụ: `ý vừa rồi ở tài liệu nào`, `trang mấy`, `nguồn ở đâu`.

Intent này không nên đi query metadata thuần nếu trong session đã có citations gần nhất đủ dùng. Phải ưu tiên đọc citation từ lịch sử chat gần nhất trước, chỉ fallback sang SQL nếu cần xác minh tài liệu có còn tồn tại hay không.

### 4. Non-RAG but non-metadata intents

- `SMALL_TALK`
  Chào hỏi, cảm ơn, xác nhận ngắn.
  Ví dụ: `chào`, `cảm ơn`, `ok`.

- `OUT_OF_SCOPE_SYSTEM_REQUEST`
  Yêu cầu ngoài khả năng chatbot tài liệu.
  Ví dụ: `xóa file này giúp tôi`, `upload tài liệu mới`, `đổi gói dịch vụ`, `mở quyền giảng viên`.

Không vào RAG. Trả lời rằng chatbot chat không hỗ trợ thao tác này và hướng người dùng đến UI/chức năng phù hợp.

- `CLARIFY_INTENT`
  Dùng khi router không phân biệt được user đang hỏi metadata hay nội dung học thuật.
  Ví dụ: `tài liệu này nói gì`, `cái đó ở đâu`, `file nào`.

## Contract output của router

Router phải trả về typed result tối thiểu gồm:

- `intent`
- `confidence`: `high | medium | low`
- `parsedEntities`
- `reasonCode`: lý do route chính để debug/log, ví dụ:
  - `metadata_keyword_match`
  - `document_name_match`
  - `scope_change_phrase`
  - `citation_followup`
  - `insufficient_referent`
  - `fallback_rag`

Rule bắt buộc:

- Nếu `confidence = low` -> route `CLARIFY_INTENT`, không route `RAG_QA`.
- Nếu thiếu referent từ history cho câu phụ thuộc ngữ cảnh như `file đó`, `trang đó`, `ý vừa rồi` -> route `CLARIFY_INTENT`.
- Chỉ route `RAG_QA` khi có tín hiệu học thuật đủ mạnh hoặc parse được yêu cầu đọc nội dung tài liệu.

## Quy tắc nhận diện

### Nhóm tín hiệu metadata mạnh

- Từ khóa liệt kê:
  `danh sách`, `liệt kê`, `có những`, `gồm những`, `bao gồm những`.
- Từ khóa đếm:
  `bao nhiêu`, `mấy`, `tổng số`, `số lượng`.
- Từ khóa file/tài liệu:
  `tài liệu`, `file`, `pdf`, `slide`, `doc`, `ppt`.
- Từ khóa trạng thái:
  `trạng thái`, `processing`, `pending`, `completed`, `failed`, `đã xử lý`, `đã upload`, `đã nạp`.
- Từ khóa thời gian:
  `mới nhất`, `gần đây`, `vừa tải lên`, `upload gần nhất`.

### Nhóm tín hiệu scope

- `trong môn`, `chỉ trong`, `toàn bộ môn`, `tất cả môn`, `thêm môn`, `bỏ môn`, `đổi sang môn`.

### Nhóm tín hiệu RAG

- `giải thích`, `tóm tắt`, `nội dung`, `ý nghĩa`, `định nghĩa`, `so sánh`, `tại sao`, `như thế nào`, `ở trang nào`, `thuật toán`, `checkpoint yêu cầu gì`.

## Chuẩn hóa input trước khi match

Trước khi route, phải normalize:

- lowercase
- trim khoảng trắng
- bỏ lặp khoảng trắng
- chuẩn hóa dấu câu
- map từ đồng nghĩa phổ biến:
  - `tl` -> `tài liệu`
  - `file pdf` -> `pdf`
  - `slide` và `ppt` vẫn giữ như token riêng
- giữ nguyên tên file gốc nếu có phần mở rộng như `.pdf`
- tạo thêm một bản normalize không dấu để match keyword và course/document query
- cho phép fuzzy match nhẹ cho tên tài liệu hoặc môn học, nhưng chỉ trong scope hiện tại và với số ứng viên trả về có giới hạn

Match tiếng Việt có dấu trước, sau đó fallback sang bản không dấu nếu không có match rõ.

## Metadata path theo từng intent

## Response contract cho non-RAG intents

Mọi non-RAG intent đi qua `/api/chat/send` phải dùng chung assistant envelope ở mức logic:

- lưu `USER` message như hiện tại
- tạo đúng 1 `ASSISTANT` message text hoàn chỉnh
- `citations = []` cho mọi metadata/non-RAG intent trong phase này
- không gọi Gemini để rephrase lại response metadata

Template response phải deterministic theo intent, không sinh thêm dữ kiện ngoài DB/session/history.

### `DOCUMENT_LIST`

- Query `documents` trong scope hiện tại.
- Mặc định chỉ trả `status = COMPLETED`.
- Sắp xếp `created_at DESC`.
- `LIMIT 20` mặc định.
- Nếu số lượng lớn hơn `20`, trả `20` kết quả đầu tiên kèm tổng số kết quả phù hợp và gợi ý thu hẹp phạm vi.
- Trả tên tài liệu, loại file, môn tương ứng nếu scope là `ALL_COURSES`.
- Response shape logic:
  - mở đầu ngắn nêu tổng số kết quả phù hợp
  - liệt kê từng tài liệu trên dòng riêng
  - nếu `ALL_COURSES`, mỗi dòng phải có ít nhất `documentName + courseCode`
  - nếu vượt `20`, kết thúc bằng câu nhắc rằng đây là `20` kết quả đầu tiên

### `DOCUMENT_FILTERED_LIST`

- Cho phép filter theo:
  - `fileType`
  - `status`
  - `courseId`
  - khoảng thời gian đơn giản như `mới nhất`, `gần đây`
- Nếu user chồng nhiều filter, chỉ dùng các filter parse được rõ ràng; không đoán thêm.
- Response shape logic:
  - nêu rõ filter nào đã được áp dụng
  - liệt kê kết quả cùng format như `DOCUMENT_LIST`

### `DOCUMENT_COUNT`

- Đếm theo cùng filter logic của list.
- Nếu user không nêu điều kiện, mặc định đếm `COMPLETED`.
- Response shape logic:
  - 1 câu ngắn nêu số lượng
  - nếu có filter, phải nêu filter đó trong câu trả lời

### `DOCUMENT_STATUS`

- Match theo tên file gần đúng trong scope.
- Query ứng viên bằng SQL trong scope hiện tại, ưu tiên:
  - khớp tên chuẩn hóa gần đúng
  - khớp chứa chuỗi bằng `ILIKE`
  - khớp theo tên không dấu nếu cần
- Không resolve `documentNameQuery` bằng một `LIKE` mù trên toàn DB.
- Nếu ra 0 kết quả -> trả `không thấy tài liệu này trong phạm vi hiện tại`.
- Nếu ra 1 kết quả -> trả status cụ thể.
- Nếu ra >1 kết quả -> trả danh sách ứng viên ngắn, không chọn bừa.
- Response shape logic:
  - 0 kết quả: câu từ chối rõ ràng
  - 1 kết quả: `Tên tài liệu`, `trạng thái`, `môn`
  - >1 kết quả: danh sách ứng viên ngắn để user chọn tiếp

### `DOCUMENT_EXISTENCE_CHECK`

- Dùng cùng logic match như `DOCUMENT_STATUS`, nhưng wording trả lời là có/không.
- Nếu có nhiều match, trả `có nhiều tài liệu gần giống tên này`.
- Response shape logic:
  - trả `có`, `không`, hoặc `có nhiều tài liệu gần giống`

### `DOCUMENT_LATEST_UPLOADS`

- Query `ORDER BY created_at DESC LIMIT N`.
- `N` mặc định là `5`, trừ khi user yêu cầu số lượng khác rõ ràng.
- Response shape logic:
  - liệt kê theo thứ tự mới nhất trước
  - mỗi dòng có ít nhất `documentName + createdAt`

### `DOCUMENT_PROCESSING_SUMMARY`

- Trả tổng hợp theo từng status trong scope.
- Nếu user hỏi cụ thể `file nào đang processing`, route sang `DOCUMENT_FILTERED_LIST` với `status = PROCESSING`.
- Response shape logic:
  - 1 đoạn ngắn gồm count theo từng trạng thái có dữ liệu
  - không liệt kê file trừ khi user hỏi cụ thể

### `COURSE_LIST`

- Query danh sách course có ít nhất một document trong DB.
- Query phải chỉ trả các course mà user hiện tại được phép thấy trong chat.
- Response shape logic:
  - liệt kê `courseCode + courseName`
  - nếu không có course nào, trả câu rõ ràng là chưa có môn nào khả dụng trong scope

### `SESSION_SCOPE_SHOW`

- Không query `documents` trừ khi cần đếm/phụ trợ.
- Trả trực tiếp từ session scope hiện tại.
- Response shape logic:
  - `Tất cả môn`
  - hoặc tên 1 môn
  - hoặc `N môn đã chọn` kèm danh sách ngắn các course codes nếu cần

### `SESSION_SCOPE_CHANGE`

- Không hỗ trợ đổi scope inline qua chat trong phase này.
- Router chỉ nhận diện intent và trả về template cố định hướng dẫn user dùng UI tạo session mới hoặc chọn lại phạm vi.
- User message vẫn được lưu như một message bình thường trong history.
- Assistant response ở intent này vẫn được tạo như mọi request khác và vẫn tính quota trong cửa sổ `5 giờ` hiện tại.
- Response template phải cố định về ý:
  - không thể đổi scope ngay trong cuộc hội thoại hiện tại
  - hãy tạo cuộc hội thoại mới hoặc dùng UI chọn lại phạm vi

### `CITATION_LOOKUP`

- Đọc citations từ assistant message gần nhất trong session.
- Nếu có citations:
  - trả `documentName`, `page`, và `isDeleted` nếu có.
- Nếu không có citations gần nhất:
  - fallback sang `CLARIFY_INTENT` hoặc thông báo chưa có nguồn gần nhất để tra.
- Response shape logic:
  - nếu có đúng 1 citation: trả 1 câu ngắn + nguồn
  - nếu có nhiều citations: liệt kê theo thứ tự đã lưu
  - nếu `isDeleted = true`: phải nêu rõ tài liệu nguồn không còn active

## Edge cases bắt buộc cover

### 1. Session rộng nhưng câu hỏi mơ hồ

Ví dụ: `file đó là gì`, `trang đó ở đâu`.

- Nếu không có tham chiếu rõ trong history gần nhất -> `CLARIFY_INTENT`.
- Không đi RAG, không đi list toàn bộ.

### 2. Tên file không đầy đủ

Ví dụ: `CP1`, `slide chương 1`, `file requirements`.

- Dùng contains match hoặc normalized fuzzy match nhẹ.
- Nếu nhiều kết quả, trả danh sách ứng viên.
- Candidate list phải hiển thị ít nhất `documentName + courseCode`.
- Không tự chọn 1 file.

### 3. User hỏi metadata nhưng chen từ học thuật

Ví dụ: `tài liệu nào nói về quicksort`, `file nào có nói checkpoint 2`.

- Đây không phải list metadata thuần.
- Route sang `RAG_QA` nếu mục tiêu là truy vấn nội dung theo tài liệu.
- Chỉ giữ ở metadata path nếu user đang hỏi về tên file/tồn tại file chứ không đòi đọc nội dung.

### 4. User hỏi nội dung nhưng gắn tên file cụ thể

Ví dụ: `trong file CP2 có yêu cầu gì`.

- Route sang `RAG_QA` có filter document-level nếu parse được tên file.
- Không trả metadata đơn thuần.

### 5. User hỏi ngoài scope hiện tại

Ví dụ: session đang chỉ có SWD392 nhưng user hỏi `môn EXE101 có tài liệu nào`.

- Nếu intent là metadata -> có thể trả theo scope hiện tại kèm nhắc rằng session đang không bao gồm EXE101.
- Nếu policy sau này cho phép override bằng course name trong câu hỏi, phải quyết định rõ ở phase khác.
- Trong plan này, ưu tiên không override scope ngầm.

### 6. User hỏi tài liệu đã bị xóa

- Nếu có trong history citations nhưng document không còn active -> trả `isDeleted`.
- Nếu hỏi status/existence qua SQL mà tài liệu không còn trong scope -> trả không thấy.

### 7. User hỏi “mọi tài liệu” khi DB rỗng hoặc scope rỗng

- Trả câu rõ ràng rằng chưa có tài liệu khả dụng trong phạm vi hiện tại.
- Không gọi Gemini.

### 8. User nhắn small-talk

- Không đi RAG, không query DB nặng.
- Trả template nhẹ.
- Response template phải ngắn, không kéo thêm metadata hay RAG.

### 9. User gộp nhiều ý trong một câu

Ví dụ: `hiện có những tài liệu nào và CP2 yêu cầu gì`.

- Trong phase này, không xử lý multi-intent đầy đủ.
- Ưu tiên trả `CLARIFY_INTENT`, yêu cầu tách câu hỏi.
- Không cố vừa list vừa RAG trong một request.

### 10. User hỏi thao tác hệ thống

Ví dụ: `xóa tài liệu`, `tải file lên`, `đổi môn`.

- Route `OUT_OF_SCOPE_SYSTEM_REQUEST`.
- Trả hướng dẫn dùng UI tương ứng.
- Response template phải chỉ hướng dẫn capability boundary, không giả vờ thực hiện thao tác.

## Files chính

- `api/src/modules/chat/chat.controller.ts`
- service/router mới trong `api/src/modules/chat` hoặc `api/src/modules/rag`
- repository/query helper cho `documents`
- logic đọc citation gần nhất trong repository/session detail nếu cần

## Bước triển khai

1. Tạo `IntentRouterService` với:
   - normalize input
   - ordered rules
   - output typed result gồm `intent`, `confidence`, `parsedEntities`
2. Định nghĩa `parsedEntities` tối thiểu:
   - `documentNameQuery`
   - `courseNameQuery`
   - `statusFilter`
   - `fileTypeFilter`
   - `countLimit`
   - `candidateDocumentIds`
3. Tạo `DocumentMetadataService`.
4. Thêm một helper resolve `documentNameQuery -> candidate documents` bằng SQL scoped query có chuẩn hóa tên và giới hạn số ứng viên.
5. Cập nhật `/api/chat/send` để route trước khi vào RAG.
6. Chuẩn hóa template trả lời riêng cho từng intent metadata/non-RAG.
7. Thêm nhánh `CLARIFY_INTENT` và `OUT_OF_SCOPE_SYSTEM_REQUEST`.
8. Nếu `CITATION_LOOKUP`, đọc citations từ message assistant gần nhất trước khi chạm SQL.
9. Nếu confidence thấp, thiếu referent từ history, và không có keyword học thuật mạnh, route `CLARIFY_INTENT` thay vì `RAG_QA`.
10. Giữ quota behavior nhất quán cho metadata path và non-RAG path: assistant response thành công thì tăng `messageCount`, và `messageCount` được reset theo cửa sổ `5 giờ`.

## Success criteria

- Hỏi “hiện tại có những tài liệu nào” trả dữ liệu thật từ SQL.
- Hỏi “có bao nhiêu tài liệu” trả đúng số lượng trong scope.
- Hỏi trạng thái file không gây truy vấn RAG.
- Hỏi nguồn trích dẫn gần nhất không cần vector search.
- Small-talk, system request, ambiguity không vô tình rơi vào RAG.
- Các câu metadata phổ biến không còn khả năng sinh tên file ảo.
- `SESSION_SCOPE_CHANGE` chỉ trả hướng dẫn dùng UI, không đổi scope ngầm.
