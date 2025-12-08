// backend/server.mjs
// Express server for GarvanGPT / Almost Human
// ESM module. Loads routers + CJS handlers.

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { createRequire } from "module";

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Import routers/handlers ---
import * as searchModule from "./routes/search.mjs";
import * as statusModule from "./routes/status.mjs";
import didTalkRouter from "./routes/didTalk.mjs";
// IMPORTANT: filename is didClientKey.mjs (capital K). This must match exactly on Mac/Linux.
import didClientKeyRouter from "./routes/didClientKey.mjs";

const searchRouter = searchModule.default || searchModule.router;
const statusRouter = statusModule.default || statusModule.router;

// Use createRequire to load CJS handlers
const require = createRequire(import.meta.url);

// Respond handler (CJS)
const respondMod = require("./respondHandler.cjs");
const respondHandler =
  respondMod?.default?.handler || respondMod?.handler || respondMod;

// TTS handler (CJS)
const ttsHandler = require("./ttsHandler.cjs");

// App
const app = express();
const PORT = Number(process.env.PORT || 3001);

// CORS + JSON
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "local" });
});

// --- Mount APIs ---
if (!searchRouter) {
  throw new Error(
    "searchRouter is undefined. Ensure backend/routes/search.mjs exports either `export default router` or `export const router = ...`."
  );
}
if (!statusRouter) {
  throw new Error(
    "statusRouter is undefined. Ensure backend/routes/status.mjs exports either `export default router` or `export const router = ...`."
  );
}

app.use("/api", searchRouter);
app.use("/api", statusRouter);

// -----------------------------
// Memory store + routes (dev/simple)
// Same behavior as index.cjs.bak
// -----------------------------
const MEM = []; // resets on server restart

app.get("/api/memory", (_req, res) => {
  res.json({ items: MEM });
});

app.post("/api/memory", (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text required" });
  }
  const item = {
    id: Date.now().toString(),
    text: text.trim(),
    ts: new Date().toISOString(),
  };
  MEM.push(item);
  res.json({ ok: true, item, items: MEM });
});

app.delete("/api/memory", (_req, res) => {
  MEM.length = 0;
  res.json({ ok: true, items: MEM });
});
// -----------------------------

// D-ID routes
// didTalkRouter handles /api/did/* talk endpoints
// didClientKeyRouter handles GET /api/did/client-key
app.use("/api", didTalkRouter);
app.use("/api", didClientKeyRouter);

// Core endpoints
app.post("/api/respond", respondHandler);
app.post("/respond", respondHandler); // alias (keeps old behavior)
app.post("/api/tts", ttsHandler);

// Static admin page(s) from backend/public
app.use(express.static(path.join(__dirname, "public")));

// Optionally serve built frontend (if present)
// Prefer dist if exists, but leaving as-is is fine for local proxying.
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
