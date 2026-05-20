import { Hono } from 'hono'
import { DocumentRepository } from './repositories/document.repository.js'
import { ENV } from '../../config/env.js'

export const internalRouter = new Hono()

internalRouter.patch('/documents/:id', async (c) => {
  const authHeader = c.req.header('Authorization')
  const internalKey = ENV.INTERNAL_API_KEY

  if (!internalKey || authHeader !== `Bearer ${internalKey}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const docId = c.req.param('id')
  const { status, error } = await c.req.json()

  try {
    await DocumentRepository.updateStatus(docId, status, error)
    return c.json({ success: true })
  } catch (err: any) {
    console.error(`[InternalWebhook] Failed to update document status:`, err)
    return c.json({ error: err.message || 'Failed to update document status' }, 500)
  }
})
