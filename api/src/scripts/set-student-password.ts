import '../config/env.js'
import { auth } from '../modules/auth/auth.js'
import { prisma } from '../modules/auth/services/db.service.js'

async function main() {
  const password = 'SuperPassword123!'
  
  // Make sure user exists
  let user = await prisma.user.findUnique({
    where: { id: 'user-test-e2e-id' }
  })
  
  if (!user) {
    console.log('User user-test-e2e-id not found, seeding first...')
    user = await prisma.user.create({
      data: {
        id: 'user-test-e2e-id',
        name: 'Sinh viên E2E Test',
        email: 'student-test@fpt.edu.vn',
        role: 'STUDENT',
      }
    })
  }

  console.log('Inserting password credential directly into Account table...')
  const passwordHash = '299f315028cd53bed28cf3e9006d6393:ff5ad14a24855e26ff311acadf19af30d112bd83bf5ab6d8d9bb827a6f88c313ade1e3d676b54b50b3384dc58dd812076bb4a7188e98c1b92ea027630b8dfaf1' // SuperPassword123!
  
  await prisma.account.upsert({
    where: { id: 'account-test-e2e-id' },
    update: {
      password: passwordHash
    },
    create: {
      id: 'account-test-e2e-id',
      accountId: 'user-test-e2e-id',
      providerId: 'credential',
      userId: 'user-test-e2e-id',
      password: passwordHash
    }
  })
  console.log('Password credential record created successfully!')

  console.log('Trying to sign in via Better Auth API...')
  const signInRes = await auth.api.signInEmail({
    body: {
      email: 'student-test@fpt.edu.vn',
      password: password,
    }
  })
  console.log('Sign in response:', signInRes)
}

main().catch(console.error)
