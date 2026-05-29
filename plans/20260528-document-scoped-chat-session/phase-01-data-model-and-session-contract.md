# Phase 01: Data Model Và Session Contract

## Context Links

- `api/prisma/schema.prisma`
- `api/src/modules/chat/chat.controller.ts`
- `api/src/modules/chat/repositories/chat.repository.ts`
- `api/src/modules/chat/services/chat-scope.service.ts`

## Overview

- Priority: P1
- Status: Done
- Mục tiêu: thêm khả năng scope theo tài liệu mà không làm hỏng session legacy theo môn.

## Key Insights

- `ChatSessionCourse` đã tồn tại. Không nên xóa ngay.
- `RagService` và `DocumentMetadataService` đều đang phụ thuộc `scope.courseIds`.
- Cần một object scope mới trả cả `courseIds` lẫn `documentIds`.

## Requirements

- Functional:
  - Session mới lưu được danh sách `documentIds`.
  - Session legacy vẫn đọc được.
  - API create session chấp nhận payload document-scoped.
- Non-functional:
  - Migration an toàn, không phá dữ liệu cũ.
  - Không tăng số query vô ích trong load session.

## Architecture

Đề xuất:

```ts
enum ChatSessionScopeMode {
  ALL_COURSES
  SELECTED_COURSES
  SELECTED_DOCUMENTS
}

model ChatSessionDocument {
  id         String
  sessionId  String
  documentId String
  createdAt  DateTime
}
```

`resolveChatScope()` đổi sang trả:

```ts
type ResolvedChatScope = {
  scopeMode: ChatSessionScopeMode
  courseIds: string[]
  documentIds: string[]
  scopedCourses: ScopedCourse[]
  scopedDocuments: ScopedDocument[]
  isLegacyScope: boolean
}
```

## Related Code Files

- Modify: `api/prisma/schema.prisma`
- Modify: `api/src/modules/chat/chat.controller.ts`
- Modify: `api/src/modules/chat/repositories/chat.repository.ts`
- Modify: `api/src/modules/chat/services/chat-scope.service.ts`

## Implementation Steps

1. Thêm enum value `SELECTED_DOCUMENTS`.
2. Thêm model `ChatSessionDocument` với unique `(sessionId, documentId)`.
3. Cập nhật repository để include `scopedDocuments.document`.
4. Mở rộng payload create session:
   - New: `documentIds`
   - Legacy: `courseId`, `courseIds`
5. Trong create session:
   - Nếu có `documentIds` -> `scopeMode = SELECTED_DOCUMENTS`
   - Nếu chỉ có `courseIds` -> logic legacy
6. `resolveChatScope()`:
   - Với `SELECTED_DOCUMENTS`: resolve documents trước, derive `courseIds` từ documents.
   - Với legacy: giữ behavior cũ.
7. `buildChatScopeLabel()`:
   - Nếu document scope: hiển thị `N tài liệu đã chọn`.

## Todo List

- [ ] Prisma schema update
- [ ] Prisma migration plan
- [ ] Repository include scoped documents
- [ ] Scope resolver return `documentIds`
- [ ] Create session contract support `documentIds`

## Success Criteria

- `GET /api/chat/sessions/:id` trả đủ `scopeMode`, `scopedDocuments`.
- Session document-scoped không bị rơi về all courses.
- Session legacy vẫn load được mà không cần migration dữ liệu tay.

## Risk Assessment

- Enum mới có thể làm frontend cũ render sai.
- Resolver dễ bị nhân đôi logic nếu không gom chung helper.

## Security Considerations

- Chỉ cho phép gắn document đang accessible với user hiện tại.
- Không cho tạo session với document `FAILED` hoặc `PROCESSING`.
- Validate ownership trước khi connect relation.

## Next Steps

- Phase 02 dùng `document-catalog` để user chọn tài liệu trước khi tạo session.
