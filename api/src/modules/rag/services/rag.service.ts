import { readFile } from 'node:fs/promises'
import { QdrantService } from './qdrant.service.js'
import { GeminiService } from './gemini.service.js'

export class RagService {
  private static COLLECTION_NAME = 'fptu_rag_documents'

  // Lưu ý: Hàm xử lý PDF đã được chuyển sang BullMQ Worker nền độc lập
  // để tránh chiếm dụng CPU của Main Thread (Node.js). Hono API chỉ đẩy job vào Redis.

  /**
   * Truy xuất ngữ cảnh kiến thức và sinh câu trả lời
   */
  public static async retrieveAndGenerate(
    query: string,
    courseId: string,
    organizationId: string,
    chatHistory: Array<{ role: 'user' | 'model'; parts: string[] }>,
    onChunk: (text: string) => void
  ) {
    // 1. Tạo embedding cho câu hỏi của sinh viên bằng định dạng prefix bất đối xứng
    const queryPrompt = `task: question answering | query: ${query}`
    const queryVector = await GeminiService.generateEmbedding(queryPrompt)

    // 2. Truy xuất k=5 phân đoạn tài liệu phù hợp nhất từ Qdrant
    // Đảm bảo an toàn đa trường bằng cách lọc theo organizationId và courseId
    const searchResults = await QdrantService.searchSimilarity(
      this.COLLECTION_NAME,
      queryVector,
      organizationId,
      courseId,
      5
    )

    // 3. Xây dựng ngữ cảnh Đa phương thức (Context)
    // Tải trực tiếp file chunk PDF của từng trang từ đĩa và đẩy dạng Base64 vào Prompt
    const contextParts: any[] = []
    const citations: any[] = []

    for (let i = 0; i < searchResults.length; i++) {
      const res = searchResults[i]
      const payload = res.payload as any

      if (!payload) continue

      // Đọc file chunk PDF đã lưu từ đĩa trong lúc Ingestion
      const chunkPath = `./uploads/chunks/${payload.documentId}_page_${payload.page}.pdf`
      const chunkBuffer = await readFile(chunkPath).catch(() => null)

      if (chunkBuffer) {
        const base64Data = chunkBuffer.toString('base64')
        contextParts.push({ text: `[Nguồn ${i + 1}] Tài liệu: ${payload.documentName}, Trang: ${payload.page}` })
        contextParts.push({ inlineData: { mimeType: 'application/pdf', data: base64Data } })
      }

      citations.push({
        documentName: payload.documentName,
        page: payload.page
      })
    }

    // 4. Xây dựng System Instruction cho Gemini
    const systemPrompt = `Bạn là trợ lý giảng dạy AI thông minh của Đại học FPT (FPTU).
Nhiệm vụ của bạn là giải đáp thắc mắc môn học dựa TRÊN các Tài liệu đính kèm (dưới dạng file PDF/Hình ảnh).

HƯỚNG DẪN TRẢ LỜI:
1. Hãy phân tích kỹ các trang tài liệu PDF được đính kèm trong câu hỏi. Nếu tài liệu không chứa thông tin, hãy lịch sự từ chối.
2. Trả lời bằng tiếng Việt dễ hiểu, logic. Khi trích dẫn thông tin, hãy ghi rõ nguồn (VD: Slide_Chuong_1.pdf - trang 12).
3. TUYỆT ĐỐI KHÔNG sử dụng định dạng markdown ( KHÔNG dùng **, ##, *, -, >, v.v). Chỉ dùng văn bản thuần túy (plain text).`

    // 5. Sinh câu trả lời dạng Streaming qua Gemini API
    // Kết hợp System Prompt, History, Câu hỏi sinh viên và cả CÁC FILE PDF VỪA RETRIEVE
    const fullAnswer = await GeminiService.generateChatStream(
      systemPrompt,
      chatHistory,
      query,
      contextParts, // Truyền trực tiếp PDF chunks vào Model
      onChunk
    )

    return {
      citations,
      fullAnswer,
    }
  }
}
