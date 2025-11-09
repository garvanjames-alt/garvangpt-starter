// backend/server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import * as statusModule from "./routes/status.mjs";          // ← added
import { fileURLToPath } from "url";
import "dotenv/config";
import { createRequire } from "module";

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Robustly import the search router (default or named) ---
import * as searchModule from "./routes/search.mjs";
const searchRouter = searchModule.default || searchModule.router;
const statusRouter = statusModule.default || statusModule.router;  // ← added

// --- Robustly load the respond handler from CJS ---
const require = createRequire(import.meta.url);
const respondMod = require("./respondHandler.cjs");
const respondHandler =
  respondMod?.default?.handler || respondMod?.handler || respondMod;

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

// Mount search API
if (!searchRouter) {
  // Fail fast with a clear message if import shape changes again
  throw new Error(
    "searchRouter is undefined. Ensure backend/routes/search.mjs exports either `export default router` or `export const router = ...`."
  );
}
app.use("/api", searchRouter);
app.use("/api", statusRouter);                                     // ← added

// Respond endpoint (groundable later)
app.post("/api/respond", respondHandler);

// Serve static admin pages from backend/public (e.g., /admin-search.html)
app.use(express.static(path.join(__dirname, "public")));

// (optional) serve built frontend if present
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
