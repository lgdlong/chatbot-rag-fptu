import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './services/db.service.js'
import { organization } from 'better-auth/plugins/organization'
import { admin } from 'better-auth/plugins/admin'
import { openAPI } from 'better-auth/plugins'
import { ENV } from '../../config/env.js'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    allowedDomains: ["@fpt.edu.vn", "@gmail.com"],
  },
  socialProviders: {
    google: {
      clientId: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    organization(),
    admin(),
    openAPI(),
  ],
})
