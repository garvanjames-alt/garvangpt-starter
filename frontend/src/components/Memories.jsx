import React, { useEffect, useState } from "react";
import { listMemories, addMemory, clearMemories } from "../lib/api";

export default function Memories() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");

  async function refresh() {
    try {
      const rows = await listMemories();
      setItems(rows);
    } catch (e) {
      console.error(e);
      alert("Failed to load memories");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onAdd() {
    if (!text.trim()) return;
    await addMemory(text.trim());
    setText("");
    await refresh();
  }

  async function onClear() {
    if (!confirm("Clear all memories?")) return;
    await clearMemories();
    await refresh();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">Memories</h2>

      <div className="flex gap-2 mb-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border p-2 rounded w-full"
          placeholder="Add a memory…"
        />
        <button onClick={onAdd} className="px-3 py-2 border rounded">
          Add
        </button>
        <button onClick={onClear} className="px-3 py-2 border rounded">
          Clear
        </button>
      </div>

      <ul className="list-disc ml-6">
        {items.map((m, i) => (
          <li key={i}>
            {m && m.text ? m.text : JSON.stringify(m)}{" "}
            {m && m.ts ? (
              <span className="text-gray-500">
                ({new Date(m.ts).toLocaleString()})
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
