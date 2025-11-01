// backend/server.mjs
import 'dotenv/config';
import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// --- Paths (relative to this file) ---
const PDF_DIR = path.join(__dirname, "ingest", "pdfs");
const MEM_FILE = path.join(__dirname, "memory.json");

// --- Helpers ---------------------------------------------------------------
async function readMemory() {
  try {
    const raw = await fs.readFile(MEM_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
async function writeMemory(items) {
  const payload = JSON.stringify(items, null, 2);
  await fs.writeFile(MEM_FILE, payload, "utf8");
}

// --- CORS ------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // prod/staging UI (keep as needed)
  "https://garvangpt.netlify.app",
];

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / curl / Postman (no Origin)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("CORS"), false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// --- Health ----------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "garvangpt-backend",
    time: new Date().toISOString(),
  });
});

// --- Memory API ------------------------------------------------------------
// Returns { items: [...] }
app.get("/api/memory", async (_req, res) => {
  const items = await readMemory();
  res.json({ items });
});

// Body: { text: string }
app.post("/api/memory", async (req, res) => {
  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "Missing 'text'." });

  const items = await readMemory();
  const item = { id: Date.now(), text };
  items.unshift(item);
  await writeMemory(items);
  res.json({ ok: true, item });
});

// Clear all
app.delete("/api/memory", async (_req, res) => {
  await writeMemory([]);
  res.json({ ok: true });
});

// --- Respond (dev shim) ----------------------------------------------------
// Accepts text via JSON body or query string; echoes for now.
// ----- Respond (OpenAI) -----
app.post("/api/respond", async (req, res) => {
  try {
    const text = String(req.body?.text ?? req.body?.message ?? "").trim();
    if (!text) return res.json({ text: "Ask me something!", sources: [], usedMemories: [] });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({ text: `Echo (no OPENAI_API_KEY set): ${text}`, sources: [], usedMemories: [] });
    }

    // Minimal prompt; you can tune later
    const system = "You are GarvanGPT, a helpful clinic assistant. Answer clearly and concisely.";
    const user = text;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.3,
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(500).json({ text: `LLM error: ${r.status} ${errText}`, sources: [], usedMemories: [] });
    }

    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate an answer.";
    res.json({ text: answer, sources: [], usedMemories: [] });
  } catch (e) {
    res.status(500).json({ text: `Server error: ${e?.message || e}`, sources: [], usedMemories: [] });
  }
});


// --- Static (optional; used by ingest UI) ----------------------------------
app.use("/ingest/pdfs", express.static(PDF_DIR));

// --- Start -----------------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Allowed origins:", ALLOWED_ORIGINS.join(", "));
});
