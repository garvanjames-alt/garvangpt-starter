// backend/server.mjs — health, memory list, respond (Composer v2 w/ summary)
// Node >= 18, ESM

import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatComposerV2 } from "../helpers/compose.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const MEMFILE = path.resolve(ROOT, "memory.jsonl");

const app = express();
const PORT = Number(process.env.PORT || 3001);
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

function readMemoryItems(max = 200) {
  if (!fs.existsSync(MEMFILE)) return [];
  const lines = fs.readFileSync(MEMFILE, "utf8").split("\n").filter(Boolean).slice(-max);
  const out = [];
  for (const l of lines) { try { out.push(JSON.parse(l)); } catch {} }
  return out;
}

let handleRespond = null;
try {
  const mod = await import(path.resolve(ROOT, "respondHandler.cjs"));
  handleRespond = mod.handleRespond || mod.default || mod.respond || mod.handler || null;
} catch {
  console.warn("respondHandler.cjs not loaded; using echo shim");
}

app.get(["/health", "/api/health"], (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get(["/memory/list", "/api/memory/list"], (req, res) => {
  try {
    res.json({ items: readMemoryItems(200) });
  } catch (e) {
    console.error("memory/list error", e);
    res.status(500).json({ ok: false, error: "memory_list_failed" });
  }
});

app.post(["/respond", "/api/respond"], async (req, res) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text) return res.status(400).json({ ok: false, error: "missing_text" });

    // 1) Main answer (your handler or echo shim)
    let modelAnswer;
    if (typeof handleRespond === "function") {
      modelAnswer = await handleRespond(text);
    } else {
      modelAnswer = `Echo (dev shim): ${text}`;
    }

    // 2) Optional short summary from your handler
    let summaryText = "";
    if (typeof handleRespond === "function") {
      const prompt = [
        "Given the following assistant draft, produce a brief, plain-English summary for a patient.",
        "- 1–3 short bullets or 2–3 concise sentences.",
        "- strictly non-diagnostic, helpful, neutral tone.",
        "- no hallucinated sources—base only on the draft.",
        "",
        "Assistant draft:",
        "```",
        String(modelAnswer || "").slice(0, 4000),
        "```",
      ].join("\n");
      try {
        summaryText = String(await handleRespond(prompt));
      } catch {}
    }

    // 3) Sources/Memories from recent items
    const recent = readMemoryItems(10);
    const sources = recent
      .filter((r) => r?.source)
      .map((r, i) => `${i + 1}. ${r.path || r.source || "memory"}`);
    const memories = recent.slice(0, 5).map((r, i) => {
      const prev = String(r?.text || "").slice(0, 80).replace(/\s+/g, " ");
      return `${r.id || `m${i + 1}`}: ${prev}…`;
    });

    // 4) Compose v2
    const content = formatComposerV2({
      findingsText: String(modelAnswer || "").trim(),
      summaryText,
      sources,
      memories,
    });

    res.json({ ok: true, content });
  } catch (e) {
    console.error("respond error", e);
    res.status(500).json({ ok: false, error: "respond_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`GarvanGPT backend listening on http://localhost:${PORT}`);
});
