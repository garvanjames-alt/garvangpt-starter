// backend/respondHandler.cjs
// Minimal, deterministic responder for local dev.
// Reads the SAME memory file the server writes (../data/memory.json)
// and returns a concise `text` field.

const fs = require("fs");
const path = require("path");

function readLastMemory() {
  try {
    // server.mjs writes to path.join(__dirname, "..", "data", "memory.json")
    const file = path.join(__dirname, "..", "data", "memory.json");
    if (!fs.existsSync(file)) return null;
    const { items } = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(items) && items.length) return items[items.length - 1];
    return null;
  } catch (e) {
    console.error("respondHandler: failed to read memory.json", e);
    return null;
  }
}

module.exports = async function respondHandler(req, res) {
  const prompt = String(req.body?.prompt || req.body?.text || "").trim();
  if (!prompt) return res.status(400).json({ error: "`prompt` is required" });

  const lastMemory = readLastMemory();

  let text;
  const p = prompt.toLowerCase();
  if (p.includes("what memory") || p.includes("last memory")) {
    text = lastMemory ? `Your most recent memory is: "${lastMemory}"` : "You have no saved memories yet.";
  } else if (p.startsWith("say ")) {
    text = `You said: ${prompt.slice(4)}`;
  } else {
    text = `You said: ${prompt}`;
  }

  return res.json({ text, sources: [], usedMemories: lastMemory ? [lastMemory] : [] });
};
