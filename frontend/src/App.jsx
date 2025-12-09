// frontend/src/App.jsx
import React, { useState } from "react";
import "./index.css";

import AvatarStage from "./components/AvatarStage.jsx";
import SupportBar from "./components/SupportBar.jsx";

export default function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [talkUrl, setTalkUrl] = useState("");
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState("");

  // apiBase already includes /api
  const apiBase =
    (import.meta.env.VITE_BACKEND_URL ||
      "https://almosthuman-starter-staging.onrender.com"
    ).replace(/\/$/, "") + "/api";

  async function onAsk() {
    const q = question.trim();
    if (!q || asking) return;

    setAsking(true);
    setErr("");
    setAnswer("");
    setTalkUrl("");

    try {
      // 1) get text answer (RAG)
      const r1 = await fetch(`${apiBase}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: q }),
      });

      if (!r1.ok) throw new Error("respond " + r1.status);
      const j1 = await r1.json();
      const a = (j1.answer ?? j1.reply ?? j1.text ?? "").trim();
      setAnswer(a || "(no answer)");
      if (!a) return;

      // 2) get ElevenLabs TTS audio from backend
      const rTTS = await fetch(`${apiBase}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: a }),
      });

      // If TTS is disabled, backend returns 204 → fall back to text-only
      if (rTTS.status === 204) {
        throw new Error("TTS disabled (no ELEVEN_API_KEY/VOICE set).");
      }
      if (!rTTS.ok) throw new Error("tts " + rTTS.status);

      const jTTS = await rTTS.json();
      const audio_url = jTTS?.audio_url;
      if (!audio_url) throw new Error("tts returned no audio_url");

      // 3) make D-ID talk from AUDIO (no D-ID TTS)
      const r2 = await fetch(`${apiBase}/did/talk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audio_url }),
      });

      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2?.result_url) {
        throw new Error(j2?.error || "did/talk failed");
      }

      setTalkUrl(j2.result_url);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <SupportBar />

      <main className="flex-1 flex flex-col items-center gap-6 px-4 py-6">
        {/* Avatar box */}
        <section className="w-full max-w-3xl">
          {talkUrl ? (
            <video
              src={talkUrl}
              autoPlay
              playsInline
              controls
              className="w-full h-[360px] object-cover rounded-xl bg-black"
            />
          ) : (
            <AvatarStage />
          )}
        </section>

        {/* Ask UI */}
        <section className="w-full max-w-3xl flex flex-col gap-2">
          <label className="text-sm opacity-80">Question</label>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
            placeholder="what is amoxicillin"
          />

          <button
            onClick={onAsk}
            disabled={asking}
            className="self-start px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
          >
            {asking ? "Asking + making video..." : "Ask"}
          </button>

          {err && <div className="text-red-300 text-sm">Error: {err}</div>}

          <label className="text-sm opacity-80 mt-3">Assistant</label>
          <textarea
            readOnly
            rows={6}
            value={answer}
            className="w-full p-3 rounded bg-zinc-950 border border-zinc-700"
          />
        </section>
      </main>
    </div>
  );
}
