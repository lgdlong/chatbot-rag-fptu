import { prisma } from '../../auth/services/db.service.js'
import { Prisma } from '@prisma/client'

export class ChatRepository {
  // ChatSession Operations
  static async createSession(data: Prisma.ChatSessionCreateInput) {
    return prisma.chatSession.create({ data })
  }

  static async findSessionById(id: string) {
    return prisma.chatSession.findUnique({
      where: { id },
      include: {
        user: true,
        course: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  static async findSessionsByUser(userId: string, courseId?: string) {
    return prisma.chatSession.findMany({
      where: {
        userId,
        ...(courseId ? { courseId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { course: true },
    })
  }

  static async deleteSession(id: string) {
    return prisma.chatSession.delete({
      where: { id },
    })
  }

  // ChatMessage Operations
  static async createMessage(data: Prisma.ChatMessageCreateInput) {
    return prisma.chatMessage.create({ data })
  }

  static async findMessagesBySession(sessionId: string) {
    return prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
  }
}
