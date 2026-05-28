# Tài liệu Đặc tả Yêu cầu Phần mềm (SRS)
## Hệ thống Chatbot RAG Hỗ trợ Học tập (Môn học: Software Modeling and Design)

---

### 1. Giới thiệu tổng quan

#### 1.1. Mục đích
Tài liệu này đặc tả chi tiết các yêu cầu nghiệp vụ của hệ thống **Chatbot RAG** phục vụ cho môn học "Software Modeling and Design: UML, Use Cases, Patterns, and Software Architectures". Hệ thống cung cấp công cụ trò chuyện thông minh giúp học sinh ôn tập, tra cứu kiến thức dễ dàng thông qua việc hỏi đáp trực tiếp dựa trên tài liệu bài giảng do giảng viên cung cấp.

#### 1.2. Phạm vi dự án
Phạm vi của hệ thống được giới hạn ở quy mô nhỏ, quản lý một số lượng tài liệu nhất định (khoảng 2 chương học). Trọng tâm của hệ thống là cung cấp trải nghiệm hỏi đáp chính xác, tự nhiên, và quy trình quản lý tài liệu đơn giản nhất có thể. Hệ thống không yêu cầu kiến trúc phân loại tài liệu phức tạp mà sử dụng kho lưu trữ dạng phẳng (flat storage). Toàn bộ hệ thống sẽ truy xuất kiến thức từ kho lưu trữ chung này.

#### 1.3. Giải thích thuật ngữ và Chữ viết tắt (Glossary & Acronyms)

| Thuật ngữ / Viết tắt | Ý nghĩa thực tế trong hệ thống |
|---|---|
| **RAG (Retrieval-Augmented Generation)** | Tạo sinh tăng cường truy xuất dữ liệu: Chatbot tìm tài liệu giảng viên tải lên trước khi gửi cho AI sinh câu trả lời. |
| **LLM (Large Language Model)** | Mô hình ngôn ngữ lớn: Sử dụng các mô hình của **Gemini** để hiểu câu hỏi và viết câu trả lời tự nhiên. |
| **Embedding** | Kỹ thuật vector hóa dữ liệu: Biến các câu chữ trong slide bài học thành dãy số (vector) để tìm kiếm ngữ nghĩa thô và chính xác. |
| **Chunking** | Phân đoạn tài liệu: Chia slide, file PDF thành các đoạn text nhỏ tối ưu cho AI đọc hiểu. |
| **Citations** | Trích dẫn nguồn gốc: Chỉ rõ câu trả lời được trích từ Slide số mấy, trang nào hoặc giây thứ mấy trong video của giảng viên. |
| **SSO (Single Sign-On)** | Đăng nhập một lần: Ở đây hỗ trợ đăng nhập nhanh bằng tài khoản Google dành cho học sinh. |
| **SePay** | Cổng thanh toán trực tuyến của Việt Nam hỗ trợ giao dịch QR Code động chuyển khoản ngân hàng. |
| **Flat Storage** | Kho lưu trữ phẳng: Toàn bộ tài liệu tải lên được gom chung vào một kho tổng thay vì chia thư mục phức tạp. |

#### 1.4. Bối cảnh hệ thống & Kiến trúc công nghệ (System Perspective & Tech Stack)
Hệ thống được phát triển theo mô hình **Monorepo** phân rã các dịch vụ:
*   **Frontend**: Ứng dụng Web viết bằng **Next.js 15+ (App Router)** và **Tailwind CSS**. Giao diện mượt mà, tối ưu SEO, hỗ trợ Responsive và tích hợp thư viện Mantine / UI components.
*   **Backend API**: API Gateway viết bằng **Hono.js** kết hợp **TypeScript** chạy trên môi trường Node.js. Cung cấp API nhanh, nhẹ, bảo mật và hỗ trợ dữ liệu dòng (Streaming).
*   **Database**: Hệ thống cơ sở dữ liệu **PostgreSQL** kết hợp extension **pgvector** và ORM **Prisma** giúp lưu trữ đồng thời dữ liệu nghiệp vụ và dữ liệu vector nhúng.
*   **AI Engine**: Tích hợp mô hình nhúng tiếng Việt **BAAI/bge-vi-base** kết hợp **Gemini Embedding** (vector 3072 chiều) hỗ trợ đa phương thức (Multimodal) tải lên video/âm thanh và tìm kiếm ngữ nghĩa chính xác.

---

### 2. Định nghĩa các Tác nhân (Actors)

Hệ thống phân quyền nghiêm ngặt thành 3 nhóm người dùng chính, mỗi nhóm chỉ được thao tác trong phạm vi quyền hạn của mình:

1. **Học sinh (Student)**
   - **Đặc điểm**: Người dùng cuối của hệ thống.
   - **Quyền hạn chính**: Tương tác với chatbot để hỏi đáp, tra cứu lịch sử chat và tự quản lý các gói dịch vụ (Subscription) của mình. Không được quyền thao tác với tài liệu.
2. **Giảng viên (Lecturer)**
   - **Đặc điểm**: Người cung cấp nội dung học tập.
   - **Quyền hạn chính**: Tải lên hệ thống các tài liệu môn học (Slide, PDF, DOCX), xem danh sách và xóa các tài liệu cũ. Không cần thao tác phân loại phức tạp.
3. **Quản trị viên (Admin)**
   - **Đặc điểm**: Người vận hành hệ thống.
   - **Quyền hạn chính**: Quản lý toàn bộ hệ thống, quản lý và phê duyệt tài khoản người dùng, cũng như các thiết lập lõi.

---

### 3. Yêu cầu Nghiệp vụ chi tiết (Business Requirements)

#### 3.1. Quản lý Tài khoản & Định danh
- **Đăng nhập**: Hỗ trợ đăng nhập qua 2 phương thức: Email/Password truyền thống và Google SSO.
- **Tạo tài khoản Student**: Sinh viên được phép tự do đăng ký tài khoản trên hệ thống.
- **Tạo tài khoản Lecturer**: Giảng viên không thể tự đăng ký tự do. Họ phải gửi một yêu cầu (request) tạo tài khoản trên hệ thống, sau đó Admin sẽ duyệt và cấp quyền.

#### 3.2. Nhóm chức năng Chatbot & Hỏi đáp (Dành cho Student)
- **Trò chuyện ngữ cảnh**: Khả năng giao tiếp bằng ngôn ngữ tự nhiên, hệ thống hiểu được ngữ cảnh của các câu hỏi liên tiếp trong cùng một phiên chat (Session).
- **Trích dẫn nguồn (Citations)**: Mọi câu trả lời từ chatbot bắt buộc phải trích dẫn rõ nguồn gốc thông tin (từ tài liệu nào, slide nào).
- **Xử lý tài liệu bị xóa**: Trong trường hợp Giảng viên đã xóa một tài liệu khỏi hệ thống, các trích dẫn cũ liên quan đến tài liệu đó trong lịch sử chat của sinh viên sẽ hiển thị thông báo: *"Tài liệu nguồn đã bị xóa"*.
- **Giới hạn phạm vi**: Chatbot chỉ được phép lấy thông tin từ kho tài liệu đã được giảng viên nạp, không tự động bịa hoặc lấy kiến thức ngoài. Do lượng tài liệu ít, hệ thống sẽ mặc định tìm kiếm trên toàn bộ kho tài liệu.
- **Quản lý phiên chat (Session)**: 
  - Hệ thống sẽ tự động đặt tên session dựa trên nội dung câu hỏi đầu tiên.
  - Sinh viên được phép đổi tên (rename) session theo ý muốn.
  - Sinh viên được phép xóa các session cũ.

#### 3.3. Nhóm chức năng Quản lý Tài liệu (Dành cho Lecturer)
- **Tải lên tài liệu**: Hỗ trợ các định dạng PDF, DOCX và Slide bài giảng. Giới hạn dung lượng tối đa cho mỗi tài liệu là **dưới 50MB**.
- **Kho lưu trữ đơn giản (Flat Storage)**: Tài liệu được nạp chung vào một kho tổng mà không cần phân loại theo cấp bậc phức tạp.
- **Xem và xóa**: Có khả năng liệt kê các tài liệu đã có trong kho và cho phép giảng viên xóa khi nội dung đã lỗi thời.

#### 3.4. Nhóm chức năng Subscription - Gói dịch vụ (Dành cho Student)
Hệ thống giới hạn số lượng tin nhắn của học sinh thông qua các gói đăng ký được **tính theo chu kỳ từng tháng**. Việc thanh toán được xử lý qua cổng **SePay**.
- **Gói Cơ bản (Basic - Mặc định)**: Cấp miễn phí khi tạo tài khoản. Giới hạn: **10 câu hỏi/ngày**.
- **Gói Bạc (Silver)**: Trả phí gia hạn hàng tháng (Giá: **10.000 VNĐ**). Giới hạn: **50 câu hỏi/ngày**.
- **Gói Vàng (Gold)**: Trả phí gia hạn hàng tháng (Giá: **20.000 VNĐ**). Giới hạn: **200 câu hỏi/ngày**.

---

### 4. Quy trình Nghiệp vụ (Business Flows) - Swimlane Diagrams

Dưới đây là các luồng nghiệp vụ chính yếu mô tả sự tương tác giữa các tác nhân và hệ thống, được lược bỏ các chi tiết kỹ thuật hệ thống.

Các biểu đồ Swimlane chi tiết được thiết kế bằng PlantUML và tách riêng thành các tài liệu độc lập để dễ dàng tham chiếu.

#### 4.1. Quy trình Hỏi đáp với Chatbot
Mô tả luồng học sinh tương tác để tra cứu kiến thức.
- **Biểu đồ**: [flow-chatbot.puml](./flow-chatbot.puml)

#### 4.2. Quy trình Quản lý Tài liệu (Upload)
Mô tả cách giảng viên nạp kiến thức vào hệ thống.
- **Biểu đồ**: [flow-document-upload.puml](./flow-document-upload.puml)

#### 4.3. Quy trình Nâng cấp Gói dịch vụ (Subscription)
Mô tả quy trình học sinh mua thêm giới hạn sử dụng hệ thống.
- **Biểu đồ**: [flow-subscription.puml](./flow-subscription.puml)

#### 4.4. Quy trình Yêu cầu & Phê duyệt tài khoản Giảng viên (Lecturer Registration)
Mô tả quy trình giảng viên đăng ký tài khoản và được admin phê duyệt.
- **Biểu đồ**: [flow-lecturer-registration.puml](./flow-lecturer-registration.puml)

#### 4.5. Quy trình Đăng nhập & Xác thực (Authentication & Login)
Mô tả quy trình người dùng đăng nhập bằng tài khoản cục bộ hoặc Google SSO.
- **Biểu đồ**: [flow-login.puml](./flow-login.puml)

#### 4.6. Quy trình Quản lý Phiên chat (Session Management)
Mô tả quy trình học sinh quản lý lịch sử phiên chat (đổi tên và xóa phiên chat).
- **Biểu đồ**: [flow-session-management.puml](./flow-session-management.puml)

---

### 5. Đặc tả Use Case (Use Case Specification)

Để tài liệu SRS được tối ưu, gọn gàng và dễ bảo trì, toàn bộ cấu trúc Use Case chi tiết (bao gồm các quan hệ `<<include>>`, `<<extend>>`, danh mục tác nhân và đặc tả chi tiết của các Use Case cốt lõi phục vụ thiết kế Use Case Diagram) đã được tách thành một tài liệu độc lập:

*   **Tài liệu tham chiếu chi tiết**: [usecase.md](./usecase.md)

---

### 6. Yêu cầu Phi chức năng (Non-Functional Requirements)

1. **Bảo mật và Phân quyền**: Đảm bảo ranh giới phân quyền nghiêm ngặt giữa Học sinh, Giảng viên và Admin. Học sinh tuyệt đối không thể gọi các API tải hay xóa tài liệu của giảng viên.
2. **Tính trung thực (Reliability)**: Chatbot không được bịa đặt thông tin (hallucinate). Nếu không tìm thấy thông tin phù hợp trong kho tài liệu mà giảng viên đã tải lên, chatbot bắt buộc phải từ chối trả lời thay vì tự sinh kiến thức ngoài.
3. **Cơ sở dữ liệu (Database)**: Hệ thống sử dụng PostgreSQL kết hợp extension `pgvector` để lưu trữ đồng thời dữ liệu nghiệp vụ thông thường và dữ liệu Vector nhúng đa chiều.
4. **Giao diện Người dùng (UI/UX)**:
   - Sử dụng thư viện UI **Mantine** kết hợp phong cách Tailwind CSS hiện đại.
   - Phối màu chủ đạo: Xanh dương đậm và Vàng Gold, tạo cảm giác chuyên nghiệp, học thuật và sang trọng.
   - Thiết kế ưu tiên các góc vuông hoặc bo góc cực nhỏ (low border-radius).
   - Nguồn trích dẫn (Citations) được hiển thị dưới dạng nút bấm (VD: `[1]`, `[2]`), khi bấm vào sẽ mở Modal xem trước đoạn text/slide trích dẫn trực tiếp.
5. **Cô lập Dữ liệu Đa trường (Multi-tenant Isolation)**: 
   - Mọi yêu cầu chat hoặc quản lý tài liệu từ giao diện người dùng bắt buộc phải đi qua middleware xác thực tập trung trên backend Hono.js.
   - Hệ thống phải kiểm tra quyền sở hữu thông qua khóa ngoại tổ chức (`tenantId`) để đảm bảo cô lập dữ liệu tuyệt đối, ngăn chặn triệt để hiện tượng rò rỉ hoặc truy cập chéo dữ liệu tài liệu học tập giữa các trường/đơn vị khác nhau.
6. **Truyền luồng dữ liệu thời gian thực (SSE Streaming & Citations)**: 
   - Hệ thống sử dụng kỹ thuật **Server-Sent Events (SSE) Streaming** để trả về câu chữ thời gian thực (hiệu ứng typing), nâng cao trải nghiệm phản hồi nhanh của người dùng.
   - Mỗi câu trả lời stream về bắt buộc phải đi kèm với mảng `citations` chứa nguồn trích dẫn chi tiết (Slide số mấy, trang nào, hoặc giây thứ bao nhiêu trong video bài giảng gốc).
7. **Xử lý nền & Hiệu năng (Background Ingestion Workers)**:
   - Các tác vụ xử lý tài liệu nặng như phân tách văn bản (document chunking), gọi API nhúng (embedding) và đồng bộ database phải được chuyển xuống chạy ngầm (asynchronous background workers).
   - Tránh gây nghẽn luồng xử lý chính của API Gateway, đảm bảo thời gian phản hồi API cơ bản luôn dưới **200ms**.
