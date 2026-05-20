import { Hono } from 'hono'
import { writeFile, mkdir } from 'node:fs/promises'
import Redis from 'ioredis'
import { DocumentRepository } from '../documents/repositories/document.repository.js'
import { auth } from '../auth/auth.js'
import { ENV } from '../../config/env.js'

export const ragRouter = new Hono()

/**
 * Tải file và kích hoạt index tài liệu vào Vector DB
 */
ragRouter.post('/:courseId/documents', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const courseId = c.req.param('courseId')
  const organizationId = session.session.activeOrganizationId

  if (!organizationId) {
    return c.json({ error: 'Tenant context is missing (Organization ID required)' }, 400)
  }

  const body = await c.req.parseBody()
  const file = body.file

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded or invalid file format' }, 400)
  }

  // 1. Tạo document record ở trạng thái PENDING
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Lưu file vào disk để worker có thể đọc
  const fileName = `${Date.now()}_${file.name}`
  const fileDir = './uploads'
  await mkdir(fileDir, { recursive: true })
  
  const filePath = `/uploads/${fileName}`
  await writeFile(`.${filePath}`, buffer)

  const doc = await DocumentRepository.create({
    name: file.name,
    fileUrl: filePath,
    fileType: file.name.split('.').pop() || 'pdf',
    status: 'PENDING',
    course: { connect: { id: courseId } },
  })

  // 2. Chạy tiến trình đẩy Job vào Redis Queue bằng Redis LPUSH (Non-blocking)
  const redisClient = new Redis({ host: ENV.REDIS_HOST, port: 6379 })

  const jobPayload = {
    documentId: doc.id,
    organizationId,
    courseId,
    filePath: `.${filePath}`,
    documentName: doc.name
  }

  try {
    await redisClient.lpush('rag:ingestion:queue', JSON.stringify(jobPayload))
  } catch (error) {
    console.error('[RagController] Redis enqueue error:', error)
    return c.json({ error: 'Failed to queue ingestion job' }, 500)
  } finally {
    await redisClient.quit()
  }

  return c.json({
    success: true,
    document: {
      id: doc.id,
      name: doc.name,
      status: 'PROCESSING',
    },
  })
})
