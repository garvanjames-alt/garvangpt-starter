// frontend/src/lib/tts.js
const BACKEND =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

let currentAudio = null;
let currentUrl = null;

export async function speak(text, { onStart, onEnd, onError } = {}) {
  try {
    if (!text || !text.trim()) return;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }

    const r = await fetch(`${BACKEND}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!r.ok) throw new Error(`TTS failed: ${r.status}`);

    const blob = await r.blob();
    currentUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(currentUrl);

    onStart?.();
    await currentAudio.play();
    currentAudio.onended = () => onEnd?.();
  } catch (err) {
    console.error("speak() error:", err);
    onError?.(err);
  }
}
