// backend/memoryRouter.mjs
import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const dataDir  = path.join(__dirname, "data");
const filePath = path.join(dataDir, "memory.json");

function loadItems() {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
function saveItems(items) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
}

export const memoryRouter = Router();

memoryRouter.get("/", (req, res) => {
  res.json({ ok: true, items: loadItems() });
});

memoryRouter.post("/", (req, res) => {
  const items = loadItems();
  const newItem = { text: (req.body?.text ?? ""), ts: Date.now() };
  items.push(newItem);
  saveItems(items);
  res.json({ ok: true, item: newItem });
});

memoryRouter.delete("/", (req, res) => {
  saveItems([]);
  res.json({ ok: true, items: [] });
});
