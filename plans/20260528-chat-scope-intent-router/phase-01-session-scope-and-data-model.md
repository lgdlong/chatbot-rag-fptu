# Phase 01: Session Scope và Data Model

## Mục tiêu

Chuyển mô hình session từ `courseId` đơn lẻ sang phạm vi session có thể là tất cả môn hoặc nhiều môn được chọn.

## Yêu cầu

- Session mới phải lưu được `ALL_COURSES` hoặc `SELECTED_COURSES`.
- Session `SELECTED_COURSES` phải hỗ trợ nhiều `courseIds`.
- Session cũ vẫn tương thích mà không cần migrate dữ liệu phá vỡ lịch sử.
- `ALL_COURSES` phải luôn được resolve thành tập course mà user hiện tại được phép truy cập, không phải toàn bộ course trong DB.

## Thay đổi thiết kế

- Naming contract ở Prisma/schema:
  - model session hiện tại tiếp tục là `ChatSession`
  - field mới đặt tên là `scopeMode`
  - relation join model đặt tên là `ChatSessionCourse`
  - bảng vật lý map thành `chat_session_courses`
  - field relation collection trong `ChatSession` đặt tên là `scopedCourses`
- Thêm `scopeMode` vào `ChatSession` dưới dạng enum/string constrained với đúng 2 giá trị:
  - `ALL_COURSES`
  - `SELECTED_COURSES`
- Thêm bảng join `chat_session_courses(session_id, course_id, created_at)`.
- Bảng join phải có các ràng buộc tối thiểu:
  - composite unique `(session_id, course_id)` để tránh duplicate course trong cùng session
  - foreign key tới `chat_sessions.id`
  - foreign key tới `courses.id`
  - xóa session phải cascade xóa join rows
  - index theo `session_id`
  - index theo `course_id` nếu cần cho truy vấn ngược/debug
- Giữ `chat_sessions.course_id` để đọc legacy.

## Contract response của session API

- `GET /api/chat/sessions`
  - mỗi session trả tối thiểu:
    - `id`
    - `title`
    - `userId`
    - `createdAt`
    - `scopeMode`
    - `scopedCourses: Array<{ id, code, name }>`
  - trong pha chuyển tiếp có thể vẫn trả `courseId` legacy để không làm gãy client cũ, nhưng client mới không được phụ thuộc vào field này
- `GET /api/chat/sessions/:sessionId`
  - ngoài các field trên, response phải có `messages`
  - `messages[].citations` vẫn theo contract hiện tại
  - session detail là nguồn sự thật cho scope hiển thị trên UI

## Quy tắc tương thích

- Legacy có `course_id != null` -> xử lý như `SELECTED_COURSES` với 1 môn.
- Legacy có `course_id == null` -> xử lý như `ALL_COURSES`.
- Session mới không còn phụ thuộc vào `course_id` cho logic chính.
- Trong pha chuyển tiếp, API create session vẫn phải chấp nhận payload cũ `{ courseId?: string }` và map sang model mới ở backend.

## Files chính

- `api/prisma/schema.prisma`
- migration Prisma mới
- repository đọc session chat

## Bước triển khai

1. Cập nhật Prisma schema cho `scopeMode` và relation `chat_session_courses`.
2. Tạo migration thêm cột, bảng join, unique/indexes, và cascade rules cần thiết.
3. Cập nhật `ChatRepository.findSessionById` và `findSessionsByUser` để include `scopedCourses`.
4. Chuẩn hóa một helper backend để resolve session scope từ dữ liệu mới và legacy.
5. Helper resolve scope phải nhận `userId` và chỉ trả về `courseIds` mà user được phép dùng trong chat.
6. Helper resolve scope là nguồn sự thật duy nhất cho rule `ALL_COURSES`, không để controller/repository tự suy diễn riêng.

## Success criteria

- Có thể tạo session mới với `ALL_COURSES`.
- Có thể tạo session mới với nhiều `courseIds`.
- Session cũ vẫn trả về scope đúng khi đọc qua API.
- Không có nhánh nào dùng “all rows” để đại diện cho `ALL_COURSES`.
- Không thể tạo duplicate `(session_id, course_id)` trong bảng join.
