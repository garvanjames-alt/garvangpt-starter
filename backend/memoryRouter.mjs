import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

// Resolve a stable data path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const filePath = path.join(dataDir, "memory.json");

// Ensure data directory & file exist
function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]");
}

function loadItems() {
  ensureStore();
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function saveItems(items) {
  ensureStore();
  const json = JSON.stringify(items ?? [], null, 2);
  fs.writeFileSync(filePath, json);
}

// GET /api/memory
router.get("/", (_req, res) => {
  res.json({ ok: true, items: loadItems() });
});

// POST /api/memory   body: { text: string }
router.post("/", (req, res) => {
  const items = loadItems();
  const text = (req.body?.text ?? "").toString().trim();
  const newItem = { text, ts: Date.now() };
  items.push(newItem);
  saveItems(items);
  res.json({ ok: true, item: newItem });
});

// DELETE /api/memory (clear all)
router.delete("/", (_req, res) => {
  saveItems([]);
  res.json({ ok: true, items: [] });
});

export const memoryRouter = router;
