// frontend/src/App.jsx
import React, { useMemo, useState } from "react";
import SupportBar from "./components/SupportBar.jsx";
import VoiceChat from "./VoiceChat.jsx";

export default function App() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <SupportBar />

      {/* FORCE holding avatar video here */}
      <section className="w-full border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-50">
          <video
  src="/did-avatar.mp4"
  className="h-[420px] w-full object-contain"
  autoPlay
  loop
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
