- "Xây dựng chatbot cho phép sinh viên hỏi đáp dựa trên tài liệu môn học" thầy cho phép mình làm dự án này, tạo ra một cái trang web RAG, nhập tài liệu môn học vào và nó trả lời
- Phải scale nhiều trường, hỗ trợ nhiều kiểu dữ liệu như video, ảnh, text
- Có khả năng cho các trường đẩy syllabus lên và hỏi

"Xây dựng chatbot cho phép sinh viên hỏi đáp dựa trên tài liệu môn học, đồng thời nghiên cứu và so sánh hiệu quả giữa RAG và fine-tuning trong bối cảnh tiếng Việt."

"A. Tính năng hệ thống:
1. Quản lý tài liệu
•        Upload PDF, DOCX, slide bài giảng
•        Tự động chunk & embed tài liệu
•        Quản lý theo môn học / chương (chỉ cần demo 1 môn)
•        Xem danh sách tài liệu đã index
2. Chat & Hỏi đáp
•        Chat tự nhiên theo ngữ cảnh hội thoại
•        Trích dẫn nguồn tài liệu gốc
•        Giới hạn trả lời trong phạm vi tài liệu
•        Lịch sử hội thoại theo phiên

Embedding models để thực nghiệm so sánh (tham khảo):
multilingual-e5-base (miễn phí), text-embedding-3-small (OpenAI), PhoBERT-base (tiếng Việt), bge-m3 (BAAI)

B. Sản phẩm bàn giao (Deliverables):
1. Sản phẩm kỹ thuật:
  - Web app chatbot
  - Source code trên GitHub (có README)
  - Test set 50 câu hỏi + ground truth (là tập câu hỏi + câu trả lời đúng được chuẩn bị sẵn bởi con người, dùng để đánh giá xem chatbot trả lời có chính xác không)

---

Có thể embedding video thành vector được, và **Gemini Embedding 2 hỗ trợ trực tiếp embedding video**.

### Có thể embedding video không?

- Video (ví dụ MP4, MOV ≤ 120 giây một request) có thể được đưa vào mô hình embedding để sinh ra một vector dense thể hiện nội dung ngữ nghĩa của đoạn video đó.  
- Thay vì phải cắt video thành frame/ảnh rồi dùng mô hình riêng cho ảnh, với các mô hình hiện đại như Gemini Embedding 2, bạn có thể gửi video trực tiếp và nhận vector trong cùng không gian với text, image, audio, PDF. [vnai](https://vnai.vn/google-hop-nhat-van-ban-hinh-anh-video-va-am-thanh-trong-mot-khong-gian-vec-to-duy-nhat-voi-gemini-embedding-2/)

### Gemini Embedding có hỗ trợ video không?

- **Gemini Embedding 2** là mô hình embedding **multimodal native**, hỗ trợ:  
  - Văn bản (lên tới 8.192 token).  
  - Ảnh (tối đa 6 ảnh/request).  
  - **Video (MP4/MOV, tối đa 120 giây / request)**.  
  - Âm thanh (tới ~80 giây).  
  - PDF (tới ~6 trang). [bibigpt](https://bibigpt.co/vi/features/gemini-embedding-2-multimodal-explained)
- Tất cả các modal này được ánh xạ về **cùng một không gian vector semantic** (ví dụ 3.072 chiều), nên bạn có thể:  
  - Tìm video tương tự nhau bằng cosine similarity.  
  - Tìm video gần với một câu hỏi text (RAG đa phương thức). [bibigpt](https://bibigpt.co/vi/blog/posts/gemini-embedding-2-multimodal-vs-bibigpt-video-search-2026/)

### Bạn có thể dùng như thế nào?

- Qua API Gemini hoặc Vertex AI, bạn chỉ cần gửi video (hoặc kèm cả text/ảnh) và gọi endpoint embedding để nhận vector về, rồi lưu vào vector DB như QDrant, Chroma, Pinecone… để search/by similarity. [facebook](https://www.facebook.com/groups/binhdanhocai/posts/956453530176735/)
- Gemini Embedding 2 cũng tương thích với các framework như LangChain/LlamaIndex, nên bạn có thể tích hợp sẵn pipeline RAG video–text. [cometapi](https://www.cometapi.com/vi/what-is-gemini-embedding-2/)

---

Dựa trên các nghiên cứu và benchmark mới nhất năm 2025–2026 cho tài liệu tiếng Việt, đây là câu trả lời trực tiếp cho các RQ của bạn:

## **RQ chính: RAG hay Fine-tuning hiệu quả hơn?**

**RAG hiệu quả hơn cho chatbot hỗ trợ học tập với tài liệu tiếng Việt** trong hầu hết trường hợp, đặc biệt khi xét cả 3 tiêu chí:

| Tiêu chí | RAG | Fine-tuning |
|----------|-----|-------------|
| **Độ chính xác** | Cao hơn cho câu hỏi dựa trên dữ kiện; giảm hallucination nhờ truy xuất nguồn gốc  [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app) | Tốt hơn cho phong cách/định dạng, nhưng vẫn hallucinate nếu dữ liệu train không bao quát  [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app) |
| **Chi phí triển khai** | Thấp hơn: chỉ cần vector DB + embedding API, không cần GPU huấn luyện  [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app) | Cao hơn: cần GPU mạnh, thời gian huấn luyện dài, chi phí đáng kể  [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app) |
| **Khả năng cập nhật kiến thức** | **Vượt trội**: chỉ cần cập nhật vector DB, không cần train lại  [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app) | **Kém**: cần fine-tuning lại toàn bộ khi có dữ liệu mới  [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app) |

### Khi nào nên chọn RAG?
- Tài liệu bài giảng **thay đổi thường xuyên** (mỗi học kỳ, mỗi khóa học) [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app)
- Cần **dẫn chứng nguồn gốc** (student có thể kiểm tra slide nào) [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app)
- Ngân sách hạn chế, cần **triển khai nhanh** [tuyendung.evotek](https://tuyendung.evotek.vn/ai-engineer-roadmap-rag-la-gi-va-khi-nao-nen-su-dung-no-thay-vi-fine-tuning/)

### Khi nào nên kết hợp Fine-tuning?
- Cần chatbot nói **theo phong cách giáo viên cụ thể** (trang trọng, thân thiện, v.v.) [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app)
- Cần output **định dạng chuẩn** (luôn trả JSON, luôn có citation format) [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app)
- **Chiến lược hybrid**: Fine-tune nhẹ cho style + RAG cho kiến thức [tinai](https://tinai.vn/kien-thuc-ai/chon-rag-hay-fine-tune-dau-la-giai-phap-toi-uu-de-ai-hieu-du-lieu-noi-bo-cua-doanh-nghiep-ban.html)

***

## **RQ phụ 1: Chunking strategy nào cho slide PDF tốt nhất?**

**Document-based chunking (chia theo cấu trúc slide) + Semantic chunking** là tối ưu cho slide bài giảng PDF:

| Strategy | Ưu điểm với slide PDF | Nhược điểm | Retrieval accuracy |
|----------|----------------------|------------|-------------------|
| **Fixed-size** | Đơn giản, nhanh | Cắt ngang bullet points, mất ngữ cảnh slide  [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/) | Thấp nhất  [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/) |
| **Semantic** | Giữ trọn ý chủ đề, chunk mạch lạc  [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/) | Chi phí tính toán cao hơn | **Cao** cho dense content  [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/) |
| **Hierarchical** | Tốt cho slide dài có nhiều section  [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/) | Phức tạp triển khai | Cao cho query rộng + chi tiết  [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/) |

### Khuyến nghị cụ thể cho slide PDF:
1. **Bước 1**: Convert PDF → **Markdown** (giữ header `# Title`, `## Slide X`, bullet points) [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/)
2. **Bước 2**: Dùng **Document-based chunking** chia theo header slide [weaviate](https://weaviate.io/blog/chunking-strategies-for-rag)
3. **Bước 3**: Nếu slide quá dài (>500 tokens), dùng **Semantic chunking** hoặc **Recursive chunking** với overlap 10–20% [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/)

> **Best practice**: Chunk size ~300–500 tokens + overlap 50–100 tokens cho slide [weaviate](https://weaviate.io/blog/chunking-strategies-for-rag)

***

## **RQ phụ 2: Embedding model nào phù hợp nhất?**

**bge-vi-base** (BAAI fine-tuned) là lựa chọn tối ưu cho tài liệu kỹ thuật tiếng Việt:

| Model | Accuracy (STS-Vi) | MRR@10 (Retrieval) | Tốc độ (sent/s) | Phù hợp cho |
|-------|-------------------|-------------------|-----------------|-------------|
| **bge-vi-base** | **0.88** | **0.84** | 950 | **Semantic search / RAG**  [viblo](https://viblo.asia/p/so-sanh-cac-mo-hinh-embedding-cho-tieng-viet-qua-benchmark-2025-AoJe88G141j) |
| sBERT-Vi | 0.86 | 0.81 | 1,100 | Chatbot đa ngữ cảnh  [viblo](https://viblo.asia/p/so-sanh-cac-mo-hinh-embedding-cho-tieng-viet-qua-benchmark-2025-AoJe88G141j) |
| PhoBERT | 0.82 | 0.77 | 1,200 | Classification / fine-tune  [viblo](https://viblo.asia/p/so-sanh-cac-mo-hinh-embedding-cho-tieng-viet-qua-benchmark-2025-AoJe88G141j) |
| multilingual-e5 | ~0.85* | ~0.80* | ~900 | Đa ngữ, nhưng kém hơn bge-vi cho tiếng Việt  [arxiv](https://arxiv.org/html/2402.05672v1) |
| OpenAI ada-002 | ~0.83* | ~0.78* | API-dependent | Tốt nhưng đắt, không tối ưu tiếng Việt  [mcivietnam](https://mcivietnam.com/blog-detail/rag-retrieval-augmented-generation-bo-nao-co-tri-nho-cho-ai-1QWABI/) |

\* Estimaste từ benchmark đa ngữ, không cụ thể tiếng Việt [arxiv](https://arxiv.org/html/2402.05672v1)

### Tại sao bge-vi-base tốt nhất?
- **Fine-tuned trên hàng triệu cặp Q-A tiếng Việt** [viblo](https://viblo.asia/p/so-sanh-cac-mo-hinh-embedding-cho-tieng-viet-qua-benchmark-2025-AoJe88G141j)
- **Vượt trội retrieval + similarity** trong benchmark 2025 [bizfly](https://bizfly.vn/techblog/so-sanh-cac-mo-hinh-embedding-cho-tieng-viet-qua-benchmark.html)
- Dễ tích hợp với LangChain/LlamaIndex [viblo](https://viblo.asia/p/so-sanh-cac-mo-hinh-embedding-cho-tieng-viet-qua-benchmark-2025-AoJe88G141j)

### Nếu cần multilingual (có tiếng Anh + Việt):
- **multilingual-e5-large** → nên fine-tune thêm cho tiếng Việt nếu có corpus riêng [reddit](https://www.reddit.com/r/LocalLLaMA/comments/19b6rar/hi_im_seeking_for_any_embedding_model_for/)

### Pipeline đề xuất cho RAG của bạn:
```python
from sentence_transformers import SentenceTransformer

# Embedding model
model = SentenceTransformer("BAAI/bge-vi-base")  # [web:7]

# Chunking: Markdown-based + Semantic
# Vector DB: ChromaDB / FAISS
# LLM: Claude / GPT-4o (untuk generation)
```

***

## **Tóm tắt khuyến nghị cho thesis của bạn**

| RQ | Câu trả lời ngắn | justification chính |
|----|------------------|---------------------|
| **RAG vs Fine-tuning** | RAG | Cập nhật dễ, chi phí thấp, độ chính xác cao cho Q/A  [tuyendung.hachinet](https://tuyendung.hachinet.com/blog/rag-vs-fine-tuning-cach-nao-tot-hon-khi-xay-ai-app) |
| **Chunking strategy** | Document-based + Semantic | Giữ cấu trúc slide, retrieval accuracy cao  [facebook](https://www.facebook.com/groups/miaigroup/posts/2065913510846577/) |
| **Embedding model** | bge-vi-base | MRR@10 0.84, tốt nhất cho tiếng Việt  [viblo](https://viblo.asia/p/so-sanh-cac-mo-hinh-embedding-cho-tieng-viet-qua-benchmark-2025-AoJe88G141j) |

Có cần tôi giúp bạn thiết kế experimental setup (metrics, baseline models, dataset) để validate các giả thuyết này trong thesis không?
