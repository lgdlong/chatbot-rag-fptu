# Phase 05: Migration, Compatibility Và Test Plan

## Context Links

- `api/prisma/schema.prisma`
- `api/src/modules/chat/chat.controller.ts`
- `api/src/modules/chat/repositories/chat.repository.ts`
- `api/src/modules/rag/services/rag.service.ts`
- `web/components/features/chat/ChatRoom.tsx`
- `web/api/chat.ts`

## Overview

- Priority: P1
- Status: Done
- Mục tiêu: rollout an toàn, không làm hỏng session cũ, có test cho các case user đang đau.

## Key Insights

- Repo đang có session legacy theo course. Không thể hard cut ngay.
- Frontend và backend phải tương thích chéo trong lúc deploy lệch phiên bản.
- User pain chính là regression về intent và fallback, không chỉ schema.

## Requirements

- Functional:
  - Session cũ vẫn đọc và chat tiếp được.
  - Frontend mới hiểu cả scope cũ lẫn scope mới.
  - Có test cho 5 câu ví dụ user đã nêu.
- Non-functional:
  - Build pass.
  - Không cần data backfill bắt buộc ở pha đầu.

## Architecture

Compatibility matrix:

| Backend | Frontend | Kỳ vọng |
|---|---|---|
| Mới | Cũ | Legacy create session vẫn dùng được |
| Mới | Mới | Document-scoped session hoạt động đầy đủ |
| Cũ | Mới | Không hỗ trợ rollout này, deploy backend trước |

## Related Code Files

- Modify: `api/prisma/schema.prisma`
- Modify: `api/src/modules/chat/chat.controller.ts`
- Modify: `api/src/modules/rag/services/rag.service.ts`
- Modify: `web/api/chat.ts`
- Modify: `web/types/index.ts`
- Modify: `web/components/features/chat/ChatRoom.tsx`

## Implementation Steps

1. Prisma migration thêm `ChatSessionDocument` và enum value mới.
2. Deploy backend trước frontend.
3. Giữ parser payload legacy ít nhất 1 vòng release.
4. Thêm test cases:
   - create selected documents session
   - legacy selected courses session
   - metadata count trong selected docs
   - `checkpoint 1` route vào `RAG_QA`
   - no-context sau rescue mới fallback
5. Manual QA:
   - mobile modal
   - desktop large list
   - citation chỉ từ selected docs
6. Validation cuối:
   - `api`: `npm run build`
   - `web`: `npm run lint`

## Todo List

- [ ] Migration script
- [ ] Backward compatibility checks
- [ ] Automated tests cho router và scope
- [ ] Manual QA checklist
- [ ] Build/lint verification

## Success Criteria

- Không có regression với session cũ.
- 5 ví dụ hội thoại của user cho ra behavior tốt hơn rõ rệt.
- Deploy tuần tự backend trước frontend không gây downtime logic chat.

## Risk Assessment

- Thiếu test cho session legacy sẽ làm bug lọt vào production.
- Nếu deploy frontend trước backend, create session mới sẽ fail payload.

## Security Considerations

- Test cả case forged `documentIds` bị từ chối.
- Verify session ownership trong mọi endpoint mới.

## Next Steps

- Sau rollout ổn định, mới cân nhắc xóa UI `ALL_COURSES` còn sót và dọn branch logic legacy.
