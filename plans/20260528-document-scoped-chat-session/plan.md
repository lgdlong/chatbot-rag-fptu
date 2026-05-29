---
title: "Document-Scoped Chat Session"
description: "Chuyển session chat từ scope theo môn sang scope theo tài liệu, giảm trả lời trượt và từ chối mù."
status: done
priority: P1
effort: 20h
branch: duc
tags: [feature, frontend, backend, api, database]
created: 2026-05-28
---

# Kế Hoạch: Document-Scoped Chat Session

## Overview

Mục tiêu là buộc session chat mới phải chọn tài liệu trước khi hỏi, khóa toàn bộ RAG vào đúng tập tài liệu đã chọn, và nới answer policy để bot không còn trả lời sai intent hoặc từ chối quá sớm.

## Vấn đề hiện tại

- `web/components/features/chat/ChatRoom.tsx` chỉ cho chọn `ALL_COURSES` hoặc `SELECTED_COURSES`.
- `api/src/modules/chat/services/chat-scope.service.ts` chỉ resolve `courseIds`, chưa có `documentIds`.
- `api/src/modules/rag/services/rag.service.ts` chỉ filter theo `d.course_id`, nên session vẫn rộng.
- `api/src/modules/chat/services/intent-router.service.ts` đang bắt nhiều câu hỏi nội dung ngắn như `cp`, `checkpoint`, `architecture` thành metadata hoặc count.
- `RagService.NO_CONTEXT_REPLY` bị bắn ra quá sớm khi không có chunk hợp lệ ở top-k đầu tiên.

## Quyết định chính

- Session mới dùng `scopeMode = SELECTED_DOCUMENTS`.
- UI tạo session mới bỏ đường đi mặc định `ALL_COURSES`; user phải xác nhận ít nhất 1 tài liệu.
- Giữ tương thích ngược cho session cũ dùng `ALL_COURSES` hoặc `SELECTED_COURSES`.
- Thêm join table `ChatSessionDocument` thay vì phá ngay `ChatSessionCourse`.
- Tạo một endpoint catalog tổng hợp để mở modal lớn, list tài liệu theo từng môn, chọn bằng checkbox.
- Retrieval đi theo thứ tự: `selected documents -> vector retrieval -> lexical rescue trong cùng scope -> fallback`.

## Trade-off

### Option A. Giữ scope theo môn, chỉ sửa prompt/router

- Ưu: ít sửa DB.
- Nhược: không giải quyết triệt để việc scope quá rộng. User vẫn hỏi giữa nhiều file cùng môn và retrieval vẫn loãng.
- Kết luận: loại.

### Option B. Scope theo tài liệu ở cấp session, giữ compatibility cho session cũ

- Ưu: đúng với nhu cầu user, thay đổi đủ mạnh nhưng vẫn rollout an toàn.
- Nhược: phải thêm migration, API mới, UI picker mới.
- Kết luận: chọn.

### Option C. Cho chọn tài liệu mỗi lần gửi message

- Ưu: linh hoạt tối đa.
- Nhược: UX nặng, state rối, history và citation khó nhất quán.
- Kết luận: loại.

## Giả định

- Cụm `model lớn` trong mô tả được hiểu là `modal lớn`, không phải đổi sang một LLM lớn hơn.
- Tài liệu chỉ được phép chọn để chat khi `status = COMPLETED`.
- Session mới không hỗ trợ hỏi `all tài liệu`. Nếu cần phạm vi khác, tạo session mới.

## API và dữ liệu dự kiến

- `POST /api/chat/sessions`
  - Payload mới: `{ scopeMode: "SELECTED_DOCUMENTS", documentIds: string[] }`
  - Legacy vẫn accept `courseId` và `courseIds`.
- `GET /api/chat/document-catalog`
  - Trả danh sách tài liệu khả dụng theo nhóm môn học.
- `GET /api/chat/sessions`
  - Bổ sung summary số tài liệu đã chọn.
- `GET /api/chat/sessions/:sessionId`
  - Trả `scopedDocuments`, `scopeLabel`, `scopeSummary`.

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Data model và session contract | Done | 4h | [phase-01](./phase-01-data-model-and-session-contract.md) |
| 2 | Modal chọn tài liệu và flow tạo session | Done | 5h | [phase-02](./phase-02-document-picker-modal-and-session-creation-flow.md) |
| 3 | Retrieval scope và answer policy | Done | 5h | [phase-03](./phase-03-retrieval-scope-and-answer-policy.md) |
| 4 | Intent router và chat UX recovery | Done | 3h | [phase-04](./phase-04-intent-router-and-chat-ux-recovery.md) |
| 5 | Migration, compatibility, test plan | Done | 3h | [phase-05](./phase-05-migration-compatibility-and-test-plan.md) |

## Definition of Done

- Sinh viên không thể bắt đầu session mới nếu chưa chọn tài liệu.
- Session mới chỉ truy xuất trong `documentIds` đã xác nhận.
- Câu hỏi như `nội dung checkpoint 1`, `cp1`, `architecture trong sách` không bị route nhầm sang metadata count.
- Khi không đủ ngữ cảnh, bot hỏi lại hoặc fallback muộn hơn, không từ chối ngay ở bước đầu.
- Session cũ vẫn mở được và chat tiếp được.
- `npm run build` ở `api/` và `npm run lint` ở `web/` pass.

## Rủi ro lớn

- Catalog tài liệu quá dài làm modal chậm hoặc khó dùng.
- Query fallback lexical trên `document_chunks.content` có thể chậm nếu không giới hạn tốt.
- Session cũ và session mới cùng chạy song song dễ làm logic scope bị rẽ nhánh nhiều.

## Files dự kiến bị ảnh hưởng

- `api/prisma/schema.prisma`
- `api/src/modules/chat/chat.controller.ts`
- `api/src/modules/chat/repositories/chat.repository.ts`
- `api/src/modules/chat/services/chat-scope.service.ts`
- `api/src/modules/chat/services/document-metadata.service.ts`
- `api/src/modules/chat/services/intent-router.service.ts`
- `api/src/modules/rag/services/rag.service.ts`
- `web/api/chat.ts`
- `web/lib/api.ts`
- `web/types/index.ts`
- `web/components/features/chat/ChatRoom.tsx`
- `web/components/features/chat/ChatSidebar.tsx`

## Notes

- Không đổi `.env` policy.
- Không thêm framework orchestration mới.
- Không attempt multi-tenant redesign trong plan này, nhưng endpoint mới vẫn phải bám auth ownership và không leak dữ liệu ngoài session/user.
