import { prisma } from '../services/db.service.js'
import { Prisma } from '@prisma/client'

export class UserRepository {
  static async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data })
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    })
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  static async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    })
  }
}
