// backend/server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createRequire } from "module";
import { searchRouter } from "./routes/search.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const require = createRequire(import.meta.url);
// Support either `module.exports = { handler }` OR `module.exports = (req,res)=>{}`
const respondMod = require("./respondHandler.cjs");
const respondHandler = respondMod.handler || respondMod.default?.handler || respondMod.default || respondMod;

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "local" });
});

// RAG search route
app.use("/api", searchRouter);

// Chat respond route (groundable later)
app.post("/api/respond", respondHandler);

// (optional) serve static frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
