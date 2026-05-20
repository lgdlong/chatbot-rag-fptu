import '../config/env.js'
import { prisma } from '../modules/auth/services/db.service.js'
const sessions = await prisma.session.findMany({
  include: { user: true }
})
console.log('Active Sessions in DB:', JSON.stringify(sessions, null, 2))
