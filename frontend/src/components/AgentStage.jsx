const avatarUrl = new URL("../assets/avatar.png", import.meta.url).href;

export default function AgentStage({ listening = false, speaking = false }) {
  return (
    <section className="px-4 pt-6 md:pt-8 pb-4 border-b border-zinc-800">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-5 md:gap-8">
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt="Almost Human — Agent"
              width={200}
              height={200}
              loading="eager"
              decoding="async"
              className={[
                "w-40 h-40 md:w-52 md:h-52 rounded-3xl object-cover",
                "ring-1 ring-black/10",
                (listening || speaking) ? "animate-[pulse_1.6s_ease-in-out_infinite]" : ""
              ].join(" ")}
            />
            <div className="absolute -bottom-2 left-2 px-2 py-0.5 text-xs rounded-full bg-zinc-900 text-white">
              {speaking ? "Speaking…" : listening ? "Listening…" : "Idle"}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">Talk to Almost Human</h1>
            <p className="text-sm md:text-base text-zinc-400">
              Press “Start mic”, ask anything about health & medicines.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              (Video avatar coming next — this is a live placeholder.)
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(59,130,246,0)); }
          50% { transform: scale(1.02); filter: drop-shadow(0 0 10px rgba(59,130,246,0.35)); }
        }
      `}</style>
    </section>
  );
}
