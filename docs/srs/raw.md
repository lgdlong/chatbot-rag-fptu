# Định nghĩa lại toàn bộ requirement

## Yêu cầu gốc

```txt
Tài liệu mon học là các chapters trong textbook trên FLM: Software Modeling and Design: UML, Use Cases, Patterns,
and Software Architectures
Các yêu cầu tối thiểu:
A. Tính năng hệ thống:
1. Quản lý tài liệu
- Upload PDF, DOCX, slide bài giảng
- Tự động chunk & embed tài liệu
- Quản lý theo môn học / chương (chỉ cần demo 1 môn)
- Xem danh sách tài liệu đã index
2. Chat & Hỏi đáp
- Chat tự nhiên theo ngữ cảnh hội thoại
- Trích dẫn nguồn tài liệu gốc
- Giới hạn trả loi trong phạm vi tài liệu
- Lịch sử hội thoại theo phiên
B. Sản phẩm bàn giao (Deliverables):
1. Sản phẩm kỹ thuật:
- Web app chatbot
- Source code trên GitHub (có README)
- Test set 50 câu hỏi + ground truth (là tập câu hỏi + câu trả lời đúng được chuẩn bị sẵn bởi con người, dùng để đánh
giá xem chatbot trả lời có chính xác không)
```

## Scope của project và chức năng

Scope của project này cực đơn giản và nhỏ. Có 3 actors chính: Student, Lecturer, Admin. Chi tiết như sau:

- Student chỉ có chức năng chatbot, hỏi đáp.
- Admin chỉ có chức năng quản lý hệ thống, quản lý các account... các chức năng chỉ thuộc về hệ thống.
- Lecturer chỉ có chức năng quản lý tài liệu upload lên như thêm, xoá.

## Rules
- Phân quyền rõ ràng, actor nào chỉ được có quyền trong phạm vi nó được phép. Ví dụ như student không được upload tài liệu.

## Ghi chú

- Không cần giải quyết vấn đề 1000 tài liệu, do quá nhiều làm giảm độ chính xác của chatbot. Vì chỉ cần upload vài tài liệu, chỉ có 2 chương. Dẫn đến không cần phân loại sắp xếp gì cả, cứ quăng vào một kho chứa flat là được.
- Thêm phần chức năng subscription, mở 3 loại gồm cơ bản (mặc định), bạc, vàng. Mỗi subscription thì tăng thêm giới hạn lượt message chatbot hay thêm session chatbot là đủ. Lưu ý subscription cao nhất chỉ tăng giới hạn, không được phép vô hạn.
