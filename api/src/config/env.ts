import path from "node:path";
import { fileURLToPath } from "node:url";

// Programmatically load the root .env file at startup (always 3 levels up from this file's folder)
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, "../../../.env");
  process.loadEnvFile(envPath);
} catch (e) {
  // Ignore error in environments where env variables are pre-loaded (e.g. Docker, Vercel)
}

// Export parsed env variables for usage (with defaults)
export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "super_secret_jwt_key_fptu_rag",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:8000",
  QDRANT_URL: process.env.QDRANT_URL || "http://localhost:6333",
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  LOCAL_EMBEDDING_URL:
    process.env.LOCAL_EMBEDDING_URL || "http://localhost:8000",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  INTERNAL_API_KEY:
    process.env.INTERNAL_API_KEY || "super_secret_internal_key_fptu_rag",
  INTERNAL_API_URL: process.env.INTERNAL_API_URL || "http://localhost:8000",
  PAYOS_CLIENT_ID: process.env.PAYOS_CLIENT_ID || "",
  PAYOS_API_KEY: process.env.PAYOS_API_KEY || "",
  PAYOS_CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY || "",
} as const;
