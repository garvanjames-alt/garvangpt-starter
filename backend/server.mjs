// backend/server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { createRequire } from "module";

// Status router (optional)
import * as statusModule from "./routes/status.mjs";

// Vector search from retriever
import { search as vectorSearch } from "./retriever/retriever.mjs";

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Status router (if provided)
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

// Optional status router under /api
if (statusRouter) {
  app.use("/api", statusRouter);
}

// --- DIRECT /api/search ENDPOINT ---
// This bypasses routes/search.mjs and talks straight to the retriever.
app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limitRaw = req.query.limit ?? "5";
    const limit = Number(limitRaw) || 5;

    if (!q) {
      return res.status(400).json({ error: "missing_query" });
    }

    const hits = await vectorSearch(q, { limit });

    res.json({
      query: q,
      hits,
    });
  } catch (err) {
    console.error("Search error on /api/search:", err);
    res.status(500).json({
      error: "search_failed",
      message:
        process.env.NODE_ENV === "production"
          ? "Search failed"
          : String(err?.message || err),
    });
  }
});

// Core endpoints
app.post("/api/respond", respondHandler);
app.post("/api/tts", ttsHandler);

// Static admin page(s) from backend/public
app.use(express.static(path.join(__dirname, "public")));

// Optionally serve built frontend (if present)
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
