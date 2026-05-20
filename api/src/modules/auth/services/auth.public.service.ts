import { UserRepository } from '../repositories/user.repository.js'
import { OrganizationRepository } from '../repositories/organization.repository.js'

export interface UserDTO {
  id: string
  name: string
  email: string
  role: string | null
  image: string | null
}

export interface OrganizationDTO {
  id: string
  name: string
  slug: string
  logo: string | null
}

export class AuthPublicService {
  static async getUserById(id: string): Promise<UserDTO | null> {
    const user = await UserRepository.findById(id)
    if (!user) return null
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
    }
  }

  static async getOrganizationById(id: string): Promise<OrganizationDTO | null> {
    const org = await OrganizationRepository.findById(id)
    if (!org) return null
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
    }
  }
}
