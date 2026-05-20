import { prisma } from '../../auth/services/db.service.js'
import { Prisma } from '@prisma/client'

export class DocumentRepository {
  static async create(data: Prisma.DocumentCreateInput) {
    return prisma.document.create({ data })
  }

  static async findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: { course: true },
    })
  }

  static async findManyByCourse(courseId: string) {
    return prisma.document.findMany({
      where: { courseId },
    })
  }

  static async update(id: string, data: Prisma.DocumentUpdateInput) {
    return prisma.document.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.document.delete({
      where: { id },
    })
  }

  static async updateStatus(id: string, status: string, error?: string) {
    // If there is an error, we can log it here.
    if (error) {
      console.error(`[DocumentRepository] Ingestion error for document ${id}: ${error}`)
    }
    return prisma.document.update({
      where: { id },
      data: { status },
    })
  }
}
