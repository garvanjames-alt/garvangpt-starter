// backend/server.mjs
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";

const app = express();

// ------------------------------
// Config
// ------------------------------
const PORT = process.env.PORT || 3001;

// Comma-separated allowlist; default allows local and Netlify
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://garvangpt.netlify.app"
).split(",").map(s => s.trim());

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl/postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS"), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Resolve repo root (one level up from /backend)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// ------------------------------
// Serve PDFs under /ingest/pdfs
// ------------------------------
const PDFS_DIR = path.resolve(ROOT, "ingest", "pdfs");
if (fs.existsSync(PDFS_DIR)) {
  app.use(
    "/ingest/pdfs",
    express.static(PDFS_DIR, {
      // (optional) helpful headers for PDF viewing
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      },
    })
  );
  console.log(`Static PDFs: ${PDFS_DIR}`);
} else {
  console.warn(`PDF folder not found at ${PDFS_DIR}`);
}

// ------------------------------
// Health
// ------------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "almosthuman-starter", time: new Date().toISOString() });
});

// ------------------------------
// Dev shim: /respond
// ------------------------------
app.post("/respond", async (req, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();

    // pretend we did RAG; return markdown + sources
    const sources = Array.from({ length: 10 }, (_, i) => `ingest/pdfs/25071900000128283.pdf#page=${i + 9}`);
    const memories = [];

    const markdown = [
      "## Here’s what I found",
      `- Echo (dev shim): ${text}`,
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
