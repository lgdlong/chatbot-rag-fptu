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

      if (response.embedding?.values) {
        return response.embedding.values
      }

      throw new Error('[Gemini] No embedding values found in response.')
    } catch (error: any) {
      console.error('[Gemini] API error:', error)
      throw error
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
    const modelName = process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite'

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
        temperature: 0.2, // Giảm sáng tạo để tăng độ chính xác trích xuất kiến thức
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
