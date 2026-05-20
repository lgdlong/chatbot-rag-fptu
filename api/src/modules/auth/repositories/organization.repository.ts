import { prisma } from '../services/db.service.js'
import { Prisma } from '@prisma/client'

export class OrganizationRepository {
  static async create(data: Prisma.OrganizationCreateInput) {
    return prisma.organization.create({ data })
  }

  static async findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
    })
  }

  static async findBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
    })
  }

  static async update(id: string, data: Prisma.OrganizationUpdateInput) {
    return prisma.organization.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.organization.delete({
      where: { id },
    })
  }

  static async findAll() {
    return prisma.organization.findMany()
  }
}
