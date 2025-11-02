import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "data", "memory.json");

const router = express.Router();

function loadItems() {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function saveItems(items) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
}

router.get("/", (_req, res) => {
  res.json({ ok: true, items: loadItems() });
});

router.post("/", (req, res) => {
  const items = loadItems();
  const newItem = { text: req.body?.text ?? "", ts: Date.now() };
  items.push(newItem);
  saveItems(items);
  res.json({ ok: true, item: newItem });
});

router.delete("/", (_req, res) => {
  saveItems([]);
  res.json({ ok: true, items: [] });
});

export const memoryRouter = router;
