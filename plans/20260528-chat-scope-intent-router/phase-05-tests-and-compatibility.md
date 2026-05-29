# Phase 05: Tests và Compatibility

## Mục tiêu

Khóa hành vi đúng cho session mới, session legacy, metadata routing và fallback RAG.

## Test cases bắt buộc

- Tạo session:
  - `ALL_COURSES`
  - `SELECTED_COURSES` với 1 course
  - `SELECTED_COURSES` với nhiều course
  - reject payload sai
  - payload legacy `{ courseId?: string }` vẫn được map đúng sang scope mới trong pha chuyển tiếp
- Authorization:
  - gửi message vào session của user khác -> `403`
- Metadata:
  - list documents trong `ALL_COURSES`
  - list documents trong `SELECTED_COURSES`
  - count documents
  - status document
  - `DOCUMENT_LIST` bị giới hạn `20` kết quả và trả tổng count
  - candidate list hiển thị `documentName + courseCode` khi trùng tên
- RAG:
  - truy xuất đúng scope
  - truy xuất đúng `candidateDocumentIds` khi hỏi theo tên file cụ thể
  - fallback khi không có chunk hợp lệ
  - fallback khi document/chunk biến mất giữa chừng
  - không tạo citations ảo
- Legacy:
  - session cũ có `courseId`
  - session cũ không `courseId`
- Intent matrix:
  - `SESSION_SCOPE_SHOW`
  - `SESSION_SCOPE_CHANGE`
  - `COURSE_LIST`
  - `CITATION_LOOKUP`
  - `OUT_OF_SCOPE_SYSTEM_REQUEST`
  - `SMALL_TALK`
  - `CLARIFY_INTENT`
  - câu mơ hồ confidence thấp không được rơi vào `RAG_QA`
- Quota:
  - mọi request tạo assistant response thành công đều tăng quota
  - request lỗi hệ thống không tăng quota
  - chưa đủ `5 giờ` kể từ `lastReset` thì không reset quota
  - đủ `5 giờ` hoặc hơn kể từ `lastReset` thì reset quota trước khi áp hạn mức
  - wording response/UI phải nói theo `5 giờ`, không còn `trong ngày`

## Kiểm tra thủ công

- Tạo session mới từ UI với tất cả môn.
- Tạo session mới từ UI với nhiều môn.
- Hỏi câu metadata và xác nhận không có citations.
- Hỏi câu ngoài tài liệu và xác nhận bot trả `Mình không biết...`
- Gửi câu “đổi sang môn X” và xác nhận bot chỉ hướng dẫn dùng UI, session scope không đổi.
- Gửi câu metadata không dấu hoặc có typo nhẹ và xác nhận router vẫn match đúng.
- Kiểm tra sidebar/subscription UI hiển thị đúng `Hạn mức 5 giờ`.

## Build và validation

- `api`: build TypeScript pass.
- `web`: lint và build pass.
- Không có thay đổi phá vỡ route chat cũ ngoài payload tạo session đã được cập nhật đồng bộ client/backend.

## Rủi ro cần để ý

- Query scope nhiều môn có thể làm phình logic Prisma include và response type.
- Session legacy dễ bị bỏ sót ở nhánh render citations hoặc sidebar.
- Heuristic router quá rộng có thể đẩy nhầm một số câu hỏi học thuật sang metadata path.
- Nếu contract router không log `reasonCode/confidence`, việc debug misroute sẽ rất chậm.
- Resolve tên tài liệu bằng query tên file nếu thiết kế quá lỏng sẽ kéo sai ứng viên; phải giới hạn scope và số lượng kết quả.

## Success criteria

- Không có regression ở lịch sử chat cũ.
- Không còn bug hallucination ở nhóm câu hỏi metadata.
- Hệ thống vẫn stream ổn định ở luồng RAG thật.
- Quota behavior nhất quán giữa metadata path, non-RAG path, và RAG path.
- Quota behavior nhất quán giữa metadata path, non-RAG path, và RAG path trong cùng cửa sổ `5 giờ`.
