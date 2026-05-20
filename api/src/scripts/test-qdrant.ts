import '../config/env.js'
import { QdrantService } from '../modules/rag/services/qdrant.service.js'

async function main() {
  console.log('Testing Qdrant Connection...')
  try {
    const qdrant = QdrantService.getClient()
    const collections = await qdrant.getCollections()
    console.log('Collections list:', collections)

    console.log('Ensuring collection fptu_rag_documents exists...')
    await QdrantService.ensureCollection('fptu_rag_documents')
    
    const collectionsAfter = await qdrant.getCollections()
    console.log('Collections list after ensure:', collectionsAfter)
    console.log('Qdrant test PASSED successfully!')
  } catch (error) {
    console.error('Qdrant test FAILED:', error)
    process.exit(1)
  }
}

main()
