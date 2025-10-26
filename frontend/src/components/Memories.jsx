// frontend/src/components/Memories.jsx
import React, { useEffect, useState } from "react";

export default function Memories() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // Load existing memories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/memory");
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        console.error("Failed to load memories", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Add a new memory
  async function addMemory(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setLoading(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const item = await res.json();
      setItems((prev) => [...prev, item]);
      setText("");
    } catch (e) {
      console.error("Failed to add memory", e);
    } finally {
      setLoading(false);
    }
  }

  // Clear all memories
  async function clearAll() {
    if (!confirm("Clear all memories?")) return;
    setLoading(true);
    try {
      await fetch("/api/memory", { method: "DELETE" });
      setItems([]);
    } catch (e) {
      console.error("Failed to clear memories", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* form row */}
      <form className="controls" onSubmit={addMemory}>
        <label htmlFor="memory-input" className="sr-only">Add a memory</label>
        <input
          id="memory-input"
          type="text"
          placeholder="Add a memory…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="primary" disabled={loading || !text.trim()}>
          Add
        </button>
        <button type="button" onClick={clearAll} disabled={loading || items.length === 0}>
          Clear
        </button>
      </form>

      {/* list */}
      <ul className="memories">
        {items.map((m, i) => (
          <li key={i}>
            {m.text}{" "}
            {m.ts ? (
              <span style={{ opacity: 0.6 }}>
                ({new Date(m.ts).toLocaleDateString()} {new Date(m.ts).toLocaleTimeString()})
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Small utility class used by content.css styles above */
