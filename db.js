import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'data', 'garvan-memory.json');

async function load() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return { items: [] };
    throw e;
  }
}

async function save(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export const count = async () => (await load()).items.length;
export const getAll = async () => (await load()).items;
export const add = async (item) => {
  const db = await load();
  db.items.unshift({ id: Date.now(), ts: new Date().toISOString(), ...item });
  await save(db);
  return { ok: true };
};
export const clear = async () => {
  await save({ items: [] });
  return { ok: true };
};
