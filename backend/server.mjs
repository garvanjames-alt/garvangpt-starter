// backend/server.mjs — health + memory API (ESM, Node >=18)
import express from "express";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number(process.env.PORT || 3001);
const HOST = "0.0.0.0";
const CORS_ORIGIN = "http://localhost:5173";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEM_PATH = path.join(__dirname, "memory.jsonl");

async function readItems() {
  if (!fsSync.existsSync(MEM_PATH)) return [];
  const txt = await fs.readFile(MEM_PATH, "utf8").catch(() => "");
  return txt.split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}
async function appendItem(text) {
  const item = { id: String(Date.now()), text: String(text), createdAt: new Date().toISOString() };
  await fs.appendFile(MEM_PATH, JSON.stringify(item) + "\n");
  return item;
}
async function clearItems() {
  if (fsSync.existsSync(MEM_PATH)) await fs.writeFile(MEM_PATH, "");
}

const app = express();

// minimal CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.type("text/plain").send("ok"));

// MEMORY ROUTES
app.get("/api/memory", async (_req, res, next) => {
  try { res.json({ items: await readItems() }); } catch (e) { next(e); }
});
app.post("/api/memory", async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "text is required" });
    res.json({ ok: true, item: await appendItem(text) });
  } catch (e) { next(e); }
});
app.delete("/api/memory", async (_req, res, next) => {
  try { await clearItems(); res.json({ ok: true }); } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error("[error]", err?.stack || err?.message || err);
  res.status(500).type("text/plain").send("error");
});

app.listen(PORT, HOST, () => {
  console.log(`LISTENING on ${HOST}:${PORT}`);
});
