// frontend/src/VoiceChat.jsx
import React, { useState } from "react";

export default function VoiceChat({ agentMgr, apiBase = "" }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // play mp3 returned by backend /api/tts
  async function playAudioUrl(audio_url) {
    try {
      const audio = new Audio(audio_url);
      audio.playbackRate = 1.0;
      await audio.play();
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  // call backend to get ElevenLabs audio_url
  async function getTTS(text) {
    const r = await fetch(`${apiBase}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error("tts " + r.status);
    return await r.json(); // { ok, audio_url }
  }

  async function onAsk() {
    setErr("");
    setIsAsking(true);

    try {
      const payload = { text: q.trim() };

      const r = await fetch(`${apiBase}/api/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error("respond " + r.status);
      const j = await r.json();

      const a = (j.answer ?? j.reply ?? j.text ?? "").trim();
      setAnswer(a || "(no answer)");

      if (!a) return;

      // ✅ ALWAYS create ElevenLabs audio first
      const { audio_url } = await getTTS(a);

      // ✅ If D-ID agent supports audio_url, prefer that
      if (agentMgr?.chat) {
        // Many D-ID wrappers accept either text OR a payload.
        // We try payload first, fall back to text.
        try {
          await agentMgr.chat({ text: a, audio_url });
        } catch {
          await agentMgr.chat(a);
        }
      }

      // ✅ Also play locally so you can confirm voice instantly
      if (audio_url) {
        await playAudioUrl(audio_url);
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", padding: 16 }}>
      <h1>GarvanGPT — Minimal Ask Test</h1>

      <label style={{ display: "block", marginBottom: 8 }}>
        Question (dev-only)
      </label>
      <textarea
        rows={3}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: "100%", padding: 12, marginBottom: 8 }}
        placeholder="what is amoxicillin"
      />

      <button onClick={onAsk} style={{ padding: "8px 14px" }} disabled={isAsking}>
        {isAsking ? "Asking..." : "Ask"}
      </button>

      {err && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          Error: {err}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Assistant
        </label>
        <textarea
          readOnly
          rows={6}
          value={answer}
          style={{ width: "100%", padding: 12 }}
          placeholder="The answer will appear here…"
        />
      </div>
    </div>
  );
}
