// frontend/src/App.jsx
import { useMemo, useRef, useState } from "react";
import { askGarvan } from "./lib/api";
import VoiceChat from "./VoiceChat.jsx";

const AVATAR_SRC = "/avatar.jpg";

export default function App() {
  const talkRef = useRef(null);
  const whoRef = useRef(null);
  const whatRef = useRef(null);
  const healthRef = useRef(null);
  const medRef = useRef(null);

  const [mode, setMode] = useState("text"); // "text" | "voice"
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi Garvan — I’m Almost Human. Ask me anything." },
  ]);
  const [isSending, setIsSending] = useState(false);

  const scrollTo = (ref) =>
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function send(textOverride) {
    const q = (textOverride ?? input).trim();
    if (!q || isSending) return;

    setIsSending(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);

    try {
      const res = await askGarvan(q);
      const answer =
        res?.answer || res?.text || "Sorry — I couldn’t answer that yet.";
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Backend error — try again in a moment." },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  const pills = useMemo(
    () => [
      "Redefining patient experience",
      "Safety and trust first",
      "Pharmacist review",
    ],
    []
  );

  const lastAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].text;
    }
    return "";
  }, [messages]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header / Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={AVATAR_SRC}
              alt="Garvan avatar"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200"
            />
            <div>
              <div className="font-semibold leading-tight">Almost Human</div>
              <div className="text-sm text-slate-600">
                AI for safe healthcare education
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            <button onClick={() => scrollTo(healthRef)} className="hover:underline">
              Health A–Z
            </button>
            <button onClick={() => scrollTo(medRef)} className="hover:underline">
              Medicine A–Z
            </button>
            <button onClick={() => scrollTo(whoRef)} className="hover:underline">
              Who We Are
            </button>
            <button onClick={() => scrollTo(whatRef)} className="hover:underline">
              What We Do
            </button>
          </nav>

          <button
            onClick={() => scrollTo(talkRef)}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
          >
            Talk to Garvan
          </button>
        </div>

        {/* Support bar */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-700 flex items-center gap-2">
              <span className="text-green-600">💚</span>
              Support Almost Human — help build pharmacist-led AI tools
            </div>
            <div className="flex gap-2">
              <a
                href="#"
                className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-indigo-500"
              >
                Support via Stripe
              </a>
              <a
                href="#"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Support via PayPal
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* ===== TOP ROW ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Who We Are */}
          <div
            ref={whoRef}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8"
          >
            <div className="text-xs font-semibold tracking-widest text-slate-500">
              WHO WE ARE
            </div>
            <h2 className="mt-3 text-2xl md:text-3xl font-black leading-tight">
              My story in 60 seconds
            </h2>
            <p className="mt-3 text-slate-700 text-lg leading-relaxed">
              Almost Human is a pharmacist-built AI healthcare project. I’m Garvan,
              with 20+ years in community pharmacy and 15 years writing medicine
              education for real patients.
            </p>
            <button className="mt-4 rounded-full px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800">
              Watch / Read more
            </button>
          </div>

          {/* What We Do */}
          <div
            ref={whatRef}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8"
          >
            <div className="text-xs font-semibold tracking-widest text-slate-500">
              WHAT WE DO
            </div>
            <h2 className="mt-3 text-2xl md:text-3xl font-black leading-tight">
              Replacing the format of healthcare advice online
            </h2>
            <p className="mt-3 text-slate-700 text-lg leading-relaxed">
              We’re building a safe digital twin that speaks like a pharmacist —
              clear, human, and grounded. Not a leaflet. Not a chatbot. A real voice
              with empathy and clinical caution.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {pills.map((p) => (
                <span
                  key={p}
                  className="px-3 py-1 text-sm rounded-full bg-slate-100 border border-slate-200"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Impact Strip ===== */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <div className="text-lg md:text-xl font-bold">
            “Rebuilding healthcare advice online — with personality, clarity, and trust.”
          </div>
          <p className="mt-2 text-slate-600">
            Ask a question and meet your virtual pharmacist.
          </p>
        </section>

        {/* ===== Health + Medicine A–Z Cards ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Health A–Z */}
          <div
            ref={healthRef}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8"
          >
            <div className="text-xs font-semibold tracking-widest text-slate-500">
              HEALTH A–Z
            </div>
            <h3 className="mt-3 text-xl md:text-2xl font-black leading-tight">
              Browse health topics
            </h3>
            <p className="mt-3 text-slate-700 text-base md:text-lg leading-relaxed">
              Clear, pharmacist‑checked explanations of common conditions, symptoms,
              and what to do next.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => scrollTo(talkRef)}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                Ask a health question
              </button>
              <a
                href="/health_index.json"
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-4 py-2 text-sm font-semibold bg-white border border-slate-300 hover:bg-slate-50"
              >
                View index (dev)
              </a>
            </div>
          </div>

          {/* Medicine A–Z */}
          <div
            ref={medRef}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8"
          >
            <div className="text-xs font-semibold tracking-widest text-slate-500">
              MEDICINE A–Z
            </div>
            <h3 className="mt-3 text-xl md:text-2xl font-black leading-tight">
              Browse medicine guides
            </h3>
            <p className="mt-3 text-slate-700 text-base md:text-lg leading-relaxed">
              Patient‑friendly medicine information — what it’s for, how to take it,
              key cautions, and side effects.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => scrollTo(talkRef)}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                Ask about a medicine
              </button>
              <a
                href="/medicine_index.json"
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-4 py-2 text-sm font-semibold bg-white border border-slate-300 hover:bg-slate-50"
              >
                View index (dev)
              </a>
            </div>
          </div>
        </section>

        {/* ===== AVATAR + CHAT ===== */}
        <section
          ref={talkRef}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="relative w-full h-[380px] md:h-[460px]">
            <img
              src={AVATAR_SRC}
              alt="Garvan avatar stage"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="h-20 w-20 rounded-full bg-white/90 shadow-lg grid place-items-center">
                <div
                  className="ml-1"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "18px solid #5a56ff",
                    borderTop: "10px solid transparent",
                    borderBottom: "10px solid transparent",
                  }}
                />
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 px-4 py-2 rounded-full text-sm font-semibold shadow">
              Click “Talk to Garvan” or type below to start
            </div>
          </div>

          <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="font-semibold mb-2">Ask Garvan anything</div>

              {/* Mode buttons */}
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setMode("text")}
                  className={
                    mode === "text"
                      ? "px-2 py-1 rounded-full bg-white border border-slate-400 font-semibold"
                      : "px-2 py-1 rounded-full bg-white border border-slate-200"
                  }
                >
                  Text
                </button>
                <button
                  onClick={() => setMode("voice")}
                  className={
                    mode === "voice"
                      ? "px-2 py-1 rounded-full bg-white border border-slate-400 font-semibold"
                      : "px-2 py-1 rounded-full bg-white border border-slate-200"
                  }
                >
                  Voice
                </button>
                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                  Education only
                </span>
              </div>
            </div>

            {/* Voice input + TTS output */}
            {mode === "voice" && (
              <div className="mt-2">
                <VoiceChat
                  autoStart
                  disabled={isSending}
                  onFinalText={(t) => send(t)}
                  speakText={lastAssistantText}
                />
              </div>
            )}

            <div className="mt-3 h-56 overflow-y-auto bg-white rounded-xl border border-slate-200 p-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <div
                    className={
                      m.role === "assistant"
                        ? "bg-slate-100 rounded-xl px-3 py-2 text-sm"
                        : "ml-auto bg-indigo-600 text-white rounded-xl px-3 py-2 text-sm"
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Text input hidden if in voice mode */}
            {mode === "text" && (
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                  placeholder="Type your question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  disabled={isSending}
                />
                <button
                  onClick={() => send()}
                  disabled={isSending}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
