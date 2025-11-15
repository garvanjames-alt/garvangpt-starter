import React from "react";
import VoiceChat from "./VoiceChat";

function App() {
  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col">
      {/* Top navigation */}
      <header className="border-b border-white/10 bg-black/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold text-xl">
              AH
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-lg tracking-tight">Almost Human</span>
              <span className="text-xs text-gray-400">AI for safe healthcare education</span>
            </div>
          </div>

          {/* Simple nav links (placeholders for now) */}
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-300">
            <button className="hover:text-white transition">Health A–Z</button>
            <button className="hover:text-white transition">Medicine A–Z</button>
            <button className="hover:text-white transition">Who We Are</button>
            <button className="hover:text-white transition">What We Do</button>
          </nav>
        </div>
      </header>

{/* Support Section */}
<section class="w-full flex flex-col items-center mt-10 mb-10">
  <h2 class="text-2xl font-semibold text-gray-900 mb-4">Support Almost Human</h2>
  <p class="text-gray-600 mb-6 text-center max-w-xl">
    Help support the development of pharmacist-led AI healthcare tools.
  </p>
  <div class="flex gap-4">
    <a href="https://paypal.me/AlmostHumanLabs" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow">
      Support via PayPal
    </a>
  </div>
</section>

      {/* Main content */}
      <main className="flex-1">
        {/* Hero section */}
        <section className="border-b border-white/10 bg-gradient-to-b from-black to-[#050608]">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
                Building AI that advances
                <span className="block text-emerald-400">healthcare access</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-gray-300 max-w-xl">
                Improving understanding of medicines and everyday health through
                safe, pharmacist-led AI education.
              </p>
            </div>

            {/* Avatar + bubble */}
            <div className="mt-8 sm:mt-10 grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 sm:gap-8 items-center">
              {/* Simple avatar card placeholder */}
              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-6 sm:px-8 sm:py-8 flex flex-col items-center sm:items-start">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center mb-4">
                  <span className="text-4xl" role="img" aria-label="Pharmacist avatar">
                    👨‍⚕️
                  </span>
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-medium">GarvanGPT, your virtual pharmacist</p>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1">
                    Trained on years of pharmacy experience to explain complex
                    topics in plain language.
                  </p>
                </div>
              </div>

              {/* Speech bubble */}
              <div className="bg-emerald-500 rounded-2xl px-6 py-6 sm:px-8 sm:py-8 text-black shadow-lg">
                <p className="text-lg sm:text-xl font-semibold leading-snug">
                  Ask me anything about your health or medicines.
                </p>
                <p className="mt-3 text-sm font-medium text-emerald-950/90">
                  This prototype is for education only and doesn&apos;t replace
                  your own doctor, pharmacist or emergency care.
                </p>
              </div>
            </div>

            {/* Tagline row + CTAs */}
            <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300 max-w-xl">
                <div>
                  <p className="font-medium text-white">Redefining patient experience</p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-400">
                    Turning complex health information into clear conversations.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-white">Safety and trust first</p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-400">
                    Guardrails, pharmacist review and careful disclaimers built
                    in from day one.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-4 sm:px-5 py-2 rounded-full bg-emerald-500 text-black font-semibold text-sm shadow hover:bg-emerald-400 transition">
                  Health A–Z
                </button>
                <button className="px-4 sm:px-5 py-2 rounded-full border border-white/20 text-sm font-semibold hover:border-white/50 transition">
                  Medicine A–Z
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Who we are / What we do section */}
        <section className="border-b border-white/10 bg-[#06070a]">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12 grid sm:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Who We Are</h2>
              <p className="mt-3 text-sm sm:text-base text-gray-300">
                Almost Human is an AI healthcare project founded by a pharmacist
                with 20+ years of experience running a community pharmacy.
                We&apos;re building tools that make trustworthy medicine
                information easier to access.
              </p>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">What We Do</h2>
              <ul className="mt-3 space-y-2 text-sm sm:text-base text-gray-300 list-disc list-inside">
                <li>Safe AI health and medicine education</li>
                <li>Conversational avatars for patients and professionals</li>
                <li>AI safety and compliance in healthcare settings</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Prototype section with your existing chat UI */}
        <section className="bg-black/95">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">
                  Talk to the prototype
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-400 max-w-xl">
                  Early beta demo running on a private backend. Answers may not
                  always be correct. Always check with your own healthcare
                  professional before changing medicines or treatments.
                </p>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Backend at <span className="font-mono">3001</span>; Frontend at
                <span className="font-mono"> 5173</span>. API base via Vite
                proxy or Render static site.
              </p>
            </div>

            <div className="border border-white/10 rounded-2xl bg-[#050608] p-4 sm:p-5">
              <VoiceChat />
            </div>
          </div>
        </section>
      </main>

      {/* Tiny footer */}
      <footer className="border-t border-white/10 bg-black text-[11px] sm:text-xs text-gray-500">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p>
            © {new Date().getFullYear()} Almost Human. Educational use only —
            not a substitute for professional medical advice.
          </p>
          <p className="text-gray-600">
            Prototype codename: GarvanGPT · v0.8
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
