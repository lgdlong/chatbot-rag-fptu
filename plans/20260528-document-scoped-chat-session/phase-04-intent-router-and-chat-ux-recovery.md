# Phase 04: Intent Router Và Chat UX Recovery

## Context Links

- `api/src/modules/chat/services/intent-router.service.ts`
- `api/src/modules/chat/services/document-metadata.service.ts`
- `web/components/features/chat/ChatRoom.tsx`

## Overview

- Priority: P1
- Status: Done
- Mục tiêu: giảm route sai loại câu hỏi, đặc biệt với shorthand như `cp`, `checkpoint`, `architecture`.

## Key Insights

- `matchesDocumentCount()` hiện ăn rất rộng. Chỉ cần có `bao nhiêu` là dễ bị kéo sang metadata count.
- `RAG_KEYWORDS` chưa cover đủ shorthand học thuật.
- Bot hiện chào và clarify khá máy móc, thiếu context từ session đã chọn.

## Requirements

- Functional:
  - `checkpoint`, `cp`, `check point`, `architecture`, `pattern`, `nguyên lý`, `mô hình` nghiêng về `RAG_QA`.
  - Khi query vừa có count vừa có học thuật, ưu tiên `RAG_QA`.
  - Message chào đầu phiên gợi rõ: `bạn đang hỏi trong N tài liệu`.
- Non-functional:
  - Rule đủ đơn giản để maintain.
  - Không kéo thêm LLM classification vào pha này.

## Architecture

Rule ưu tiên mới:

```text
academic noun + count phrase
=> RAG_QA

document noun + count phrase
=> DOCUMENT_COUNT
```

Ví dụ:

- `có tổng bao nhiêu cp` -> `RAG_QA`
- `có tổng bao nhiêu tài liệu` -> `DOCUMENT_COUNT`

## Related Code Files

- Modify: `api/src/modules/chat/services/intent-router.service.ts`
- Modify: `api/src/modules/chat/services/document-metadata.service.ts`
- Modify: `web/components/features/chat/ChatRoom.tsx`

## Implementation Steps

1. Tách `ACADEMIC_NOUNS` và `DOCUMENT_NOUNS`.
2. Thêm alias:
   - `cp`
   - `checkpoint`
   - `check point`
   - `architecture`
3. Đổi thứ tự rule:
   - mixed query có academic noun thì không trả `CLARIFY_INTENT` sớm.
4. Cập nhật response text:
   - small talk bớt generic
   - clarify bám vào selected document scope
5. Trong UI, thêm badge `Đang hỏi trong X tài liệu`.

## Todo List

- [ ] Intent rule rebalance
- [ ] Academic alias map
- [ ] Clarify message theo document scope
- [ ] Session-aware empty state copy

## Success Criteria

- Các ví dụ user đưa ra không còn rơi vào `DOCUMENT_COUNT` sai.
- Clarify question ngắn, đúng ngữ cảnh session.
- Empty state và header phản ánh rõ phạm vi tài liệu.

## Risk Assessment

- Heuristic cứng có thể lại làm lệch với ngành học khác.
- Alias `cp` có thể mơ hồ nếu sau này dùng cho context khác.

## Security Considerations

- Không dùng user message để bypass scope.
- Không hiển thị tên tài liệu ngoài session khi clarify.

## Next Steps

- Phase 05 chốt migration, rollout và test coverage.
