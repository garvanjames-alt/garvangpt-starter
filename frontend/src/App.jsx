// frontend/src/App.jsx
import { useMemo, useRef, useState } from "react";
import SupportBar from "./components/SupportBar.jsx";
import AvatarBubble from "./components/AvatarBubble.jsx";
import { askGarvan } from "./lib/api.js";

export default function App() {
  const heroRef = useRef(null);
  const whoRef = useRef(null);
  const whatRef = useRef(null);
  const healthRef = useRef(null);
  const medicineRef = useRef(null);
  const chatRef = useRef(null);

  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // --- simple chat state
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I’m GarvanGPT. Ask me anything about medicines or your health." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    try {
      const data = await askGarvan(text);
      const answer = data?.answer ?? "Sorry — no answer returned.";
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
      setTimeout(() => scrollTo(chatRef), 50);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Something went wrong: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const navItems = useMemo(
    () => [
      { label: "Health A–Z", ref: healthRef },
      { label: "Medicine A–Z", ref: medicineRef },
      { label: "Who We Are", ref: whoRef },
      { label: "What We Do", ref: whatRef },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => scrollTo(heroRef)}
          >
            <AvatarBubble />
            <div>
              <div className="font-semibold leading-tight">Almost Human</div>
              <div className="text-sm text-slate-500">
                AI for safe healthcare education
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            {navItems.map((n) => (
              <button
                key={n.label}
                onClick={() => scrollTo(n.ref)}
                className="text-slate-700 hover:text-slate-900"
              >
                {n.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => scrollTo(chatRef)}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-black"
          >
            Talk to Garvan
          </button>
        </div>

        {/* Support bar under main nav */}
        <SupportBar />
      </header>

      {/* Hero */}
      <section ref={heroRef} className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-xs tracking-widest text-slate-500 font-semibold">
              AI FOR SAFE HEALTHCARE EDUCATION
            </div>

            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
              Talk to Garvan
              <br />
              <span className="text-slate-500">your virtual pharmacist</span>
            </h1>

            <p className="mt-4 text-slate-600 max-w-2xl">
              Ask anything about your health or medicines. This prototype is for
              education only and doesn’t replace your own doctor, pharmacist, or
              emergency care.
            </p>

            <div className="mt-6 flex items-center gap-4">
              <AvatarBubble />
              <div>
                <div className="font-semibold">GarvanGPT, your virtual pharmacist</div>
                <div className="text-sm text-slate-500">
                  Trained on years of pharmacy experience to explain complex topics clearly.
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Redefining patient experience", "Safety and trust first", "Pharmacist review"].map(
                (t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full border border-slate-200 text-xs bg-slate-50"
                  >
                    {t}
                  </span>
                )
              )}
            </div>

            {/* Chat block */}
            <div
              ref={chatRef}
              className="mt-8 bg-white rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Ask Garvan anything</div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100">Text</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100">Voice</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100">
                    Education only
                  </span>
                </div>
              </div>

              <div className="h-64 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "ml-auto bg-indigo-600 text-white"
                        : "mr-auto bg-white border border-slate-200"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {loading && (
                  <div className="mr-auto bg-white border border-slate-200 p-3 rounded-xl text-sm">
                    Thinking…
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your question…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend()}
                />
                <button
                  onClick={onSend}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => scrollTo(whoRef)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Learn about Almost Human
              </button>
              <button
                onClick={() => scrollTo(healthRef)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50"
              >
                Browse Health A–Z
              </button>
            </div>
          </div>

          {/* Right column left intentionally open now */}
          <div className="md:col-span-1" />
        </div>
      </section>

      {/* Who We Are */}
      <section ref={whoRef} className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-3">Who We Are</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-700">
          Almost Human is an AI healthcare project founded by a pharmacist with 20+ years
          of experience in community pharmacy. We’re building tools that make trustworthy
          medicine information easier to access — starting with a virtual pharmacist that
          speaks like a real person, not a leaflet.
        </div>
      </section>

      {/* What We Do */}
      <section ref={whatRef} className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-3">What We Do</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Answer real-world medicine and health questions clearly and safely.</li>
            <li>Read answers aloud using a warm voice with disclaimers.</li>
            <li>Grow a pharmacist-written knowledge base over time.</li>
            <li>Keep safety, trust, and pharmacist oversight first.</li>
          </ul>
        </div>
      </section>

      {/* Health A-Z */}
      <section ref={healthRef} className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-3">Health A–Z</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-600">
          Coming soon. This section will contain pharmacist-written health explainers and safety notes.
        </div>
      </section>

      {/* Medicine A-Z */}
      <section ref={medicineRef} className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-3">Medicine A–Z</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-600">
          Coming soon. This section will contain pharmacist-written medicine explainers and safety notes.
        </div>
      </section>

      <footer className="py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Almost Human
      </footer>
    </div>
  );
}
