import avatarUrl from "../assets/avatar.png";

/**
 * Reusable chat bubble.
 * - Shows avatar ONLY for assistant
 * - Fixed width/height to avoid layout shift
 * - Mobile-friendly spacing
 */
export default function MessageBubble({ role = "assistant", children }) {
  const isAssistant = role === "assistant";

  return (
    <div className={`flex w-full items-start gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant && (
        <img
          src={avatarUrl}
          alt="Bot"
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="w-7 h-7 rounded-full shrink-0 mt-0.5 ring-1 ring-black/5 dark:ring-white/10"
        />
      )}

      <div
        className={
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed " +
          (isAssistant
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            : "bg-blue-600 text-white")
        }
      >
        {children}
      </div>

      {!isAssistant && <div className="w-7 h-7 shrink-0" />}
    </div>
  );
}
