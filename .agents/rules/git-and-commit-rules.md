# Git, Commit & Push Rules

This rule file specifies the strict guidelines that AI agents **MUST** follow for Git commits, staging, and push procedures in this repository.

---

## 🇻🇳 1. Vietnamese Commit Messages (Chuẩn Conventional Commits)

All git commit messages **MUST** be written in **fully accented Vietnamese (tiếng Việt có dấu)**, adhering strictly to the **Conventional Commits** format. Do not use English or unaccented Vietnamese under any circumstances.

### Format Structure
```
<type>(<scope>): <mô tả chi tiết bằng tiếng Việt>
```

### Allowed Types:
* `feat`: Thêm tính năng mới (ví dụ: `feat(auth): tích hợp đăng nhập google oauth sso`)
* `fix`: Sửa lỗi (ví dụ: `fix(sse): khắc phục lỗi rò rỉ bộ nhớ khi đóng kết nối streaming`)
* `docs`: Cập nhật tài liệu (ví dụ: `docs(roadmap): thêm mục tiêu thực nghiệm so sánh RAG và Fine-tuning`)
* `refactor`: Tái cấu trúc mã nguồn (ví dụ: `refactor(api): chuyển đổi module auth sang mô hình decoupled`)
* `test`: Viết hoặc bổ sung unit tests (ví dụ: `test(health): thêm ca kiểm thử tích hợp đo độ trễ db`)
* `chore`: Thay đổi linh tinh, cài đặt package (ví dụ: `chore(deps): nâng cấp thư viện better-auth lên bản mới nhất`)

---

## 🧩 2. Atomic & Incremental Commits (Không Big-Bang Commits)

AI agents must **NEVER** perform "Big-Bang" commits (committing hundreds of lines or multiple distinct changes across different modules at once).

* **Split Commits:** Split your work into small, atomic, and logically cohesive steps.
* **Granular Tracking:** Make a separate commit for each individual step (e.g., commit backend API route changes first, then commit frontend integration changes, then commit document updates).
* **Rollback Friendliness:** Small commits are easy to audit, review, and rollback/revert if something breaks.

---

## 🛑 3. Strict Push Approval Policy (Hỏi ý kiến trước khi Push)

AI agents **NEVER** run `git push` autonomously.

* **Explicit Permission Required:** You must always ask the user for permission and receive explicit approval before pushing any commits to remote repositories.
* **Ask clearly:** When ready to push, explain exactly what commits are staged/ready, and ask: *"Tôi có thể thực hiện lệnh `git push` các commits này lên repository không?"*
* **Exception:** Staging (`git add`) and local committing (`git commit`) can be done as part of your execution checklist, but pushing is strictly gated behind user confirmation.
