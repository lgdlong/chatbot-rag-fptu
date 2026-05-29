# Phase 02: Modal Chọn Tài Liệu Và Flow Tạo Session

## Context Links

- `web/components/features/chat/ChatRoom.tsx`
- `web/components/features/chat/ChatSidebar.tsx`
- `web/api/chat.ts`
- `web/lib/api.ts`
- `web/types/index.ts`
- `api/src/modules/chat/chat.controller.ts`

## Overview

- Priority: P1
- Status: Done
- Mục tiêu: thay màn tạo chat hiện tại bằng modal lớn, list tài liệu theo môn, chọn bằng checkbox, xác nhận rồi mới tạo session.

## Key Insights

- Frontend hiện chỉ có `MultiSelect` theo course, không đủ cho use case này.
- Repo đang dùng Mantine. Nên tận dụng `Modal`, `Checkbox`, `ScrollArea`, `TextInput`.
- Nếu gọi `GET /courses/:courseId/documents` theo từng môn sẽ sinh N+1.

## Requirements

- Functional:
  - Có nút mở modal chọn tài liệu từ trạng thái empty chat và từ sidebar.
  - List tài liệu theo từng môn.
  - Có search theo tên tài liệu hoặc mã môn.
  - Chỉ enable checkbox với tài liệu `COMPLETED`.
  - Nút xác nhận tạo session chỉ bật khi đã chọn ít nhất 1 tài liệu.
- Non-functional:
  - Render mượt với vài trăm tài liệu.
  - Không cần load lazy theo page ở pha đầu nếu catalog còn vừa.

## Architecture

API mới:

```ts
GET /api/chat/document-catalog

{
  groups: [
    {
      course: { id, code, name },
      documents: [
        { id, name, fileType, status, createdAt, selectable }
      ]
    }
  ]
}
```

UX:

1. User bấm `Cuộc hội thoại mới`
2. Mở modal lớn
3. Search hoặc tick checkbox
4. Xác nhận
5. Gọi `POST /api/chat/sessions` với `documentIds`
6. Redirect vào `?sessionId=...`

## Related Code Files

- Modify: `api/src/modules/chat/chat.controller.ts`
- Modify: `web/api/chat.ts`
- Modify: `web/lib/api.ts`
- Modify: `web/types/index.ts`
- Modify: `web/components/features/chat/ChatRoom.tsx`
- Modify: `web/components/features/chat/ChatSidebar.tsx`

## Implementation Steps

1. Backend thêm endpoint `GET /api/chat/document-catalog`.
2. Query một lần:
   - documents accessible
   - include course
   - order by course, createdAt desc
3. Frontend thêm types:
   - `DocumentCatalogGroup`
   - `ScopedDocument`
4. Tách UI picker thành component riêng nếu `ChatRoom.tsx` quá dài.
5. Bỏ flow tạo session `ALL_COURSES` khỏi UI mới.
6. Hiển thị summary sau xác nhận:
   - `3 tài liệu từ 2 môn`
7. Trong session header:
   - hiện `scopeSummary`
   - có action tạo session mới để đổi scope

## Todo List

- [ ] Backend document catalog endpoint
- [ ] Client types for catalog
- [ ] Modal lớn với checkbox group
- [ ] Search/filter tại client
- [ ] Session creation bằng `documentIds`
- [ ] Session header hiển thị tài liệu đã chọn

## Success Criteria

- User không thể chat trước khi chọn tài liệu ở session mới.
- Session mới tạo xong hiển thị ngay số tài liệu đã khóa.
- Modal dùng được trên desktop và mobile.

## Risk Assessment

- `ChatRoom.tsx` đang dài. Nếu nhét thêm picker sẽ vượt mức maintainable.
- Catalog dài có thể cần sticky search và sticky confirm bar.

## Security Considerations

- Không show document ngoài ownership/access scope.
- Không cho forged documentIds ở client qua mặt backend validate.

## Next Steps

- Phase 03 dùng `documentIds` mới để khóa retrieval và metadata.
