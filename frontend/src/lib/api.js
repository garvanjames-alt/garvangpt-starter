// frontend/src/lib/api.js
// Small helper for API calls from the UI.

export const API_BASE =
  (typeof window !== "undefined" && window.location.hostname === "localhost")
    ? "http://localhost:3001"                               // local dev
    : "https://almosthuman-starter.onrender.com";           // Render

export async function askPrototype(prompt) {
  // existing simple /respond passthrough if you use it
  const res = await fetch(`${API_BASE}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data; // { text: "..." } or similar
}

/**
 * Speak text using your backend TTS.
 * Returns an <audio> element that’s already loaded and ready to play.
 */
export async function speakWithTTS(text) {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`TTS failed (${res.status}): ${errTxt}`);
  }
  const blob = await res.blob(); // audio/mpeg
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.controls = true; // show a tiny player so you can replay/pause
  return audio;
}
