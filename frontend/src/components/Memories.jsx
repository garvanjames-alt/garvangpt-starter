import { useEffect, useState } from "react";
import { listMemory, addMemory, clearMemory, API_BASE } from "../api.js";

export default function Memories() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await listMemory();
        if (res?.ok) setItems(res.items || []);
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
        setItems((cur) => [res.item, ...cur]);
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
      const res = await clearMemory();
      if (res?.ok) {
        setItems([]);
        toast("Cleared.");
      } else {
        toast("Clear failed.", true);
      }
    } catch (err) {
      console.error(err);
      toast("Clear failed.", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="memories" className="page">
      <h2>Memories</h2>

      <div className="controls" style={{ justifyContent: "flex-start" }}>
        <input
          placeholder="Add a memory…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
        <button onClick={onAdd} disabled={busy} style={{ marginLeft: 12 }}>
          Add
        </button>
        <button onClick={onClear} disabled={busy} style={{ marginLeft: 12 }}>
          Clear
        </button>
      </div>

      <ul style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <li className="muted">No memories yet.</li>
        ) : (
          items.map((m) => (
            <li key={m.id || m.ts}>
              <span style={{ opacity: 0.7, marginRight: 8 }}>
                {new Date(m.ts).toLocaleDateString()}{" "}
                {new Date(m.ts).toLocaleTimeString()}
              </span>
              <span>{m.text}</span>
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

function toast(msg, err = false) {
  const el = document.createElement("div");
  el.className = err ? "toast toast--err" : "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
