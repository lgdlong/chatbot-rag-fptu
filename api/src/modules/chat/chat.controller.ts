import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { ChatRepository } from './repositories/chat.repository.js'
import { RagService } from '../rag/services/rag.service.js'
import { auth } from '../auth/auth.js'

export const chatRouter = new Hono()

chatRouter.post('/send', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { sessionId, message } = await c.req.json()
  const chatSession = await ChatRepository.findSessionById(sessionId)

  if (!chatSession) {
    return c.json({ error: 'Chat session not found' }, 404)
  }

  const organizationId = session.session.activeOrganizationId
  if (!organizationId) {
    return c.json({ error: 'Tenant context is missing (Organization ID required)' }, 400)
  }

  // Chuyển đổi lịch sử chat của phiên cho phù hợp định dạng Gemini
  const chatHistory = chatSession.messages.map((m) => ({
    role: m.sender === 'USER' ? ('user' as const) : ('model' as const),
    parts: [m.content],
  }))

  // Lưu tin nhắn của sinh viên vào SQL DB trước
  await ChatRepository.createMessage({
    session: { connect: { id: sessionId } },
    sender: 'USER',
    content: message,
  })

  // Trả về stream SSE trực tuyến cho sinh viên
  return streamSSE(c, async (stream) => {
    let citationsToSend: any[] = []
    let accumulatedAnswer = ''

    try {
      const ragResult = await RagService.retrieveAndGenerate(
        message,
        chatSession.courseId,
        organizationId,
        chatHistory,
        async (chunk) => {
          accumulatedAnswer += chunk
          // Stream từng từ về client
          await stream.writeSSE({
            data: JSON.stringify({ chunk }),
            event: 'message',
          })
        }
      )

      citationsToSend = ragResult.citations

      // Gửi toàn bộ citations và kết thúc stream
      await stream.writeSSE({
        data: JSON.stringify({ citations: citationsToSend }),
        event: 'citations',
      })

      // Lưu tin nhắn trợ lý AI kèm citations vào PostgreSQL
      await ChatRepository.createMessage({
        session: { connect: { id: sessionId } },
        sender: 'ASSISTANT',
        content: accumulatedAnswer,
        citations: citationsToSend as any,
      })
    } catch (err: any) {
      console.error('[Chat Stream Error]:', err)
      await stream.writeSSE({
        data: JSON.stringify({ error: err.message || 'Lỗi xử lý AI RAG' }),
        event: 'error',
      })
    }
  })
})
