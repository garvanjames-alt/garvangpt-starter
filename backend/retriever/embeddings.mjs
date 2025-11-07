// OpenAI embeddings with .env loading, batching, and retry
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

export const EMBED_MODEL = "text-embedding-3-small";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export async function embedBatch(texts, batchSize = 64, maxRetries = 4) {
  const out = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    let attempt = 0;
    while (true) {
      try {
        const res = await client.embeddings.create({ model: EMBED_MODEL, input: chunk });
        for (const d of res.data) out.push(d.embedding);
        break;
      } catch (err) {
        attempt++;
        const retryable = err.status >= 500 || err.status === 429;
        if (!retryable || attempt > maxRetries) {
          console.error("Embed failed:", { status: err.status, message: err.message });
          throw err;
        }
        const wait = Math.min(2000 * attempt, 8000);
        console.warn(`Retrying embeddings (attempt ${attempt}/${maxRetries}) in ${wait}ms...`);
        await sleep(wait);
      }
    }
  }
  return out;
}
