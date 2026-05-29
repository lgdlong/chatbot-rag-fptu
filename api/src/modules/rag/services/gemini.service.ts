import { GoogleGenAI } from '@google/genai'
import { ENV } from '../../../config/env.js'

export class GeminiService {
  private static ai: GoogleGenAI

  private static getSdk(): GoogleGenAI {
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY })
    }
    return this.ai
  }

  /**
   * Tạo Embedding 3072 chiều bằng Gemini Embedding 2
   * Hỗ trợ cả nhúng văn bản và payload đa phương thức (PDF, image, audio, video)
   */
  public static async generateEmbedding(contents: string | any): Promise<number[]> {
    const ai = this.getSdk()
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents,
      })

      const embeddings = (response as any).embeddings
      if (embeddings && embeddings.length > 0) {
        return embeddings[0].values
      }

      // fallback for older API versions
      const fallbackEmbeddings = (response as any).embedding
      if (fallbackEmbeddings?.values) {
        return fallbackEmbeddings.values
      }

      throw new Error('[Gemini] No embedding values found in response.')
    } catch (error: any) {
      console.error('[Gemini] API error:', error)
      throw error
    }
  }

  public static async generateSelfQuery(query: string): Promise<{ search: string; chapter: string | null }> {
    const ai = this.getSdk()
    const prompt = `Bạn là hệ thống bóc tách siêu dữ liệu tìm kiếm. Đọc câu hỏi sau và trả về ĐÚNG MỘT khối JSON (không dùng định dạng markdown \`\`\`json) với 2 trường:
{
  "search": "từ khóa lõi ngắn gọn để vector search",
  "chapter": "số chương (vd: '1', '2') nếu nhắc đến chương cụ thể, null nếu không"
}
Câu hỏi: "${query}"`
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: { temperature: 0.1 }
      })
      const text = response.text?.replace(/```json/gi, '').replace(/```/gi, '').trim() || '{}'
      const parsed = JSON.parse(text)
      return {
        search: parsed.search || query,
        chapter: parsed.chapter ? String(parsed.chapter) : null
      }
    } catch (error) {
      console.error('[Gemini] SelfQuery parsing error:', error)
      return { search: query, chapter: null }
    }
  }

  /**
   * Sinh câu trả lời Streaming từ context tài liệu (RAG Prompt)
   */
  public static async generateChatStream(
    systemPrompt: string,
    chatHistory: Array<{ role: 'user' | 'model'; parts: string[] }>,
    userMessage: string,
    contextParts: any[], // Mảng các Base64 PDF chunks từ Retrieval
    onChunk: (text: string) => void
  ): Promise<string> {
    const ai = this.getSdk()
    const modelName = ENV.GEMINI_TEXT_MODEL

    // Nhúng toàn bộ Context PDF vào luồng tin nhắn user hiện tại
    const contents = [
      ...chatHistory.map((h) => ({
        role: h.role,
        parts: h.parts.map((p) => ({ text: p })),
      })),
      {
        role: 'user',
        parts: [
          { text: "Dưới đây là các tài liệu truy xuất được đính kèm:" },
          ...contextParts,
          { text: `\n\nCâu hỏi của sinh viên: ${userMessage}` }
        ]
      },
    ]

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0, // Giảm tối đa sáng tạo để ưu tiên bám sát tài liệu
      },
    })

    let fullText = ''
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || ''
      fullText += chunkText
      onChunk(chunkText)
    }

    return fullText
  }
}
