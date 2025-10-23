// src/VoiceChat.jsx
import React, { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function VoiceChat({ onAgentSpeak }) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState("");     // interim transcript
  const [finalText, setFinal] = useState(""); // committed transcript
  const [garvan, setGarvan] = useState(""); // model reply
  const [error, setError] = useState("");

  const recRef = useRef(null);
  const holdActive = useRef(false);

  // Setup Web Speech API recognition (Chrome/Safari)
  useEffect(() => {
    const Rec =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!Rec) {
      setSupported(false);
      return;
    }

    const r = new Rec();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onstart = () => {
      setListening(true);
      setError("");
    };

    r.onerror = (e) => {
      setError(e?.error || "speech error");
    };

    r.onend = () => {
      setListening(false);
      // If this was a push-to-talk release, send what we have
      if (holdActive.current) {
        holdActive.current = false;
        void sendToBackend();
      }
    };

    r.onresult = (e) => {
      let interim = "";
      let committed = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const chunk = res[0]?.transcript ?? "";
        if (res.isFinal) committed += chunk;
        else interim += chunk;
      }

      if (interim) setLive(interim.trim());
      if (committed) {
        setFinal((prev) => (prev ? `${prev} ${committed.trim()}` : committed.trim()));
        setLive("");
      }
    };

    recRef.current = r;
    return () => {
      try {
        r.onresult = null;
        r.onend = null;
        r.onerror = null;
        r.stop();
      } catch {}
      recRef.current = null;
    };
  }, []);

  function startListening() {
    if (!recRef.current) return;
    setError("");
    setLive("");
    // Don't wipe existing finalText on continuous mode
    try {
      recRef.current.start();
    } catch {
      // start may throw if already started
    }
  }

  function stopListening() {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {}
  }

  async function sendToBackend() {
    const prompt = (finalText || live).trim();
    if (!prompt) return;

    setGarvan("…thinking");
    try {
      const res = await fetch(`${API_BASE}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const answer = data?.answer ?? "(no answer)";
      setGarvan(answer);

      // Nudge the avatar mouth for ~1.2s
      if (typeof onAgentSpeak === "function") onAgentSpeak(1200);
    } catch (e) {
      setGarvan("Sorry — backend error.");
      setError(String(e?.message || e));
    }
  }

  // Push-to-talk handlers
  const handleHoldDown = () => {
    holdActive.current = true;
    startListening();
  };
  const handleHoldUp = () => {
    // Release: stop mic; onend will trigger send
    stopListening();
  };

  const disabledStyle =
    "w-full rounded-md border border-zinc-700 bg-zinc-900/40 text-zinc-200 placeholder-zinc-500 p-3 text-sm";
  const labelStyle = "text-zinc-300 text-sm mb-1";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 mt-6">
      <h2 className="text-zinc-100 text-xl font-semibold mb-3">Realtime Voice (beta)</h2>

      {!supported && (
        <div className="mb-3 text-amber-400">
          Your browser doesn’t support Speech Recognition. You can still use text above.
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <button
          className={`px-4 py-2 rounded-md font-medium ${
            listening ? "bg-zinc-700 text-zinc-300" : "bg-zinc-100 text-zinc-900"
          }`}
          onClick={startListening}
          disabled={!supported || listening}
        >
          Start
        </button>

        <button
          className="px-4 py-2 rounded-md font-medium bg-zinc-800 text-zinc-200"
          onClick={stopListening}
          disabled={!supported || !listening}
        >
          Stop Voice
        </button>

        <button
          className="px-4 py-2 rounded-md font-medium bg-zinc-800 text-zinc-200"
          onMouseDown={handleHoldDown}
          onMouseUp={handleHoldUp}
          onMouseLeave={handleHoldUp}
          onTouchStart={handleHoldDown}
          onTouchEnd={handleHoldUp}
          disabled={!supported}
          title="Press & hold — Space works when the button is focused"
        >
          🎙️ Hold to Talk
        </button>

        <div className="text-zinc-500 text-sm ml-auto">Voice: Samantha</div>
      </div>

      <div className="mb-3">
        <div className={labelStyle}>You (live)</div>
        <input
          className={disabledStyle}
          value={live}
          placeholder="—"
          readOnly
        />
      </div>

      <div className="mb-3">
        <div className={labelStyle}>You (final)</div>
        <input
          className={disabledStyle}
          value={finalText}
          placeholder="—"
          readOnly
        />
      </div>

      <div className="mb-3 flex gap-2">
        <button
          className="px-3 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium"
          onClick={() => {
            setLive("");
            setFinal("");
            setGarvan("");
            setError("");
          }}
        >
          Reset
        </button>
        <button
          className="px-3 py-2 rounded-md bg-zinc-800 text-zinc-200 text-sm font-medium"
          onClick={sendToBackend}
        >
          Send to Garvan
        </button>
      </div>

      <div>
        <div className={labelStyle}>Garvan</div>
        <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-zinc-100">
          {garvan || "—"}
        </div>
      </div>

      {error && (
        <div className="mt-3 text-rose-400 text-sm">
          {String(error)}
        </div>
      )}
    </div>
  );
}
