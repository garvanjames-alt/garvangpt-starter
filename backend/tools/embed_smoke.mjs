import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

try {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: "hello world"
  });
  console.log("SMOKE OK. dims:", res.data[0].embedding.length);
} catch (e) {
  console.error("SMOKE FAIL:", e.status, e.message);
  process.exit(1);
}
