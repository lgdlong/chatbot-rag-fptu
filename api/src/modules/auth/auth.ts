import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './services/db.service.js'
import { admin } from 'better-auth/plugins/admin'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import { openAPI } from 'better-auth/plugins'
import { ENV } from '../../config/env.js'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: ["http://localhost:3000"], // Whitelist Next.js frontend origin for CSRF
  emailAndPassword: {
    enabled: true,
    allowedDomains: ["@fpt.edu.vn", "@gmail.com"],
  },
  // Chức năng đăng nhập Google tạm thời vô hiệu hóa theo yêu cầu.
  // Code cấu hình gốc được lưu lại bên dưới dưới dạng bình luận để tham khảo/sử dụng lại trong tương lai.
  /*
  socialProviders: {
    google: {
      clientId: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
    },
  },
  */
  plugins: [
    admin({
      adminRoles: ['ADMIN'],
      roles: {
        ADMIN: adminAc,
        LECTURER: userAc,
        STUDENT: userAc,
        admin: adminAc,
        user: userAc,
      },
    }),
    openAPI(),
  ],
})
