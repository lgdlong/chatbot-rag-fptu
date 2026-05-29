# Phase 03: Retrieval Scope Và Answer Policy

## Context Links

- `api/src/modules/rag/services/rag.service.ts`
- `api/src/modules/chat/services/chat-scope.service.ts`
- `api/src/modules/chat/services/document-metadata.service.ts`
- `api/src/modules/chat/chat.controller.ts`

## Overview

- Priority: P1
- Status: Done
- Mục tiêu: ép toàn bộ retrieval vào tài liệu đã chọn và giảm fallback từ chối quá sớm.

## Key Insights

- `RagService` đang chỉ filter `d.course_id IN (...)`.
- `DocumentMetadataService` cũng chỉ hiểu scope theo course.
- Query ngắn như `cp1`, `checkpoint 1`, `architecture nào` dễ fail vector-only retrieval.

## Requirements

- Functional:
  - RAG chỉ truy xuất trong `scope.documentIds` nếu session là `SELECTED_DOCUMENTS`.
  - Metadata path như list/count/status cũng chỉ nhìn trong cùng tập tài liệu đó.
  - Nếu vector retrieval miss, có thêm rescue pass trong cùng scope.
- Non-functional:
  - Không tăng latency quá mạnh.
  - Không mở scope ra ngoài selection của session.

## Architecture

Trình tự mới:

```text
Selected documents
-> vector retrieval top-k trong selected docs
-> nếu 0 hit: lexical rescue trong selected docs
-> nếu vẫn 0: clarify hoặc fallback
```

SQL filter ưu tiên:

```sql
AND d.id IN (...)
```

không còn chỉ dựa vào:

```sql
AND d.course_id IN (...)
```

## Related Code Files

- Modify: `api/src/modules/rag/services/rag.service.ts`
- Modify: `api/src/modules/chat/services/chat-scope.service.ts`
- Modify: `api/src/modules/chat/services/document-metadata.service.ts`
- Modify: `api/src/modules/chat/chat.controller.ts`

## Implementation Steps

1. `ResolvedChatScope` cung cấp `documentIds`.
2. `RagService.retrieveAndGenerate()`:
   - nếu `documentIds.length > 0` -> filter theo document ids
   - nếu legacy -> fallback filter theo course ids
3. Intersect `candidateDocumentIds` từ intent router với `scope.documentIds`.
4. Thêm rescue query đơn giản trên `document_chunks.content`:
   - normalize query
   - match token quan trọng trong selected docs
   - giới hạn nhỏ, chỉ chạy khi vector path ra 0
5. `DocumentMetadataService`:
   - count/list/status theo `documentIds` nếu có
6. Answer policy:
   - Nếu selected docs > 1 và rescue vẫn mờ -> hỏi lại `bạn muốn hỏi tài liệu nào trong X tài liệu đã chọn?`
   - Chỉ trả `Mình không biết...` sau khi đã fail cả retrieval lẫn rescue.

## Todo List

- [ ] Filter RAG theo document ids
- [ ] Intersect candidate docs với session docs
- [ ] Metadata queries support document scope
- [ ] Rescue retrieval path
- [ ] Clarify-before-refuse policy

## Success Criteria

- Session chọn 2 tài liệu thì citation chỉ ra từ 2 tài liệu đó.
- Query nội dung ngắn không rơi vào từ chối ngay vòng đầu.
- Metadata count/list không đếm lạc sang tài liệu ngoài session.

## Risk Assessment

- Rescue query quá rộng sẽ kéo noise vào answer.
- Nếu selected docs quá nhiều, latency rescue có thể tăng.

## Security Considerations

- Không có pass nào được phép mở rộng ngoài `documentIds` của session.
- Citation phải giữ `documentId` thật để UI trace được nguồn.

## Next Steps

- Phase 04 sửa router để bớt route nhầm và bớt cần clarify vô nghĩa.
