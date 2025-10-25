import React, { useState } from "react";

export default function UsedDetailsList({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
      {items.map((d, i) => (
        <DetailChip key={i} detail={d} />
      ))}
    </div>
  );
}

function DetailChip({ detail }) {
  const [open, setOpen] = useState(false);
  const score = typeof detail.score === "number" ? detail.score.toFixed(2) : "—";
  const label = detail.source || detail.id || "memory";
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 8, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid #ccc" }}>
          score {score}
        </span>
        <code style={{ fontSize: 12, background: "#f6f6f6", padding: "2px 6px", borderRadius: 6 }}>
          {label}
        </code>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ marginLeft: "auto", fontSize: 12, padding: "4px 8px", borderRadius: 8, border: "1px solid #ccc", background: "white", cursor: "pointer" }}
          aria-expanded={open}
        >
          {open ? "Hide snippet" : "Show snippet"}
        </button>
      </div>
      {open && (
        <div style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
          {detail.text}
        </div>
      )}
    </div>
  );
}
