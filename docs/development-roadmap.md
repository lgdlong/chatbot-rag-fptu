# LỘ TRÌNH PHÁT TRIỂN HỆ THỐNG (DEVELOPMENT ROADMAP)

Tài liệu này đóng vai trò là bản thiết kế lộ trình phát triển và kiểm soát tiến độ thực tế của dự án **FPTU Chatbot RAG**. Lộ trình được phân chia làm 6 giai đoạn rõ ràng nhằm hiện thực hóa sản phẩm kỹ thuật và đáp ứng các mục tiêu nghiên cứu khoa học.

---

## 🗺️ Tóm Tắt Trạng Thái Các Cột Mốc (Milestones Overview)

| Giai đoạn | Mục tiêu chính | Tiến độ | Trạng thái | Dự kiến hoàn thành |
| :---: | :--- | :---: | :---: | :---: |
| **Phase 1** | Khởi tạo Monorepo & Cơ sở dữ liệu Đa trường (Multi-tenant DB) | **100%** | **ĐÃ HOÀN THÀNH** | Tuần 1 |
| **Phase 2** | Tích hợp Better Auth & Phân quyền Organization Plugin | **60%** | **ĐANG TRIỂN KHAI** | Tuần 2 - 3 |
| **Phase 3** | Xây dựng Pipeline Ingestion & Gemini Multimodal Embedding | **10%** | **ĐANG TRIỂN KHAI** | Tuần 4 - 5 |
| **Phase 4** | Phát triển Nhân RAG Chatbot, SSE Streaming & Citations | **0%** | **ĐÃ LÊN KẾ HOẠCH** | Tuần 6 - 7 |
| **Phase 5** | Dashboard Phân Tích & Giám Sát Chi Phí API cho Giảng Viên | **0%** | **ĐÃ LÊN KẾ HOẠCH** | Tuần 8 |
| **Phase 6** | Thực nghiệm so sánh RAG vs Fine-tuning & Đánh giá luận văn | **0%** | **ĐÃ LÊN KẾ HOẠCH** | Tuần 9 - 10 |

---

## 🔍 Chi Tiết Các Giai Đoạn Phát Triển (Detailed Phases)

### 📌 Giai đoạn 1: Thiết Lập Môi Trường & Cơ Sở Dữ Liệu Đa Trường (Đã hoàn thành)
* **Mục tiêu:** Khởi tạo dự án Monorepo tiêu chuẩn, cấu hình kết nối database quan hệ và chạy thử nghiệm cấu trúc API gateway.
* **Chi tiết công việc:**
  * [x] Tạo cấu trúc Monorepo phân tách rõ ràng: Backend (`api/`) và Frontend (`web/`).
  * [x] Tạo Docker Compose khởi chạy PostgreSQL cục bộ.
  * [x] Thiết kế schema cơ sở dữ liệu quan hệ nâng cao hỗ trợ `Tenant`, `User`, `Course`, `Document`, `ChatSession` bằng Prisma ORM.
  * [x] Viết API Health Check chi tiết để đo đạc độ trễ cơ sở dữ liệu và lượng RAM tiêu thụ.
* **Tiêu chí hoàn thành:** Server backend khởi chạy mượt mà, kết nối thành công PostgreSQL, build không lỗi.

---

### 📌 Giai đoạn 2: Tích Hợp Hệ Thống Xác Thực Better Auth & Phân Quyền Multi-tenant (Đang triển khai)
* **Mục tiêu:** Cài đặt toàn bộ module xác thực bảo mật, xử lý đăng ký, đăng nhập và phân chia không gian tổ chức (Tenant).
* **Chi tiết công việc:**
  * [x] Cài đặt `better-auth` phía backend Hono.js và frontend Next.js.
  * [x] Cấu hình adapter Prisma kết nối các bảng User/Session.
  * [x] Kích hoạt và cấu hình **Organization Plugin** để quản lý Multi-tenant logic.
  * [/] Xây dựng Middleware xác thực `requireAuth` và cô lập tri thức `requireTenant` trên Hono.js.
  * [ ] Thiết kế giao diện Đăng nhập, Đăng ký (Google FPT SSO và Email/Password), Quản trị lời mời tham gia tổ chức.
  * [ ] Triển khai Plugin OpenAPI tự động sinh Swagger docs cho module Auth.
* **Tiêu chí hoàn thành:** Đăng nhập thành công, phân biệt chính xác quyền `STUDENT`, `LECTURER`, và `ADMIN`. Header `x-tenant-id` hoạt động đồng bộ.

---

### 📌 Giai đoạn 3: Pipeline Tiền Xử Lý & Nhúng Tài Liệu Đa Phương Thức (Đang triển khai)
* **Mục tiêu:** Hiện thực hóa tính năng tải lên tài liệu học tập, xoá tài liệu đã nạp an toàn, thực hiện trích xuất nội dung và nhúng vector đa phương thức (Văn bản + Video).
* **Chi tiết công việc:**
  * [ ] Xây dựng giao diện Drag & Drop File Upload hỗ trợ PDF, DOCX, Slide PPTX, và Video MP4.
  * [x] Cho phép xoá tài liệu PDF đã nạp, đồng bộ dọn file chunk và vector trong Qdrant.
  * [ ] Viết bộ phân đoạn (Chunking service): Trích xuất Markdown từ PDF/PPTX, chia phân đoạn slide có overlap.
  * [ ] Tích hợp API **Gemini Embedding 2** để nhúng video ngắn ($\le 120$ giây) thu về vector 3072 chiều.
  * [ ] Khởi chạy và kết nối Cơ sở dữ liệu Vector (**Qdrant** hoặc **ChromaDB**).
  * [ ] Lưu trữ vector kèm payload chi tiết (Text gốc, trang slide, timestamp video).
* **Tiêu chí hoàn thành:** Giảng viên upload tài liệu lên môn học, hệ thống xử lý tự động và lưu trữ vector thành công vào Vector DB không lỗi.

---

### 📌 Giai đoạn 4: Nhân Hỏi Đáp RAG & Stream Phản Hồi SSE (Đã lên kế hoạch)
* **Mục tiêu:** Xây dựng phần lõi RAG Chatbot, xử lý chuỗi hội thoại thông minh và hiển thị câu trả lời kèm dẫn nguồn trực quan.
* **Chi tiết công việc:**
  * [ ] Xây dựng mô-đun Tái cấu trúc câu hỏi (Query Rewriting) dựa trên lịch sử chat sử dụng LLM.
  * [ ] Thực hiện tìm kiếm ngữ nghĩa (Cosine Similarity) trên Vector DB để lấy ra 5 phân đoạn khớp nhất.
  * [ ] Thiết kế Prompt Template chặt chẽ với Guardrails chống ảo tưởng thông tin.
  * [ ] Viết Hono Streaming Helper gửi câu trả lời dạng **Server-Sent Events (SSE)** về client.
  * [ ] Thiết kế client UI Next.js nhận luồng text và render thẻ trích dẫn (Citations). Nhấn vào citation sẽ mở popup tài liệu/video tại đúng vị trí trích dẫn.
* **Tiêu chí hoàn thành:** Sinh viên chat mượt mà, chatbot hiển thị thẻ nguồn trích dẫn chính xác và phản đối trả lời khi câu hỏi nằm ngoài giáo trình.

---

### 📌 Giai đoạn 5: Dashboard Phân Tích & Giám Sát Chi Phí API (Đã lên kế hoạch)
* **Mục tiêu:** Cung cấp số liệu thống kê cho Giảng viên để cải tiến giáo trình, và giúp Admin giám sát chi phí token API.
* **Chi tiết công việc:**
  * [ ] Xây dựng Dashboard quản lý cho Giảng viên: Thống kê các câu hỏi bị sinh viên downvote nhiều nhất, trích xuất các chủ đề (Keywords) sinh viên quan tâm học tập.
  * [ ] Xây dựng Dashboard quản lý chi phí cho Admin: Đo lường số token tiêu thụ hàng tuần, tính toán chi phí API của từng môn học / từng Tenant.
  * [ ] Tối ưu hóa caching (Redis/In-memory) các câu hỏi phổ biến để giảm chi phí gọi LLM ngoài.
* **Tiêu chí hoàn thành:** Hiển thị trực quan biểu đồ tần suất câu hỏi, danh sách downvote và báo cáo chi phí chính xác.

---

### 📌 Giai đoạn 6: Thực Nghiệm Đánh Giá Luận Văn (RAG vs Fine-tuning) (Đã lên kế hoạch)
* **Mục tiêu:** Đo đạc các chỉ số khoa học để hoàn thành báo cáo thực nghiệm so sánh RAG và Fine-tuning.
* **Chi tiết công việc:**
  * [ ] Chuẩn bị bộ dữ liệu đánh giá chuẩn (Test set): **50 câu hỏi** đa dạng kèm **câu trả lời chuẩn (Ground Truth)** được chuẩn bị sẵn bởi chuyên gia môn học.
  * [ ] Thiết lập hệ thống benchmark đo lường:
    * Độ chính xác nội dung dữ kiện (Precision, Recall).
    * Mức độ ảo tưởng (Hallucination rate).
    * Thời gian phản hồi (Time to First Token & Total Latency).
    * Chi phí tài chính (Cost per query).
  * [ ] Thực hiện Fine-tune mô hình nhỏ (như Llama-3-8B hoặc PhoGPT) trên bộ dataset môn học để đối chiếu.
  * [ ] Xuất bảng biểu, biểu đồ so sánh chi tiết để nạp vào tài liệu luận văn tốt nghiệp.
* **Tiêu chí hoàn thành:** Hoàn tất báo cáo thực nghiệm với đầy đủ số liệu chứng minh tính ưu việt của mô hình RAG đề xuất.
