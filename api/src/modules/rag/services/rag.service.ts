import { readFile } from 'node:fs/promises'
import { GeminiService } from './gemini.service.js'
import { prisma } from '../../auth/services/db.service.js'

export class RagService {
  /**
   * Truy xuất ngữ cảnh kiến thức và sinh câu trả lời bằng pgvector + Gemini
   */
  public static async retrieveAndGenerate(
    query: string,
    courseId: string | null,
    chatHistory: Array<{ role: 'user' | 'model'; parts: string[] }>,
    onChunk: (text: string) => void
  ) {
    // 1. Tạo embedding cho câu hỏi bằng Gemini Embedding 2
    const queryPrompt = `task: question answering | query: ${query}`
    const queryVector = await GeminiService.generateEmbedding(queryPrompt)

    // Chuyển queryVector thành chuỗi JSON định dạng mảng để truyền vào query SQL
    const vectorString = `[${queryVector.join(',')}]`

    // 2. Truy xuất k=5 chunks tài liệu phù hợp nhất từ pgvector trong PostgreSQL
    // Nếu courseId có giá trị thì lọc theo môn học, ngược lại tìm trên toàn bộ tài liệu (Global RAG)
    const searchResults = courseId
      ? await prisma.$queryRaw<Array<{
          id: string;
          document_id: string;
          page_number: number;
          document_name: string;
        }>>`
          SELECT 
            dc.id,
            dc.document_id,
            dc.page_number,
            d.name as document_name
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE d.course_id = ${courseId}
            AND d.status = 'COMPLETED'
          ORDER BY dc.embedding <=> ${vectorString}::vector
          LIMIT 5;
        `
      : await prisma.$queryRaw<Array<{
          id: string;
          document_id: string;
          page_number: number;
          document_name: string;
        }>>`
          SELECT 
            dc.id,
            dc.document_id,
            dc.page_number,
            d.name as document_name
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE d.status = 'COMPLETED'
          ORDER BY dc.embedding <=> ${vectorString}::vector
          LIMIT 5;
        `

    // 3. Xây dựng ngữ cảnh Đa phương thức (Context)
    const contextParts: any[] = []
    const citations: any[] = []

    for (let i = 0; i < searchResults.length; i++) {
      const chunk = searchResults[i]

      // Đọc file chunk PDF đã lưu từ đĩa trong lúc Ingestion
      const chunkPath = `./uploads/chunks/${chunk.document_id}_page_${chunk.page_number}.pdf`
      const chunkBuffer = await readFile(chunkPath).catch(() => null)

      if (chunkBuffer) {
        const base64Data = chunkBuffer.toString('base64')
        contextParts.push({ text: `[Nguồn ${i + 1}] Tài liệu: ${chunk.document_name}, Trang: ${chunk.page_number}` })
        contextParts.push({ inlineData: { mimeType: 'application/pdf', data: base64Data } })
      }

      // Lưu documentId để kiểm tra trạng thái bị xóa sau này
      citations.push({
        documentId: chunk.document_id,
        documentName: chunk.document_name,
        page: chunk.page_number
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
    const fullAnswer = await GeminiService.generateChatStream(
      systemPrompt,
      chatHistory,
      query,
      contextParts,
      onChunk
    )

    return {
      citations,
      fullAnswer,
    }
  }
}

