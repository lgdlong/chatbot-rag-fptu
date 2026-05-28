import { prisma } from '../../auth/services/db.service.js'
import { Prisma } from '@prisma/client'

export class CourseRepository {
  static async create(data: Prisma.CourseCreateInput) {
    return prisma.course.create({ data })
  }

  static async findById(id: string) {
    return prisma.course.findUnique({
      where: { id },
    })
  }

  static async update(id: string, data: Prisma.CourseUpdateInput) {
    return prisma.course.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.course.delete({
      where: { id },
    })
  }
}
