import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const filePath = path.resolve("./backend/memory.jsonl");

function loadItems() {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines.map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function saveItems(items) {
  const jsonl = items.map(item => JSON.stringify(item)).join("\n");
  fs.writeFileSync(filePath, jsonl);
}

router.get("/", (req, res) => {
  res.json({ ok: true, items: loadItems() });
});

router.post("/", (req, res) => {
  const items = loadItems();
  const newItem = { text: req.body.text, ts: Date.now() };
  items.push(newItem);
  saveItems(items);
  res.json({ ok: true, item: newItem });
});

router.delete("/", (req, res) => {
  saveItems([]);
  res.json({ ok: true, items: [] });
});

export const memoryRouter = router;
