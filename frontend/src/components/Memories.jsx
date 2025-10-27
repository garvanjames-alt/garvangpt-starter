import { useEffect, useState } from "react";
import { getMemories, addMemory, clearMemories, API_BASE } from "../api";

export default function Memories() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // initial load
  useEffect(() => {
    (async () => {
      try {
        const res = await getMemories(); // ALWAYS via API_BASE
        if (res?.ok && Array.isArray(res.items)) setItems(res.items || []);
        else toast("Failed to load memories", true);
      } catch (err) {
        console.error(err);
        toast("Failed to load memories", true);
      }
    })();
  }, []);

  async function onAdd() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await addMemory(text.trim());
      if (res?.ok && res.item) {
        setItems((cur) => [res.item, ...(cur || [])]);
        setText("");
        toast("Saved.");
      } else {
        toast("Save failed.", true);
      }
    } catch (err) {
      console.error(err);
      toast("Save failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    if (!confirm("Clear all memories?")) return;
    setBusy(true);
    try {
      const res = await clearMemories();
      if (res?.ok) {
        setItems([]);
        toast("Cleared.");
      } else {
        toast("Clear failed", true);
      }
    } catch (err) {
      console.error(err);
      toast("Clear failed", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="memories" className="page">
      <h2>Memories</h2>

      <div className="controls" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          placeholder="Add a memory…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          disabled={busy}
        />
        <button onClick={onAdd} disabled={busy || !text.trim()}>Add</button>
        <button onClick={onClear} disabled={busy || items.length === 0}>Clear</button>
      </div>

      <ul style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <li className="muted">No memories yet.</li>
        ) : (
          items.map((m) => (
            <li key={m.id || m.ts}>
              <span style={{ opacity: 0.7, marginRight: 8 }}>
                {new Date(m.ts).toLocaleDateString()} {" "}
                {new Date(m.ts).toLocaleTimeString()}
              </span>
              {m.text}
            </li>
          ))
        )}
      </ul>

      {/* debug hint so we can see which host is used */}
      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
        API: {API_BASE || "(unset)"}
      </div>
    </section>
  );
}

// --- tiny toast helper (uses your existing CSS .toast / .toast--err) ---
function toast(msg, err = false) {
  const el = document.createElement("div");
  el.className = err ? "toast toast--err" : "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 1500);
}
