// frontend/src/VoiceChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { sendPrototype } from "./lib/api";

export default function VoiceChat() {
  const [status, setStatus] = useState("idle"); // 'idle' | 'recording' | 'sending' | 'speaking'
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState(null);

  // Web Speech API (browser) for mic + speak test
  const recRef = useRef(null);
  const recogSupported = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  const synthSupported = "speechSynthesis" in window;

  function flash(msg, type = "ok") {
    setNote({ msg, type });
    setTimeout(() => setNote(null), 2500);
  }

  // ---- Microphone transcript (browser) ----
  function startMic() {
    if (!recogSupported) {
      flash("SpeechRecognition not supported in this browser", "err");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const sr = new SR();
    sr.continuous = false;
    sr.interimResults = false;
    sr.lang = "en-US";

    sr.onstart = () => setStatus("recording");
    sr.onerror = (e) => {
      setStatus("idle");
      flash(`Mic error: ${e.error || "unknown"}`, "err");
    };
    sr.onend = () => setStatus("idle");
    sr.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setTranscript((t) => (t ? `${t}\n${text}` : text));
    };
    recRef.current = sr;
    sr.start();
  }

  function clearTranscript() {
    setTranscript("");
    setReply("");
    setNote(null);
  }

  function playTestVoice() {
    if (!synthSupported) {
      flash("SpeechSynthesis not supported in this browser", "err");
      return;
    }
    setStatus("speaking");
    const u = new SpeechSynthesisUtterance(
      "This is a test of the system voice path. Hello from Almost Human."
    );
    u.onend = () => setStatus("idle");
    u.onerror = () => {
      setStatus("idle");
      flash("Local TTS error", "err");
    };
    window.speechSynthesis.speak(u);
  }

  // ---- Send to backend prototype (/chat) ----
  async function onSend() {
    const text = transcript.trim();
    if (!text) return;
    setStatus("sending");
    setReply("");
    try {
      const data = await sendPrototype(text); // { reply: "..." }
      const out = typeof data === "string" ? data : data?.reply || "";
      setReply(out);
    } catch (err) {
      flash(`Send failed: ${err.message}`, "err");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Talk to the prototype</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={startMic} disabled={status !== "idle"}>
          {status === "recording" ? "Listening…" : "Start mic"}
        </button>
        <button onClick={clearTranscript} disabled={status === "recording" || status === "sending"}>
          Clear transcript
        </button>
        <button onClick={playTestVoice} disabled={status !== "idle"}>
          Play test voice
        </button>
        <button onClick={onSend} disabled={status !== "idle" || !transcript.trim()}>
          Send to prototype
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        SpeechRecognition {recogSupported ? "OK" : "Unavailable"} • SpeechSynthesis{" "}
        {synthSupported ? "OK" : "Unavailable"} • Status: {status}
      </div>

      {note && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: note.type === "err" ? "#a00" : "#0a0",
          }}
        >
          {note.msg}
        </div>
      )}

      <textarea
        placeholder="Your transcript will appear here."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={6}
        style={{ width: "100%", marginTop: 10, padding: 10 }}
      />

      {reply ? (
        <div
          style={{
            marginTop: 12,
            background: "#fafafa",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Prototype reply</div>
          <div>{reply}</div>
        </div>
      ) : null}
    </section>
  );
}
