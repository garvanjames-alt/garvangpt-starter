// frontend/src/VoiceChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { API_BASE, sendToPrototype, ttsToBlob } from "./lib/api";

/**
 * Simple voice demo:
 * - Mic → transcript (browser SpeechRecognition)
 * - "Send to prototype" → calls /chat
 * - Auto-speak prototype reply via /tts
 * - "Play test voice" → quick TTS smoke test
 */
export default function VoiceChat() {
  const [recognitionOK, setRecognitionOK] = useState(false);
  const [synthesisOK, setSynthesisOK] = useState(false);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const recRef = useRef(null);
  const audioRef = useRef(null);

  // Feature detect
  useEffect(() => {
    const SR =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition;
    setRecognitionOK(!!SR);
    setSynthesisOK(!!window.speechSynthesis);
    if (SR) {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let t = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          t += e.results[i][0].transcript;
        }
        setTranscript((prev) => {
          // replace last interim chunk
          return t;
        });
      };
      rec.onend = () => setStatus("idle");
      rec.onerror = () => setStatus("idle");
      recRef.current = rec;
    }
  }, []);

  const startMic = () => {
    if (!recRef.current) return;
    setStatus("listening");
    recRef.current.start();
  };

  const clearTranscript = () => {
    setTranscript("");
    setReply("");
  };

  const playBlob = async (blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.src = url;
    await audioRef.current.play();
  };

  const playTestVoice = async () => {
    try {
      setStatus("speaking");
      const blob = await ttsToBlob("This is your test voice from ElevenLabs.");
      await playBlob(blob);
    } catch (err) {
      console.error("TTS test failed:", err);
      alert("TTS test failed. Check backend / env config.");
    } finally {
      setStatus("idle");
    }
  };

  const handleSend = async () => {
    const text = transcript.trim();
    if (!text) return;
    try {
      setStatus("thinking");
      const { reply: modelReply } = await sendToPrototype(text);
      setReply(modelReply || "(no reply)");

      // Auto-speak the reply
      setStatus("speaking");
      const blob = await ttsToBlob(modelReply || "I have nothing to say.");
      await playBlob(blob);
    } catch (err) {
      console.error("Send to prototype failed:", err);
      alert("Prototype request failed. Check backend logs.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section aria-labelledby="talk-proto">
      <h2 id="talk-proto">Talk to the prototype</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={startMic} disabled={!recognitionOK || status === "listening"}>
          🎙️ Start mic
        </button>
        <button onClick={clearTranscript}>🧽 Clear transcript</button>
        <button onClick={playTestVoice} disabled={status !== "idle"}>
          🎧 Play test voice
        </button>
        <button onClick={handleSend} disabled={status !== "idle"}>
          🤖 Send to prototype
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
        SpeechRecognition {recognitionOK ? "OK" : "N/A"} • SpeechSynthesis{" "}
        {synthesisOK ? "OK" : "N/A"} • Status: {status}
      </div>

      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Your transcript will appear here."
        style={{ width: "100%", minHeight: 140 }}
      />

      <div style={{ marginTop: 12 }}>
        <strong>Prototype reply</strong>
        <div
          style={{
            marginTop: 6,
            padding: 12,
            background: "#f7f7f8",
            borderRadius: 8,
            border: "1px solid #eee",
          }}
        >
          {reply || "—"}
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
        API: <code>{API_BASE}</code>
      </div>
    </section>
  );
}
