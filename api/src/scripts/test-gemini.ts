import '../config/env.js'
import { GeminiService } from '../modules/rag/services/gemini.service.js'

async function main() {
  console.log('Testing Gemini Embedding 2 Connection...')
  try {
    const text = 'Chào mừng sinh viên FPT University!'
    console.log(`Generating embedding for text: "${text}"`)
    const embedding = await GeminiService.generateEmbedding(text)
    
    console.log('Embedding values sample:', embedding.slice(0, 5))
    console.log('Embedding dimension size:', embedding.length)

    if (embedding.length === 3072) {
      console.log('Gemini test PASSED successfully (3072 dimensions verified)!')
    } else {
      console.error(`Gemini test FAILED: expected 3072 dimensions, but got ${embedding.length}`)
      process.exit(1)
    }
  } catch (error) {
    console.error('Gemini test FAILED:', error)
    process.exit(1)
  }
}

main()
