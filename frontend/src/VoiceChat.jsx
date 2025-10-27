// frontend/src/VoiceChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Tiny helper to feature-detect Web Speech APIs on each browser.
 */
function useSpeechApis() {
  const SR = useMemo(() => {
    return (
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition ||
      null
    );
  }, []);
  const synth = useMemo(() => window.speechSynthesis || null, []);
  return { SR, synth };
}

export default function VoiceChat() {
  // ---- Config ----
  const API_BASE = "https://almosthuman-starter.onrender.com";

  // ---- UI state ----
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | listening | spoken | error
  const [srOk, setSrOk] = useState(false);
  const [ssOk, setSsOk] = useState(false);

  // ---- SpeechRecognition setup ----
  const { SR, synth } = useSpeechApis();
  const recRef = useRef(null);

  useEffect(() => {
    setSrOk(Boolean(SR));
    setSsOk(Boolean(synth));
    if (!SR) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onstart = () => {
      setListening(true);
      setStatus("listening");
    };
    rec.onend = () => {
      setListening(false);
      setStatus("idle");
    };
    rec.onerror = (e) => {
      console.error("SpeechRecognition error:", e);
      setStatus("error");
      setListening(false);
    };
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };

    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch (_) {}
    };
  }, [SR, synth]);

  // ---- Actions ----
  const startMic = () => {
    if (!recRef.current) return;
    try {
      recRef.current.start();
    } catch {
      // In some browsers start() throws if already started
    }
  };

  const stopMic = () => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {}
  };

  const clearTranscript = () => {
    setTranscript("");
    setStatus("idle");
  };

  const readTranscript = async () => {
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(
        transcript || "There is no transcript yet."
      );
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onend = () => setStatus("spoken");
      synth.cancel(); // stop any current speech
      synth.speak(u);
    } catch (err) {
      console.error("SpeechSynthesis error:", err);
      setStatus("error");
    }
  };

  /**
   * Calls your backend /tts and plays the returned audio blob.
   * This is the same logic you tested in the console, now as a function.
   */
  const playTestVoice = async () => {
    try {
      const r = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hi there — your ElevenLabs voice pipeline is live.",
        }),
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${r.statusText} ${msg || ""}`.trim());
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      setStatus("spoken");
      // URL.revokeObjectURL(url) after audio ends is optional here
    } catch (err) {
      console.error("TTS failed:", err);
      setStatus("error");
    }
  };

  // ---- UI ----
  return (
    <section style={{ marginTop: 24 }}>
      <h2>Talk to me</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {!listening ? (
          <button onClick={startMic}>🎙️ Start mic</button>
        ) : (
          <button onClick={stopMic}>⏹️ Stop mic</button>
        )}
        <button onClick={clearTranscript}>🧹 Clear transcript</button>
        <button onClick={playTestVoice}>🔊 Play test voice</button>
        <button onClick={readTranscript}>📖 Read transcript</button>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#3a3a3a",
          marginBottom: 8,
        }}
      >
        <span>
          {srOk ? "SpeechRecognition OK" : "SpeechRecognition not available"}
        </span>
        {" • "}
        <span>{ssOk ? "SpeechSynthesis OK" : "SpeechSynthesis not available"}</span>
        {" • "}
        <span>
          Status:{" "}
          {status === "idle"
            ? "idle"
            : status === "listening"
            ? "listening"
            : status === "spoken"
            ? "spoken"
            : "error"}
        </span>
      </div>

      <textarea
        placeholder="Your transcript will appear here."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={5}
        style={{
          width: "100%",
          maxWidth: 640,
          resize: "vertical",
          padding: 12,
        }}
      />

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        API: {API_BASE}
      </div>
    </section>
  );
}
