# Quy tắc Git, Commit & Push

Tài liệu này quy định các hướng dẫn nghiêm ngặt mà AI agent **BẮT BUỘC** phải tuân thủ khi thực hiện các thao tác Git commits, staging và quy trình push trong repository này.

---

## 🇻🇳 1. Thông điệp Commit bằng tiếng Việt có dấu (Chuẩn Conventional Commits)

Tất cả các thông điệp commit **BẮT BUỘC** phải được viết bằng **tiếng Việt có dấu đầy đủ (fully accented Vietnamese)**, tuân thủ nghiêm ngặt định dạng **Conventional Commits**. 

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG DÙNG TIẾNG VIỆT KHÔNG DẤU**
> Nghiêm cấm sử dụng tiếng Việt không dấu (ví dụ: `tai cau truc`, `bo sung`, `chuan hoa`) hoặc tiếng Anh trong tiêu đề commit, mô tả commit dưới mọi hình thức. Tất cả các ký tự tiếng Việt phải có dấu đầy đủ, đúng chính tả và ngữ pháp tiếng Việt.

### Cấu trúc Định dạng:
```
<type>(<scope>): <mô tả chi tiết bằng tiếng Việt có dấu đầy đủ>
```

### Các Loại Commit (Types) được phép:
* `feat`: Thêm tính năng mới (ví dụ: `feat(auth): tích hợp đăng nhập google oauth sso`)
* `fix`: Sửa lỗi (ví dụ: `fix(sse): khắc phục lỗi rò rỉ bộ nhớ khi đóng kết nối streaming`)
* `docs`: Cập nhật tài liệu (ví dụ: `docs(roadmap): cập nhật lộ trình phát triển`)
* `refactor`: Tái cấu trúc mã nguồn (ví dụ: `refactor(api): chuyển đổi module auth sang mô hình decoupled`)
* `test`: Viết hoặc bổ sung unit tests (ví dụ: `test(health): thêm ca kiểm thử tích hợp đo độ trễ db`)
* `chore`: Thay đổi linh tinh, cài đặt package (ví dụ: `chore(deps): nâng cấp thư viện better-auth lên bản mới nhất`)

---

## 🧩 2. Commit Nhỏ, Đơn lẻ & Tịnh tiến (Không Big-Bang Commits)

AI agent **KHÔNG BAO GIỜ** được thực hiện "Big-Bang" commits (commit hàng trăm dòng code hoặc nhiều thay đổi khác nhau trên các module khác nhau cùng một lúc).

* **Chia nhỏ Commit:** Chia nhỏ công việc thành các bước nhỏ, có tính nguyên tử (atomic) và liên kết logic chặt chẽ.
* **Theo dõi chi tiết:** Thực hiện các commit riêng biệt cho từng bước riêng lẻ (ví dụ: commit các thay đổi của route API backend trước, sau đó commit các thay đổi tích hợp frontend, cuối cùng là cập nhật tài liệu).
* **Khả năng khôi phục:** Các commit nhỏ giúp dễ dàng kiểm tra, đánh giá và khôi phục (rollback/revert) nếu xảy ra lỗi.

---

## 🛑 3. Quy trình phê duyệt Push nghiêm ngặt (Hỏi ý kiến trước khi Push)

AI agent **KHÔNG BAO GIỜ** tự ý chạy lệnh `git push`.

* **Yêu cầu phê duyệt rõ ràng:** Bạn phải luôn hỏi ý kiến người dùng và nhận được sự đồng ý rõ ràng trước khi thực hiện push bất kỳ commit nào lên repository từ xa (remote).
* **Cách hỏi rõ ràng:** Khi sẵn sàng push, giải thích chi tiết các commit đã sẵn sàng và hỏi: *"Tôi có thể thực hiện lệnh `git push` các commits này lên repository không?"*
* **Ngoại lệ:** Việc tạo stage (`git add`) và commit local (`git commit`) có thể được thực hiện như một phần của danh sách công việc, nhưng việc push bắt buộc phải có sự xác nhận của người dùng.
