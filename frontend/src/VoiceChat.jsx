// frontend/src/VoiceChat.jsx
import React, { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://almosthuman-starter.onrender.com";

export default function VoiceChat() {
  const [status, setStatus] = useState("idle");
  const [supported, setSupported] = useState({ sr: false, tts: false });
  const [transcript, setTranscript] = useState("");
  const recRef = useRef(null);

  const [reply, setReply] = useState("");

  // --- feature detect ---
  useEffect(() => {
    const sr =
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    const tts = "speechSynthesis" in window || true; // we also have ElevenLabs
    setSupported({ sr, tts });
  }, []);

  // --- start mic ---
  const startMic = () => {
    if (!supported.sr) return alert("SpeechRecognition not supported.");
    setTranscript("");
    setReply("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      let finalText = "";
      for (const r of e.results) finalText += r[0].transcript;
      setTranscript(finalText);
    };
    rec.onend = () => setStatus("idle");
    rec.onerror = () => setStatus("idle");

    recRef.current = rec;
    setStatus("listening");
    rec.start();
  };

  const clearTranscript = () => {
    setTranscript("");
    setReply("");
  };

  // --- simple TTS test using ElevenLabs backend ---
  const playTestVoice = async () => {
    try {
      const r = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello from ElevenLabs via your backend." }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      console.log("✓ TTS played.");
    } catch (err) {
      console.error("✗ TTS test failed:", err);
    }
  };

  // --- NEW: send transcript to prototype (/chat) ---
  const sendToPrototype = async () => {
    setReply("");
    try {
      const r = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript || "Say hello" }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.error || r.statusText);
      setReply(data.reply || "");

      // speak reply through ElevenLabs
      try {
        const r2 = await fetch(`${API_BASE}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.reply || "Okay" }),
        });
        if (r2.ok) {
          const blob = await r2.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          await audio.play();
        }
      } catch {}
    } catch (err) {
      console.error("chat error:", err);
      setReply("(error talking to prototype)");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: "0 12px" }}>
      <h2>Talk to the prototype</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={startMic} disabled={!supported.sr || status === "listening"}>
          🎙️ Start mic
        </button>
        <button onClick={clearTranscript}>🧽 Clear transcript</button>
        <button onClick={playTestVoice}>🔊 Play test voice</button>
        <button onClick={sendToPrototype}>🤖 Send to prototype</button>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
        SpeechRecognition {supported.sr ? "OK" : "–"} • SpeechSynthesis {supported.tts ? "OK" : "–"} • Status: {status}
      </div>

      <textarea
        style={{ marginTop: 12, width: "100%", height: 120, padding: 10 }}
        placeholder="Your transcript will appear here."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />

      {reply && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #eee" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Prototype reply</div>
          <div>{reply}</div>
        </div>
      )}
    </div>
  );
}
