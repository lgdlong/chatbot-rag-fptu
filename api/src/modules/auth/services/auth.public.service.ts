import { UserRepository } from '../repositories/user.repository.js'

export interface UserDTO {
  id: string
  name: string
  email: string
  role: string | null
  image: string | null
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
}
