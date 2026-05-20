import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Programmatically load the root .env file at startup (always 3 levels up from this file's folder)
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const envPath = path.resolve(__dirname, '../../../.env')
  process.loadEnvFile(envPath)
} catch (e) {
  // Ignore error in environments where env variables are pre-loaded (e.g. Docker, Vercel)
}

// Export parsed env variables for usage (with defaults)
export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_fptu_rag',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || '',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  LOCAL_EMBEDDING_URL: process.env.LOCAL_EMBEDDING_URL || 'http://localhost:8000',
} as const
