// backend/server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ------------------------------
// Config
// ------------------------------
const PORT = process.env.PORT || 3001;

// Comma-separated allowlist; default allows local + Netlify app
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://garvangpt.netlify.app"
).split(",").map(s => s.trim());

const corsOptions = {
  origin(origin, callback) {
    // allow curl/postman/no-Origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    const err = new Error("CORS");
    err.message = "CORS";
    return callback(err);
  }
};

// ------------------------------
// App
// ------------------------------
const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// --- serve static PDFs (two ways to be extra safe) ---
const repoRoot = process.cwd(); // /opt/render/project/src or repo root locally
const pdfDirA  = path.resolve(__dirname, "..", "ingest", "pdfs");   // relative to backend/
const pdfDirB  = path.resolve(repoRoot, "ingest", "pdfs");            // relative to repo root

console.log("[static] pdfDirA:", pdfDirA);
console.log("[static] pdfDirB:", pdfDirB);

// Primary mount (repo-root based)
app.use("/ingest/pdfs", express.static(pdfDirB, {
  setHeaders(res) { res.setHeader("Cache-Control", "public, max-age=3600"); }
}));

// Secondary mount (backend/.. based) in case of path differences
app.use("/ingest/pdfs", express.static(pdfDirA, {
  setHeaders(res) { res.setHeader("Cache-Control", "public, max-age=3600"); }
}));

// Fallback explicit route (logs what it tries to serve)
app.get("/ingest/pdfs/:name", (req, res) => {
  const candidate1 = path.join(pdfDirB, req.params.name);
  const candidate2 = path.join(pdfDirA, req.params.name);
  console.log("[pdf GET]", req.params.name, "\n  try1:", candidate1, "\n  try2:", candidate2);
  res.sendFile(candidate1, err1 => {
    if (!err1) return;
    res.sendFile(candidate2, err2 => {
      if (!err2) return;
      console.error("[pdf 404]", req.params.name);
      res.status(404).send("PDF not found");
    });
  });
});

// ------------------------------
// Memory API (file-backed JSONL)
// ------------------------------
const MEM_PATH = path.resolve(repoRoot, "memory.jsonl");

async function ensureMemFile() {
  try {
    await fs.access(MEM_PATH);
  } catch {
    await fs.writeFile(MEM_PATH, "", "utf8");
  }
}

async function readMemories() {
  await ensureMemFile();
  const raw = await fs.readFile(MEM_PATH, "utf8");
  const items = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj.text === "string") items.push(obj.text);
    } catch (_) { /* skip bad lines */ }
  }
  return items;
}

async function appendMemory(text) {
  await ensureMemFile();
  const rec = { text, ts: Date.now() };
  await fs.appendFile(MEM_PATH, JSON.stringify(rec) + "\n", "utf8");
}

async function clearMemories() {
  await fs.writeFile(MEM_PATH, "", "utf8");
}

// List
app.get("/api/memory", async (_req, res) => {
  try {
    const items = await readMemories();
    res.json({ items });
  } catch (e) {
    console.error("/api/memory GET error", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// Add
app.post("/api/memory", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "Missing 'text'" });
    await appendMemory(text);
    const items = await readMemories();
    res.json({ ok: true, items });
  } catch (e) {
    console.error("/api/memory POST error", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// Clear
app.delete("/api/memory", async (_req, res) => {
  try {
    await clearMemories();
    res.json({ ok: true, items: [] });
  } catch (e) {
    console.error("/api/memory DELETE error", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// ------------------------------
// Dev shim respond endpoint
// ------------------------------
app.post("/respond", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();

    // echo-style dev shim
    const sources = [
      "ingest/pdfs/25071900000128283.pdf#page=9",
      "ingest/pdfs/25071900000128283.pdf#page=10",
      "ingest/pdfs/25071900000128283.pdf#page=11",
      "ingest/pdfs/25071900000128283.pdf#page=12",
      "ingest/pdfs/25071900000128283.pdf#page=13",
      "ingest/pdfs/25071900000128283.pdf#page=14",
      "ingest/pdfs/25071900000128283.pdf#page=15",
      "ingest/pdfs/25071900000128283.pdf#page=16",
      "ingest/pdfs/25071900000128283.pdf#page=17",
      "ingest/pdfs/25071900000128283.pdf#page=18",
    ];

    const memories = await readMemories();

    const markdown = [
      "## Here’s what I found",
      `- Echo (dev shim): ${text || "Using the clinic docs, what should a new patient bring?"}`,
      "",
      "## Summary (non-diagnostic)",
      "This is an informational summary and **not** a diagnosis. Consult a licensed clinician.",
      "",
      "## Sources used",
      ...sources.map((s, i) => `${i + 1}. ${s}`),
      "",
      "## Memories referenced",
      memories.length ? memories.map((m, i) => `${i + 1}. ${m}`).join("\n") : "(none)",
    ].join("\n");

    res.json({ markdown, sources, memories });
  } catch (e) {
    console.error("/respond error", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// ------------------------------
// Healthcheck & Root
// ------------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Root OK (helps Render detect readiness)
app.get("/", (_req, res) => {
  res.status(200).send("ok");
});

// ------------------------------
// Error handler
// ------------------------------
app.use((err, _req, res, _next) => {
  console.error("[error]", err?.message || err);
  if (String(err?.message || "").includes("CORS")) {
    return res.status(403).json({ error: "CORS blocked" });
  }
  res.status(500).json({ error: "Server error" });
});

// ------------------------------
// Listen
// ------------------------------
app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});
