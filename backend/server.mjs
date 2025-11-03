// backend/server.mjs
// ESM entry for the Almost Human backend (serves API + built frontend)

import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import authRouter from "./authRouter.mjs";

const require = createRequire(import.meta.url);
const app = express();

// JSON body
app.use(express.json());

// CORS (Render frontend → Render backend) with cookies
app.use(
  cors({
    origin: "https://almosthuman-frontend.onrender.com",
    credentials: true,
  })
);

// Parse cookies so auth middleware can read gh_session
app.use(cookieParser());

// Health
app.get("/health", (_req, res) => res.status(200).send("OK"));

// Mount auth routes: /api/login, /api/admin/ping
app.use(authRouter);

// ----- Respond handler (CJS-friendly) -----
let respondHandler;
try {
  const mod = require("./respondHandler.cjs");
  respondHandler =
    (typeof mod === "function" && mod) ||
    (mod && typeof mod.default === "function" && mod.default) ||
    (mod && typeof mod.respond === "function" && mod.respond) ||
    (mod && typeof mod.handler === "function" && mod.handler);
  if (typeof respondHandler !== "function") throw new Error("no function export");
} catch (err) {
  console.error("[server] respondHandler load error:", err);
  respondHandler = async (_req, res) =>
    res.status(500).json({ error: "respond handler missing" });
}

// ----- TTS handler (CJS-friendly) -----
let ttsHandler;
try {
  const mod = require("./ttsHandler.cjs");
  ttsHandler =
    (typeof mod === "function" && mod) ||
    (mod && typeof mod.default === "function" && mod.default) ||
    (mod && typeof mod.tts === "function" && mod.tts) ||
    (mod && typeof mod.handler === "function" && mod.handler);
  if (typeof ttsHandler !== "function") throw new Error("no function export");
} catch (err) {
  console.error("[server] ttsHandler load error:", err);
  ttsHandler = async (_req, res) => res.status(204).end();
}

// API routes
app.post(["/api/respond", "/respond"], respondHandler);
app.post(["/api/tts", "/tts"], ttsHandler);

// In-memory fallback memory API (keeps UI working if memory.cjs absent)
let memList, memAdd, memClear;
try {
  const mod = await import("./memory.cjs");
  memList = mod.listMemory;
  memAdd = mod.addMemory;
  memClear = mod.clearMemory;
} catch {
  const store = [];
  memList = async () => store;
  memAdd = async (text) => store.push({ text, ts: Date.now() });
  memClear = async () => (store.length = 0);
}

app.get(["/api/memory", "/memory"], async (_req, res) =>
  res.json({ items: await memList() })
);
app.post(["/api/memory", "/memory"], async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "text required" });
  await memAdd(text);
  res.json({ ok: true });
});
app.delete(["/api/memory", "/memory"], async (_req, res) => {
  await memClear();
  res.json({ ok: true });
});

// Serve built frontend if present (local/dev)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/respond")) return next();
  res.sendFile(path.join(frontendDist, "index.html"));
});

// Start
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[server] listening on ${PORT}`));
