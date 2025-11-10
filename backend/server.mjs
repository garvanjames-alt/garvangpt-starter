// backend/server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import * as statusModule from "./routes/status.mjs";
import { fileURLToPath } from "url";
import "dotenv/config";
import { createRequire } from "module";

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Import routers/handlers ---
import * as searchModule from "./routes/search.mjs";
const searchRouter = searchModule.default || searchModule.router;
const statusRouter = statusModule.default || statusModule.router;

// Use createRequire to load CJS handlers
const require = createRequire(import.meta.url);

// Respond handler (CJS)
const respondMod = require("./respondHandler.cjs");
const respondHandler =
  respondMod?.default?.handler || respondMod?.handler || respondMod;

// TTS handler (CJS)  ← NEW
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

// Mount APIs
if (!searchRouter) {
  throw new Error(
    "searchRouter is undefined. Ensure backend/routes/search.mjs exports either `export default router` or `export const router = ...`."
  );
}
app.use("/api", searchRouter);
app.use("/api", statusRouter);

// Core endpoints
app.post("/api/respond", respondHandler);
app.post("/api/tts", ttsHandler); // ← NEW

// Static admin page(s) from backend/public
app.use(express.static(path.join(__dirname, "public")));

// Optionally serve built frontend (if present)
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
