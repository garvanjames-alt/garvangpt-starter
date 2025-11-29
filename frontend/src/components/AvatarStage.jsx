// frontend/src/components/AvatarStage.jsx
import React from "react";

/**
 * AvatarStage
 * Isolated hero/avatar section.
 * Keeps voice/chat wiring in App/VoiceChat untouched.
 *
 * Props (A2-ready):
 *  - src: image URL for the avatar/hero
 *  - label: string shown in the pill
 *  - onClickTalk: optional click handler for the stage
 *  - isSpeaking: optional boolean (A3/A4 hook point)
 */
export default function AvatarStage({
  src = "/garvan-static.jpg", // replace with your real asset path if different
  label = 'Click "Talk to Garvan" or type below to start',
  onClickTalk,
  isSpeaking = false,
}) {
  return (
    <section className="w-full border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-50"
          onClick={onClickTalk}
          role={onClickTalk ? "button" : undefined}
          aria-label={onClickTalk ? "Talk to Garvan" : undefined}
          tabIndex={onClickTalk ? 0 : undefined}
          onKeyDown={(e) => {
            if (!onClickTalk) return;
            if (e.key === "Enter" || e.key === " ") onClickTalk(e);
          }}
        >
          {/* Avatar / hero image */}
          <img
            src={src}
            alt="Garvan avatar"
            className="h-[420px] w-full object-contain"
            draggable={false}
          />

          {/* Optional speaking glow (hook point) */}
          {isSpeaking && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-indigo-400/40" />
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur">
              <div className="ml-1 h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-indigo-600" />
            </div>
          </div>

          {/* Instruction pill */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm backdrop-blur">
              {label}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
