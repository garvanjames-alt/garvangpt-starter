// frontend/src/SourcesPanel.jsx
import React from "react";

export default function SourcesPanel({ sources = [] }) {
  const niceName = (file = "") => {
    try {
      const base = (file || "").split("/").pop();
      return base.replace(/_/g, " ").replace(/\.(txt|md)$/i, "");
    } catch {
      return file || "source";
    }
  };

  const pct = (score) =>
    typeof score !== "number" || !Number.isFinite(score)
      ? "—"
      : `${Math.round(score * 100)}%`;

  return (
    <section className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Sources</h3>
      <ul className="space-y-2">
        {sources.map((s, i) => (
          <li
            key={`${s.file || "?"}-${i}`}
            className="rounded-xl p-3 shadow-sm border border-gray-200"
            style={{ lineHeight: 1.25 }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium">{i + 1}. {niceName(s.file)}</div>
              <div className="text-xs opacity-60">{pct(s.score)}</div>
            </div>
            {s.snippet ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{s.snippet}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
