import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './services/db.service.js'
import { organization } from 'better-auth/plugins/organization'
import { admin } from 'better-auth/plugins/admin'
import { openAPI } from 'better-auth/plugins'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization(),
    admin(),
    openAPI(),
  ],
})
