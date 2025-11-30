// frontend/src/components/AvatarStage.jsx
// AvatarStage = isolated, voice-safe hero.
// Shows D-ID holding video and lets user click to toggle sound.

import React, { useEffect, useRef, useState } from "react";

export default function AvatarStage({
  src = "/did-avatar.mp4",
  label = 'Click "Talk to Garvan" or type below to start',
  isSpeaking = false,
}) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  // Ensure autoplay works (starts muted by default)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    // try play on mount; browser may block if not muted
    v.play().catch(() => {});
  }, [muted]);

  const toggleSoundAndPlay = () => {
    const v = videoRef.current;
    if (!v) return;

    // First click: unmute + play
    const nextMuted = !muted;
    v.muted = nextMuted;
    setMuted(nextMuted);

    if (v.paused) v.play().catch(() => {});
    else v.pause(); // lets you pause/resume too
  };

  return (
    <section className="w-full border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-50"
          onClick={toggleSoundAndPlay}
          role="button"
          aria-label="Toggle avatar sound"
        >
          <video
            ref={videoRef}
            src={src}
            className="h-[420px] w-full object-contain"
            autoPlay
            loop
            playsInline
            muted={muted}
            preload="auto"
          />

          {isSpeaking && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-indigo-400/40" />
          )}

          {/* soft play overlay when muted */}
          {muted && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white/90 shadow-md">
                <div className="ml-1 h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-indigo-600" />
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm backdrop-blur">
              {label}
              {muted && <span className="ml-2 opacity-70">• Tap avatar for sound</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
