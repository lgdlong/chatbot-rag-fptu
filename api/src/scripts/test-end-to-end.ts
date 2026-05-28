import '../config/env.js'
import { prisma } from '../modules/auth/services/db.service.js'
import { DocumentRepository } from '../modules/documents/repositories/document.repository.js'
import { RagService } from '../modules/rag/services/rag.service.js'
import { copyFile, mkdir } from 'node:fs/promises'
import Redis from 'ioredis'
import { ENV } from '../config/env.js'

async function main() {
  console.log('=== STARTING END-TO-END RAG PIPELINE INTEGRATION TEST ===')

  try {
    // 1. Khởi tạo dữ liệu mẫu trong Postgres (User, Org, Course)
    console.log('[Prisma] Preparing seed data in database...')
    
    const user = await prisma.user.upsert({
      where: { email: 'student-test@fpt.edu.vn' },
      update: {},
      create: {
        id: 'user-test-e2e-id',
        name: 'Sinh viên E2E Test',
        email: 'student-test@fpt.edu.vn',
        role: 'STUDENT',
      },
    })
    console.log(`[Prisma] User ready: ${user.name} (${user.id})`)

    // Ensure password credentials exist for user in Account table
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
    console.log(`[Prisma] Account credentials ready for user`)

    const course = await prisma.course.upsert({
      where: { id: 'course-test-e2e-id' },
      update: {},
      create: {
        id: 'course-test-e2e-id',
        code: 'SWD392_E2E',
        name: 'Software Architecture E2E Test',
      },
    })
    console.log(`[Prisma] Course ready: ${course.name} (${course.id})`)

    // 2. Sao chép sample.pdf vào thư mục uploads
    console.log('[Storage] Preparing document file...')
    await mkdir('./uploads', { recursive: true })
    const uniqueFileName = `${Date.now()}_sample.pdf`
    const targetFilePath = `./uploads/${uniqueFileName}`
    
    // Copy sample.pdf từ gốc dự án vào thư mục uploads của API
    await copyFile('../sample.pdf', targetFilePath)
    console.log(`[Storage] Copied sample.pdf to ${targetFilePath}`)

    // 3. Tạo bản ghi Document trạng thái PENDING
    const doc = await DocumentRepository.create({
      name: 'sample.pdf',
      fileUrl: `/uploads/${uniqueFileName}`,
      fileType: 'pdf',
      status: 'PENDING',
      course: { connect: { id: course.id } },
    })
    console.log(`[Prisma] Created Document record: ${doc.name} (${doc.id}) in PENDING status`)

    // 4. Kết nối Redis và gửi Job vào hàng đợi 'rag:ingestion:queue'
    console.log('[Redis] Enqueueing Ingestion Job to Redis...')
    const RedisConstructor = Redis as any
    const redisClient = new RedisConstructor({ host: ENV.REDIS_HOST, port: 6379 })
    
    const jobPayload = {
      documentId: doc.id,
      organizationId: "org-default",
      courseId: course.id,
      filePath: `./uploads/${uniqueFileName}`,
      documentName: doc.name,
    }

    await redisClient.lpush('rag:ingestion:queue', JSON.stringify(jobPayload))
    console.log('[Redis] Job successfully pushed to queue!')
    await redisClient.quit()

    // 5. Polling cơ sở dữ liệu để chờ Golang Ingestion Worker xử lý
    console.log('[Polling] Waiting for Go Ingestion Worker to process...')
    let attempt = 0
    const maxAttempts = 20 // Chờ tối đa 40 giây
    let processedDoc = null

    while (attempt < maxAttempts) {
      attempt++
      await new Promise((resolve) => setTimeout(resolve, 2000))
      
      processedDoc = await prisma.document.findUnique({
        where: { id: doc.id },
      })

      if (!processedDoc) {
        throw new Error('Document record not found during polling')
      }

      console.log(`[Polling] Attempt ${attempt}/${maxAttempts}: Status = ${processedDoc.status}`)

      if (processedDoc.status === 'COMPLETED' || processedDoc.status === 'FAILED') {
        break
      }
    }

    if (processedDoc?.status !== 'COMPLETED') {
      throw new Error(`Ingestion failed or timed out. Final Status: ${processedDoc?.status}`)
    }

    console.log('[Worker] Ingestion completed successfully by Go worker!')

    // 6. Kiểm tra Retrieval & RAG generation (Chat)
    console.log('[RAG] Testing Chat and Citations Generation...')
    console.log('[RAG] Student Query: "What is this document about?"')
    console.log('[RAG] AI Streamed Response:')
    
    const ragResult = await RagService.retrieveAndGenerate(
      'Hãy tóm tắt ngắn gọn nội dung của tài liệu này trong 1 câu.',
      {
        scopeMode: 'SELECTED_COURSES',
        courseIds: [course.id],
        documentIds: [],
        scopedCourses: [
          {
            id: course.id,
            code: course.code,
            name: course.name,
          },
        ],
        scopedDocuments: [],
      },
      [],
      (chunk: string) => {
        process.stdout.write(chunk)
      }
    )

    console.log('\n')
    console.log('[RAG] Citations generated:', JSON.stringify(ragResult.citations, null, 2))
    
    if (ragResult.citations.length > 0) {
      console.log('=== END-TO-END RAG PIPELINE INTEGRATION TEST PASSED SUCCESSFULLY! ===')
    } else {
      console.error('[RAG] Citations are empty. Test Failed!')
      process.exit(1)
    }

  } catch (error) {
    console.error('=== END-TO-END INTEGRATION TEST FAILED ===')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
