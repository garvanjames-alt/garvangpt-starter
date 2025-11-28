// frontend/src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { askBackend } from "./lib/api"; // keep existing backend wiring if present

const AVATAR_SRC = "/avatar.jpg";

export default function App() {
  const talkRef = useRef(null);
  const whoRef = useRef(null);
  const whatRef = useRef(null);
  const healthRef = useRef(null);
  const medRef = useRef(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi Garvan — I’m Almost Human. Ask me anything." },
  ]);
  const [isSending, setIsSending] = useState(false);

  const scrollTo = (ref) =>
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function onSend() {
    const q = input.trim();
    if (!q || isSending) return;
    setIsSending(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);

    try {
      // uses your existing backend adapter (from 7091a8e)
      const res = await askBackend(q);
      const answer = res?.answer || res?.text || "Sorry — I couldn’t answer that yet.";
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (e) {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
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

        {/* Support bar (under nav, like yesterday) */}
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <section ref={talkRef} className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="text-xs font-semibold tracking-widest text-slate-500">
              AI FOR SAFE HEALTHCARE EDUCATION
            </div>

            {/* BIG PROMINENT AVATAR */}
            <div className="mt-4 flex items-start gap-5">
              <div className="relative shrink-0">
                <img
                  src={AVATAR_SRC}
                  alt="Garvan avatar"
                  className="h-28 w-28 md:h-36 md:w-36 rounded-full object-cover ring-4 ring-white shadow-md"
                />
                <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-white ring-2 ring-slate-200 flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight">
                  Talk to Garvan
                  <br />
                  <span className="text-slate-500 font-extrabold">
                    your virtual pharmacist
                  </span>
                </h1>

                <p className="mt-4 text-slate-700 text-lg leading-relaxed">
                  Ask anything about your health or medicines. This prototype is for
                  education only and doesn’t replace your own doctor, pharmacist, or
                  emergency care.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <img
                src={AVATAR_SRC}
                alt="Garvan small avatar"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-200"
              />
              <div>
                <div className="font-semibold">
                  GarvanGPT, your virtual pharmacist
                </div>
                <div className="text-sm text-slate-600">
                  Trained on years of pharmacy experience to explain complex topics in plain language.
                </div>
              </div>
            </div>

            {/* Pills */}
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

            {/* Chat card */}
            <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">Ask Garvan anything</div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-white border">Text</span>
                  <span className="px-2 py-1 rounded-full bg-white border">Voice</span>
                  <span className="px-2 py-1 rounded-full bg-white border">
                    Education only
                  </span>
                </div>
              </div>

              <div className="mt-3 h-56 overflow-y-auto bg-white rounded-xl border border-slate-200 p-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    {m.role === "assistant" && (
                      <img
                        src={AVATAR_SRC}
                        alt="Garvan avatar"
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                    )}
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

              <div className="mt-3 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend()}
                  placeholder="Type your question..."
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={onSend}
                  disabled={isSending}
                  className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo(whoRef)}
                className="rounded-xl bg-indigo-600 text-white px-5 py-3 text-sm font-semibold hover:bg-indigo-500"
              >
                Learn about Almost Human
              </button>
              <button
                onClick={() => scrollTo(healthRef)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                Browse Health A–Z
              </button>
            </div>
          </div>

          {/* Support card (right column) */}
          <aside className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sticky top-28">
            <div className="font-semibold mb-2">💚 Support Almost Human</div>
            <p className="text-sm text-slate-600">
              Help support the development of pharmacist-led AI healthcare tools.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="#"
                className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold text-center hover:bg-indigo-500"
              >
                Support via Stripe
              </a>
              <a
                href="#"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-center hover:bg-slate-50"
              >
                Support via PayPal
              </a>
            </div>
          </aside>
        </section>

        {/* Who / What */}
        <section className="mt-10 grid md:grid-cols-2 gap-6">
          <div ref={whoRef} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-2xl font-extrabold mb-3">Who We Are</h2>
            <p className="text-slate-700 leading-relaxed">
              Almost Human is an AI healthcare project founded by a pharmacist with 20+
              years of experience in community pharmacy. We’re building tools that make
              trustworthy medicine information easier to access — starting with a
              virtual pharmacist that speaks like a real person, not a leaflet.
            </p>
          </div>

          <div ref={whatRef} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-2xl font-extrabold mb-3">What We Do</h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2">
              <li>Answer real-world medicine and health questions clearly and safely.</li>
              <li>Read answers aloud using a warm voice with disclaimers.</li>
              <li>Grow a pharmacist-written knowledge base over time.</li>
              <li>Keep safety, trust, and pharmacist oversight first.</li>
            </ul>
          </div>
        </section>

        {/* A–Z sections (placeholders for now, like yesterday plan) */}
        <section ref={healthRef} className="mt-12 bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-2xl font-extrabold mb-3">Health A–Z</h2>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-600">
            Coming soon. This section will contain pharmacist-written health explainers and safety notes.
          </div>
        </section>

        <section ref={medRef} className="mt-6 bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-2xl font-extrabold mb-3">Medicine A–Z</h2>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-600">
            Coming soon. This section will contain pharmacist-written medicine explainers and safety notes.
          </div>
        </section>
      </main>

      <footer className="mt-10 py-8 text-center text-xs text-slate-500">
        Educational prototype only — not medical advice.
      </footer>
    </div>
  );
}
