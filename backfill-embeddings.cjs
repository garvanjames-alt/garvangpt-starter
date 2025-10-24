require("dotenv").config();
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMB_MODEL = process.env.EMB_MODEL || "text-embedding-3-small";
const MEMORY_PATH = path.join(__dirname, "memory.jsonl");
const TMP_PATH = path.join(__dirname, "memory.tmp.jsonl");

function safeParse(line) { try { return JSON.parse(line); } catch { return null; } }

async function embed(text) {
  const res = await client.embeddings.create({ model: EMB_MODEL, input: text });
  return res.data[0].embedding;
}

(async () => {
  if (!fs.existsSync(MEMORY_PATH)) {
    console.error("No memory.jsonl found."); process.exit(1);
  }
  const lines = fs.readFileSync(MEMORY_PATH, "utf8").split("\n").filter(Boolean);
  let updated = 0, kept = 0, i = 0;

  fs.writeFileSync(TMP_PATH, "");
  for (const line of lines) {
    i++;
    const rec = safeParse(line);
    if (!rec || !rec.text) continue;

    if (!Array.isArray(rec.embedding)) {
      try { rec.embedding = await embed(rec.text); updated++; }
      catch (e) { console.error(`Failed to embed line ${i}: ${e.message}`); }
    } else { kept++; }

    fs.appendFileSync(TMP_PATH, JSON.stringify(rec) + "\n");
    if ((updated + kept) % 10 === 0) console.log(`… processed ${updated + kept}/${lines.length}`);
  }

  fs.renameSync(TMP_PATH, MEMORY_PATH);
  console.log(`✅ Backfill complete. Updated: ${updated}, kept: ${kept}, total: ${lines.length}`);
})();
