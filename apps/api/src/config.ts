import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false });
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-2"),
  GEMINI_GENERATION_MODEL: z.string().default("gemini-2.5-flash"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  MAX_CHUNK_CHARS: z.coerce.number().int().positive().default(3200),
  CHUNK_OVERLAP_CHARS: z.coerce.number().int().nonnegative().default(450),
  INGEST_BATCH_SIZE: z.coerce.number().int().positive().default(12),
  MATCH_COUNT: z.coerce.number().int().positive().default(8),
  SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.72),
  GATE_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.72)
});

export const env = envSchema.parse(process.env);
