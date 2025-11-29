// frontend/src/App.jsx
import React, { useRef, useState } from "react";
import SupportBar from "./components/SupportBar.jsx";
import VoiceChat from "./VoiceChat.jsx";

export default function App() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef(null);

  const handleAvatarClick = () => {
    if (!videoRef.current) return;
    // First user click = allow sound
    setVideoMuted(false);
    videoRef.current.muted = false;
    videoRef.current.volume = 1;
    videoRef.current.play();
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <SupportBar />

      {/* Holding avatar video */}
      <section className="w-full border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-50 cursor-pointer"
            onClick={handleAvatarClick}
            title="Click to enable sound"
          >
            <video
              ref={videoRef}
              src="/did-avatar.mp4"
              className="h-[420px] w-full object-contain"
              autoPlay
              loop
              muted={videoMuted}
              playsInline
            />

            {isSpeaking && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-indigo-400/40" />
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm backdrop-blur">
                Click "Talk to Garvan" or type below to start
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <VoiceChat />
      </main>
    </div>
  );
}
