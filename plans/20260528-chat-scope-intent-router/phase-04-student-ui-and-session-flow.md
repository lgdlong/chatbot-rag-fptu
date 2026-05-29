# Phase 04: Student UI và Session Flow

## Mục tiêu

Đưa quyền chọn phạm vi tài liệu lên UI sinh viên và tạo session đúng scope ngay từ đầu.

## Yêu cầu

- Mặc định có lựa chọn chat trên tất cả môn.
- Sinh viên có thể chọn một hay nhiều môn để thu hẹp phạm vi.
- Header và sidebar phải hiển thị rõ scope hiện tại.

## Thay đổi UI/API

- Khi tạo session mới, thay vì tạo session trống ngay, hiển thị scope picker.
- Scope picker dùng danh sách từ `GET /api/chat/courses`.
- `POST /api/chat/sessions` gửi `scopeMode` và `courseIds`.
- Session detail hiển thị:
  - `Tất cả môn`
  - tên 1 môn
  - hoặc `N môn đã chọn`
- Nếu user cố đổi scope bằng text chat, UI không tự đổi session; chỉ hiển thị assistant response hướng dẫn dùng UI chọn lại phạm vi.
- UI quota/subscription phải hiển thị wording theo cửa sổ `5 giờ`, không dùng wording `trong ngày`.

## Files chính

- `web/components/features/chat/ChatRoom.tsx`
- `web/components/features/chat/ChatSidebar.tsx`
- `web/api/chat.ts`
- `web/types/index.ts`
- `web/hooks/useChat.ts`

## Bước triển khai

1. Cập nhật chat types cho `scopeMode` và `scopedCourses`.
2. Cập nhật client API tạo session.
3. Thêm UI chọn scope khi khởi tạo “Cuộc hội thoại mới”.
4. Hiển thị scope trong sidebar và header của chat room.
5. Không hỗ trợ đổi scope trong session đang mở.
6. Không có automation nào từ message text làm đổi scope session phía client.

## Success criteria

- Session mới luôn có scope rõ ràng.
- Người dùng nhìn thấy phạm vi tài liệu hiện tại ngay trên UI.
- UI không còn ngầm tạo session global kiểu cũ mà không báo scope.
