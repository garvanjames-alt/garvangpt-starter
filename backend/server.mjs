// backend/server.mjs — clean, standalone API (works locally and on Render).
// ESM module (Node >= 18). Netlify hits us via /api/* proxy.

import express from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { fileURLToPath } from "url";
import cors from "cors";

// Handlers
import respondHandler from "./respondHandler.cjs"; // expects POST { text }
import query from "./query.cjs"; // used by /api/memory helpers

// ---------------------------
// Config
// ---------------------------
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS + JSON
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://garvangpt.netlify.app",
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};
app.use(cors(corsOptions));
app.use(express.json());

// ---------------------------
// Static PDFs (safe mounts)
// ---------------------------
const repoRoot = process.cwd();
const pdfDirA = path.resolve(__dirname, "..", "ingest", "pdfs");       // relative to backend/
const pdfDirB = path.resolve(repoRoot, "ingest", "pdfs");              // relative to repo root

app.use("/ingest/pdfs", express.static(pdfDirB, {
  setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=3600"),
}));
app.use("/ingest/pdfs", express.static(pdfDirA, {
  setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=3600"),
}));

// explicit send-file helper (debug)
app.get("/ingest/pdfs/:name", (req, res) => {
  const candidate1 = path.join(pdfDirB, req.params.name);
  const candidate2 = path.join(pdfDirA, req.params.name);
  if (fsSync.existsSync(candidate1)) return res.sendFile(candidate1);
  if (fsSync.existsSync(candidate2)) return res.sendFile(candidate2);
  res.status(404).send("not found");
});

// ---------------------------
/** Memory API (list/add/clear) at /api/memory */
app.get("/api/memory", async (_req, res) => {
  try {
    const items = await query.listMemory();
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/api/memory", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "text required" });
    await query.addMemory(text);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.delete("/api/memory", async (_req, res) => {
  try {
    await query.clearMemory();
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ---------------------------
// Respond endpoint (alias both paths)
// Netlify proxy calls /api/respond; older code may call /respond
// ---------------------------
app.post(["/respond", "/api/respond"], async (req, res, next) => {
  try {
    await respondHandler(req, res, next);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ---------------------------
// Health & root
// ---------------------------
app.get("/health", (_req, res) => {
  res.type("application/json").status(200).send('{"ok":true}');
});

app.get("/", (_req, res) => {
  res.type("text/plain").status(200).send("ok");
});

// last-resort error guard
app.use((err, _req, res, _next) => {
  console.error("[error]", err?.message || err);
  res.status(500).type("text/plain").send("error");
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on :${PORT}`);
  console.log("Allowed origins:", corsOptions.origin.join(", "));
});
