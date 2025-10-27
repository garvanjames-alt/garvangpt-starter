import { useEffect, useRef, useState } from "react";
import { getMemories, addMemory, clearMemories } from "../api";

const styles = {
  card: { marginTop: 16 },
  list: { padding: "8px 0 0 0" },
  item: { margin: "6px 0" },
  ts: { opacity: 0.7, marginRight: 8 },
  row: { display: "flex", gap: 8, alignItems: "center" },
  input: { flex: 1 }
};

export default function Memories() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // initial load
  useEffect(() => {
    (async () => {
      try {
        const data = await getMemories(); // ALWAYS via API_BASE
        if (data?.ok && Array.isArray(data.items)) setItems(data.items);
      } catch (err) {
        console.error("GET /memory failed:", err);
        toast("request_failed", true);
      }
    })();
  }, []);

  async function onAdd() {
    const text = (inputRef.current?.value || "").trim();
    if (!text) return;
    setBusy(true);
    try {
      const data = await addMemory(text);
      if (data?.ok && data.item) {
        setItems((prev) => [data.item, ...prev]);
        inputRef.current.value = "";
        toast("Saved.");
      } else {
        toast("Save failed", true);
      }
    } catch (err) {
      console.error(err);
      toast("request_failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    if (!confirm("Clear all memories?")) return;
    setBusy(true);
    try {
      const data = await clearMemories(); // ALWAYS via API_BASE
      if (data?.ok) {
        setItems([]);
        toast("Cleared.");
      } else {
        toast("Clear failed", true);
      }
    } catch (err) {
      console.error(err);
      toast("request_failed", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.card}>
      <h2>Memories</h2>

      <div style={styles.row}>
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="Add a memory…"
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          disabled={busy}
        />
        <button onClick={onAdd} disabled={busy}>Add</button>
        <button onClick={onClear} disabled={busy}>Clear</button>
      </div>

      <ul style={styles.list}>
        {items.length === 0 ? (
          <li className="muted">No memories yet.</li>
        ) : (
          items.map((m, i) => (
            <li key={m.id ?? i} style={styles.item}>
              <span style={styles.ts}>
                {new Date(m.ts).toLocaleDateString()}{" "}
                {new Date(m.ts).toLocaleTimeString()}
              </span>
              <span>{m.text}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

/* --- tiny toast helper (uses your existing CSS .toast / .toast--err) --- */
function toast(msg, err = false) {
  const el = document.createElement("div");
  el.className = err ? "toast toast--err" : "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
