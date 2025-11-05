import avatarUrl from "../assets/avatar.png";

export default function ChatHeader() {
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
      <img
        src={avatarUrl}
        alt="Almost Human"
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        className="w-10 h-10 rounded-full shrink-0 ring-1 ring-black/5 dark:ring-white/10"
      />
      <div className="min-w-0">
        <h1 className="text-base md:text-lg font-semibold leading-tight">Almost Human</h1>
        <p className="text-xs text-zinc-500">health chat</p>
      </div>
    </header>
  );
}
