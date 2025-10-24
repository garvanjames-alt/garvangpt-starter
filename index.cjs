// backend/index.cjs
// Minimal Express API for GarvanGPT — dev-friendly and resilient

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 3001);

// --- Boot log ---------------------------------------------------------------
console.log(
  ">>> BOOT:",
  path.join(__dirname, path.basename(__filename)),
  "PID:",
  process.pid
);

// --- Middleware -------------------------------------------------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || /http:\/\/localhost:\d+/, // dev
  })
);
app.use(express.json({ limit: "1mb" }));

// --- Diagnostics ------------------------------------------------------------
app.get("/__whoami", (_req, res) => {
  res.json({ file: path.join(__dirname, path.basename(__filename)), pid: process.pid });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Tiny in-memory "memories" store (dev only) ----------------------------
let __MEM__ = [];

function addMemory(text) {
  const t = String(text || "").trim();
  if (!t) return { ok: false, error: "text required" };
  __MEM__.push({ text: t, createdAt: new Date().toISOString() });
  return { ok: true };
}

// Add (singular + plural)
app.post("/api/memory", (req, res) => {
  const out = addMemory(req.body && req.body.text);
  if (!out.ok) return res.status(400).json(out);
  res.json(out);
});
app.post("/api/memories", (req, res) => {
  const out = addMemory(req.body && req.body.text);
  if (!out.ok) return res.status(400).json(out);
  res.json(out);
});

// List (singular + plural)
app.get("/api/memory/list", (_req, res) => res.json(__MEM__));
app.get("/api/memories/list", (_req, res) => res.json(__MEM__));

// Clear (singular + plural)
app.delete("/api/memory", (_req, res) => {
  __MEM__ = [];
  res.json({ ok: true });
});
app.delete("/api/memories", (_req, res) => {
  __MEM__ = [];
  res.json({ ok: true });
});

// --- /api/respond (router) --------------------------------------------------
let respondHandler;
try {
  // Prefer external handler (OpenAI-backed)
  respondHandler = require("./respondHandler.cjs");
  console.log(
    ">>> respondHandler: OpenAI mode (file:",
    path.join(__dirname, "respondHandler.cjs"),
    ")"
  );
} catch (err) {
  console.log(
    ">>> /api/respond no external handler found — using stub",
    String(err && err.message ? "- " + err.message : "")
  );

  // Very small, safe stub so UI never looks empty in dev
  respondHandler = function stubRespond(req, res) {
    const question = (req.body && req.body.question) || "";
    const minScore = (req.body && req.body.minScore) ?? null;
    const q = String(question).toLowerCase();

    if (q.includes("travel") && q.includes("vaccine")) {
      return res.json({
        answer:
          "For travel, start 6–8 weeks before departure. Core considerations:\n" +
          "• Routine: MMR, Tdap/Td, influenza, COVID up to date.\n" +
          "• Hepatitis A: most travelers; 2‑dose series.\n" +
          "• Typhoid: high‑risk food/water exposure or rural travel.\n" +
          "• Hepatitis B: if sexual exposure, medical work, or long stay.\n" +
          "• Yellow fever: only if required/recommended for destination; certificate may be needed.\n" +
          "• Rabies pre‑exposure: remote areas, animal contact, limited access to PEP.\n" +
          "• Malaria: not a vaccine—use region‑specific chemoprophylaxis and bite prevention.\n" +
          "Always check your destination’s latest requirements and book a travel clinic consult.",
        sources: [],
        usedMemories: [],
      });
    }

    res.json({
      answer:
        `I received your question: “${question}”. I’m running in “simple mode” right now (minScore: ${minScore ?? "?"}). Ask about travel vaccines, RSV, shingles, tetanus, or COVID boosters to see a fuller reply.`,
      sources: [],
      usedMemories: [],
    });
  };
}

app.post("/api/respond", respondHandler);
// convenience alias (clients may call without /api in some setups)
app.post("/respond", respondHandler);

// --- Listen -----------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
