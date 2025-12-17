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
  const [videoStatus, setVideoStatus] = useState("");
  const [listening, setListening] = useState(false);

  const videoRef = useRef(null);
  const recogRef = useRef(null);

  const apiBase =
    (import.meta.env.VITE_BACKEND_URL ||
      "https://almosthuman-starter-staging.onrender.com"
    ).replace(/\/$/, "") + "/api";

  function getSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    return SR ? new SR() : null;
  }

  async function pollDidResult(talk_id) {
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      const r = await fetch(`${apiBase}/did/talk/${encodeURIComponent(talk_id)}`, {
        method: "GET",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) continue;

      if (j.status === "done" && j.result_url) return j.result_url;
      if (j.status === "error") throw new Error("D-ID returned status=error");
    }
    throw new Error("Timed out waiting for D-ID video (polling exceeded 60s)");
  }

  async function onAsk(forcedText) {
    const q = (forcedText ?? question).trim();
    if (!q || asking) return;

    setAsking(true);
    setErr("");
    setAnswer("");
    setTalkUrl("");
    setVideoStatus("");

    try {
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

      const rTTS = await fetch(`${apiBase}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: a }),
      });

      if (rTTS.status === 204) throw new Error("TTS disabled.");
      if (!rTTS.ok) throw new Error("tts " + rTTS.status);

      const jTTS = await rTTS.json();
      const audio_url = jTTS?.audio_url;
      if (!audio_url) throw new Error("tts returned no audio_url");

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

      setVideoStatus("polling");
      const result_url = await pollDidResult(j2.talk_id);

      setTalkUrl(result_url);
      setVideoStatus("done");

      setTimeout(() => {
        const el = videoRef.current;
        if (el) el.play().catch(() => {});
      }, 50);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setAsking(false);
    }
  }

  async function startListening() {
    if (listening) return;

    const recog = getSpeechRecognition();
    if (!recog) {
      setErr("Speech recognition not supported in this browser. Use Chrome.");
      return;
    }

    setErr("");
    setListening(true);

    recogRef.current = recog;
    recog.lang = "en-US";
    recog.interimResults = true;
    recog.continuous = false;

    let finalText = "";

    recog.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
      }
      // show interim text in the box so it feels alive
      setQuestion((finalText + transcript).trim());
    };

    recog.onerror = (e) => {
      setListening(false);
      setErr(`Mic error: ${e?.error || "unknown"}`);
    };

    recog.onend = () => {
      setListening(false);
      const q = (finalText || question).trim();
      if (q) onAsk(q);
    };

    try {
      recog.start();
    } catch {
      setListening(false);
      setErr("Could not start microphone. Check browser permissions.");
    }
  }

  function stopListening() {
    const r = recogRef.current;
    if (r) {
      try { r.stop(); } catch {}
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <SupportBar />

      <main className="flex-1 flex flex-col items-center gap-6 px-4 py-6">
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

          {(asking || videoStatus) && (
            <div className="mt-2 text-xs opacity-80">
              {videoStatus === "creating" && "Creating D-ID talk…"}
              {videoStatus === "polling" && "Generating video…"}
              {videoStatus === "done" && "Video ready."}
            </div>
          )}
        </section>

        <section className="w-full max-w-3xl flex flex-col gap-2">
          <label className="text-sm opacity-80">Question</label>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
            placeholder="Ask by typing or use the mic…"
          />

          <div className="flex gap-2">
            <button
              onClick={() => onAsk()}
              disabled={asking || listening}
              className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
            >
              {asking ? "Asking + making video..." : "Ask"}
            </button>

            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              disabled={asking}
              className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
              title="Hold to talk"
            >
              {listening ? "Listening… (release to send)" : "🎙️ Hold to talk"}
            </button>
          </div>

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
