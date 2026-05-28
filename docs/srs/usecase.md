# Tài liệu Đặc tả Use Case Chi tiết (Use Case Specification)
## Hệ thống Chatbot RAG Hỗ trợ Học tập (Môn học: Software Modeling and Design)

---

### 1. Danh sách các Tác nhân (Actors)

| Tác nhân (Actor) | Mô tả (Description) |
|---|---|
| **Học sinh (Student)** | Người dùng cuối sử dụng hệ thống để hỏi đáp, ôn luyện kiến thức dựa trên tài liệu, quản lý lịch sử chat và đăng ký các gói giới hạn dịch vụ (Subscription). |
| **Giảng viên (Lecturer)** | Người quản trị nội dung môn học, có trách nhiệm nạp tri thức vào kho (tải slide, tài liệu) và cập nhật/xóa khi tài liệu lỗi thời. |
| **Quản trị viên (Admin)** | Người vận hành hệ thống, phê duyệt yêu cầu cấp tài khoản cho Giảng viên, quản lý tài khoản người dùng và cấu hình các cài đặt lõi. |

---

### 2. Danh mục Use Case & Quan hệ (Use Case Catalog)

#### 2.1. Nhóm Use Case dùng chung (General Use Cases)
*   **[UC-01] Đăng nhập (Login)**
    *   **Tác nhân**: Student, Lecturer, Admin
    *   **Quan hệ**: 
        *   `<<include>>` **[UC-01.1] Xác thực bằng Email/Password** (Xác thực thông tin truyền thống)
        *   `<<include>>` **[UC-01.2] Xác thực bằng Google SSO** (Đăng nhập nhanh qua Google)

#### 2.2. Nhóm Use Case của Học sinh (Student Use Cases)
*   **[UC-02] Đăng ký tài khoản Student (Register Student Account)**
    *   **Tác nhân**: Student (Tự đăng ký tự do trên giao diện)
*   **[UC-03] Quản lý phiên chat (Manage Chat Sessions)**
    *   **Tác nhân**: Student
    *   **Quan hệ**: 
        *   `<<extend>>` **[UC-03.1] Đổi tên phiên chat (Rename Session)**
        *   `<<extend>>` **[UC-03.2] Xóa phiên chat (Delete Session)**
*   **[UC-04] Tương tác Chatbot (Interact with Chatbot)**
    *   **Tác nhân**: Student
*   **[UC-05] Quản lý Gói dịch vụ (Manage Subscription)**
    *   **Tác nhân**: Student
    *   **Quan hệ**: 
        *   `<<extend>>` **[UC-05.1] Nâng cấp Gói dịch vụ (Upgrade Subscription)**
        *   `<<include>>` **[UC-05.2] Thanh toán qua SePay (Pay via SePay)**

#### 2.3. Nhóm Use Case của Giảng viên (Lecturer Use Cases)
*   **[UC-06] Yêu cầu cấp tài khoản Lecturer (Request Lecturer Account)**
    *   **Tác nhân**: Giảng viên chưa có tài khoản (Gửi đơn yêu cầu chờ Admin duyệt)
*   **[UC-07] Quản lý tài liệu môn học (Manage Documents)**
    *   **Tác nhân**: Lecturer
    *   **Quan hệ**:
        *   `<<extend>>` **[UC-07.1] Tải lên tài liệu (Upload Document < 50MB)**
        *   `<<extend>>` **[UC-07.2] Xem danh sách tài liệu (View Document List)**
        *   `<<extend>>` **[UC-07.3] Xóa tài liệu (Delete Document)**

#### 2.4. Nhóm Use Case của Quản trị viên (Admin Use Cases)
*   **[UC-08] Quản lý tài khoản người dùng (Manage User Accounts)**
    *   **Tác nhân**: Admin
    *   **Quan hệ**:
        *   `<<extend>>` **[UC-08.1] Phê duyệt yêu cầu tài khoản Lecturer (Approve Lecturer Account Request)**
        *   `<<extend>>` **[UC-08.2] Sửa/Xóa tài khoản (Edit/Delete User)**
*   **[UC-09] Quản lý cấu hình hệ thống (Manage System Settings)**
    *   **Tác nhân**: Admin

---

### 3. Đặc tả chi tiết các Use Case cốt lõi (Use Case Specifications)

#### 3.1. [UC-04] Tương tác Chatbot (Interact with Chatbot)
*   **Tác nhân chính**: Học sinh (Student)
*   **Mô tả**: Học sinh gửi câu hỏi bằng ngôn ngữ tự nhiên để hỏi đáp về kiến thức môn học. Chatbot phân tích ngữ cảnh, tìm kiếm tài liệu (RAG) và trả về câu trả lời kèm nguồn trích dẫn.
*   **Tiền điều kiện (Preconditions)**:
    1. Học sinh đã đăng nhập thành công vào hệ thống.
    2. Tài khoản học sinh còn lượt sử dụng trong ngày (dựa theo gói Subscription hiện tại).
*   **Luồng xử lý cơ bản (Basic Flow)**:
    1. Học sinh truy cập giao diện Chatbot, chọn phiên chat mới hoặc cũ.
    2. Học sinh nhập câu hỏi vào ô chat và gửi đi.
    3. Hệ thống kiểm tra số lượt tin nhắn khả dụng của sinh viên trong ngày.
    4. Hệ thống tiến hành truy vấn cơ sở dữ liệu vector (Vector Database) để tìm kiếm các đoạn văn bản (chunks) có độ tương đồng ngữ nghĩa cao nhất.
    5. Hệ thống kết hợp câu hỏi ban đầu và các ngữ cảnh tìm được thành một Prompt hoàn chỉnh, gửi đến Mô hình ngôn ngữ lớn (LLM).
    6. LLM sinh ra câu trả lời dựa trên ngữ cảnh được cung cấp.
    7. Hệ thống định dạng nguồn trích dẫn chi tiết (slide, số trang tài liệu nguồn) và stream câu trả lời về màn hình học sinh.
    8. Hệ thống trừ đi 1 lượt câu hỏi trong hạn mức ngày của học sinh.
*   **Luồng thay thế (Alternative Flows)**:
    *   *Alt 1: Hết lượt sử dụng trong ngày*
        *   Tại bước 3, hệ thống phát hiện tài khoản đã vượt giới hạn ngày.
        *   Hệ thống không gọi RAG/LLM, trả về thông báo lỗi yêu cầu nâng cấp gói dịch vụ (Subscription).
    *   *Alt 2: Không tìm thấy ngữ cảnh phù hợp trong tài liệu*
        *   Tại bước 4, hệ thống không tìm thấy tài liệu liên quan đáp ứng mức độ tương đồng tối thiểu.
        *   Hệ thống từ chối trả lời ngoài phạm vi bài học và phản hồi: *"Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu bài học. Bạn vui lòng đặt câu hỏi khác."* (Tránh hallucination).
*   **Hậu điều kiện (Postconditions)**:
    *   Câu hỏi và câu trả lời được lưu vào lịch sử phiên chat.
    *   Giới hạn lượt dùng trong ngày của học sinh được cập nhật.

#### 3.2. [UC-07.1] Tải lên tài liệu (Upload Document < 50MB)
*   **Tác nhân chính**: Giảng viên (Lecturer)
*   **Mô tả**: Giảng viên tải lên các file tài liệu giảng dạy (PDF, DOCX, Slide) có dung lượng dưới 50MB để nạp tri thức cho hệ thống RAG.
*   **Tiền điều kiện (Preconditions)**:
    1. Giảng viên đã đăng nhập thành công vào hệ thống.
*   **Luồng xử lý cơ bản (Basic Flow)**:
    1. Giảng viên truy cập trang Quản lý tài liệu và nhấn chọn "Tải lên tài liệu".
    2. Giảng viên chọn một hoặc nhiều file từ máy tính cá nhân.
    3. Hệ thống (Frontend) kiểm tra định dạng file (PDF, DOCX, PPTX) và dung lượng file (< 50MB).
    4. Hệ thống thực hiện upload file lên kho lưu trữ của backend.
    5. Backend kích hoạt tiến trình xử lý ngầm (System Handler):
        *   Phân tách tài liệu thành các đoạn nhỏ (Document Chunking) theo Slide hoặc ngữ nghĩa.
        *   Gọi API Embedding để chuyển các đoạn văn bản thành Vector nhúng.
        *   Lưu trữ file gốc vào kho lưu trữ phẳng và các vector ngữ nghĩa vào cơ sở dữ liệu Vector DB.
    6. Hệ thống hiển thị thông báo tải lên và xử lý tài liệu thành công.
    7. Giao diện danh sách tài liệu tự động cập nhật.
*   **Luồng ngoại lệ (Exception Flows)**:
    *   *Exc 1: File không đúng định dạng hoặc vượt quá dung lượng*
        *   Tại bước 3, hệ thống phát hiện dung lượng > 50MB hoặc đuôi file không hợp lệ (ví dụ: .exe, .zip).
        *   Hệ thống ngăn chặn upload, hiển thị cảnh báo lỗi chi tiết cho Giảng viên.
*   **Hậu điều kiện (Postconditions)**:
    *   Tài liệu mới đã sẵn sàng phục vụ cho việc truy vấn RAG của học sinh ngay lập tức.
