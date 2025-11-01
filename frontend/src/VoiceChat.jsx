import React, { useState } from "react";

export default function VoiceChat() {
  const [input, setInput] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [autoRead, setAutoRead] = useState(false);

  // --- send user text to backend /respond route
  const sendToPrototype = async () => {
    if (!input.trim()) return;

    const response = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });

    const data = await response.json();
    const reply = data.reply || "(no reply)";
    setAssistantReply(reply);
    setInput("");

    // auto-read if checkbox is on
    if (autoRead) {
      await speak(reply);
    }
  };

  // --- ElevenLabs playback using your backend
  const speak = async (text) => {
    try {
      setIsReading(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.error("TTS error:", res.status);
        return;
      }

      // convert to playable audio blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsReading(false);
      };
    } catch (err) {
      console.error("Speak failed:", err);
      setIsReading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Talk to the prototype</h3>
      <textarea
        rows={3}
        style={{ width: "100%" }}
        placeholder="Speak or type here…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div style={{ marginTop: 5 }}>
        <button onClick={sendToPrototype}>Send to prototype</button>{" "}
        <label style={{ fontSize: 14 }}>
          <input
            type="checkbox"
            checked={autoRead}
            onChange={(e) => setAutoRead(e.target.checked)}
          />{" "}
          Read assistant reply aloud
        </label>{" "}
        {isReading && <span>🔊 Speaking…</span>}
      </div>
      <h4>Assistant</h4>
      <div
        style={{
          minHeight: 40,
          border: "1px solid #ccc",
          padding: 8,
          borderRadius: 4,
        }}
      >
        {assistantReply || "—"}
      </div>
    </div>
  );
}
