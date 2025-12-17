// frontend/src/App.jsx
import React, { useState, useRef } from "react";
import "./index.css";

import AvatarStage from "./components/AvatarStage.jsx";
import SupportBar from "./components/SupportBar.jsx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [talkUrl, setTalkUrl] = useState("");
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState("");
  const [videoStatus, setVideoStatus] = useState(""); // "creating" | "polling" | "done"

  const videoRef = useRef(null);

  // apiBase already includes /api
  const apiBase =
    (import.meta.env.VITE_BACKEND_URL ||
      "https://almosthuman-starter-staging.onrender.com"
    ).replace(/\/$/, "") + "/api";

  async function pollDidResult(talk_id) {
    // Poll up to ~60s (60 x 1s)
    for (let i = 0; i < 60; i++) {
      await sleep(1000);

      const r = await fetch(`${apiBase}/did/talk/${encodeURIComponent(talk_id)}`, {
        method: "GET",
        credentials: "include",
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        // Keep polling a bit even if transient errors occur
        // But if the backend returns a hard error repeatedly, we’ll time out below.
        continue;
      }

      const status = j.status;
      const result_url = j.result_url;

      if (status === "done" && result_url) {
        return result_url;
      }

      if (status === "error") {
        throw new Error("D-ID returned status=error");
      }
    }

    throw new Error("Timed out waiting for D-ID video (polling exceeded 60s)");
  }

  async function onAsk() {
    const q = question.trim();
    if (!q || asking) return;

    setAsking(true);
    setErr("");
    setAnswer("");
    setTalkUrl("");
    setVideoStatus("");

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

      if (rTTS.status === 204) {
        throw new Error("TTS disabled (no ELEVEN_API_KEY/VOICE set).");
      }
      if (!rTTS.ok) throw new Error("tts " + rTTS.status);

      const jTTS = await rTTS.json();
      const audio_url = jTTS?.audio_url;
      if (!audio_url) throw new Error("tts returned no audio_url");

      // 3) create D-ID talk job (returns 202 + talk_id)
      setVideoStatus("creating");
      const r2 = await fetch(`${apiBase}/did/talk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audio_url }),
      });

      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2?.ok || !j2?.talk_id) {
        throw new Error(j2?.error || `did/talk failed (${r2.status})`);
      }

      const talk_id = j2.talk_id;

      // 4) poll until done → get signed mp4 result_url
      setVideoStatus("polling");
      const result_url = await pollDidResult(talk_id);

      setTalkUrl(result_url);
      setVideoStatus("done");

      // Try to kick playback (browser may still block autoplay sometimes)
      setTimeout(() => {
        const el = videoRef.current;
        if (el) {
          el.play().catch(() => {});
        }
      }, 50);
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
              ref={videoRef}
              src={talkUrl}
              autoPlay
              playsInline
              controls
              className="w-full h-[360px] object-cover rounded-xl bg-black"
            />
          ) : (
            <AvatarStage />
          )}

          {/* small status line */}
          {(asking || videoStatus) && (
            <div className="mt-2 text-xs opacity-80">
              {videoStatus === "creating" && "Creating D-ID talk…"}
              {videoStatus === "polling" && "Generating video… (polling D-ID)"}
              {videoStatus === "done" && "Video ready."}
            </div>
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
