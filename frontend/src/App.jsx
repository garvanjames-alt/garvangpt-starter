import React, { useEffect, useMemo, useState } from "react";

/**
 * Almost Human — GarvanGPT
 * Homepage layout update per Garvan's frontpage.pdf sketch.
 *
 * Notes:
 * - This is a full-file replacement for frontend/src/App.jsx.
 * - It preserves your existing prototype hook area, but reorganizes the page.
 * - Replace placeholder components (AvatarPanel, TalkToGarvanPanel, WhoWeArePanel, WhatWeDoPanel)
 *   with your real ones whenever ready.
 *
 * If your project uses a router and this file is not App.jsx, move the HomePage
 * component into your Home route.
 */

// ---------- Small UI helpers ----------
const Container = ({ children, className = "" }) => (
  <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${className}`}>{children}</div>
);

const Pill = ({ children }) => (
  <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
    {children}
  </span>
);

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <div className="mb-5">
    {eyebrow && (
      <div className="mb-2 text-xs font-semibold tracking-wider text-slate-500">
        {eyebrow}
      </div>
    )}
    <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h2>
    {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
  </div>
);

// ---------- Placeholder panels (swap later) ----------
const AvatarPanel = () => (
  <div className="flex items-center gap-4">
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100" />
    <div>
      <div className="text-lg font-semibold text-slate-900">GarvanGPT, your virtual pharmacist</div>
      <div className="text-sm text-slate-600">
        Trained on years of pharmacy experience to explain complex topics in plain language.
      </div>
    </div>
  </div>
);

/**
 * TalkToGarvanPanel
 * - This is where your existing chat + mic + ElevenLabs TTS UI should live.
 * - For now it's a clean placeholder box.
 */
const TalkToGarvanPanel = () => (
  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
    <div className="mb-3 flex items-center justify-between">
      <div className="text-base font-semibold text-slate-900">Ask Garvan anything</div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Pill>Text</Pill>
        <Pill>Voice</Pill>
        <Pill>Education only</Pill>
      </div>
    </div>

    {/* Replace this block with your real prototype component */}
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      Prototype goes here.
      <ul className="mt-2 list-disc pl-5">
        <li>Chat input + send</li>
        <li>Mic button for speech-to-text</li>
        <li>ElevenLabs (Aussie voice) playback of answers</li>
      </ul>
    </div>
  </div>
);

const SupportPanel = () => (
  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur md:p-5">
    <div className="mb-2 text-sm font-semibold text-slate-900">💚 Support Almost Human</div>
    <div className="text-sm text-slate-600">
      Help support the development of pharmacist-led AI healthcare tools.
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
        Support via Stripe
      </button>
      <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50">
        Support via PayPal
      </button>
    </div>
  </div>
);

const WhoWeArePanel = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <SectionTitle title="Who We Are" />

    {/* Video placeholder */}
    <div className="mb-4 aspect-video w-full overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50" />

    <p className="text-sm leading-relaxed text-slate-700">
      Almost Human is an AI healthcare project founded by a pharmacist with 20+ years of experience
      in community pharmacy. We’re building tools that make trustworthy medicine information easier
      to access — starting with a virtual pharmacist that speaks like a real person, not a leaflet.
    </p>
  </div>
);

const WhatWeDoPanel = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <SectionTitle title="What We Do" />
    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
      <li>Answer real-world medicine and health questions clearly and safely.</li>
      <li>Read answers aloud using a warm Australian voice with disclaimers.</li>
      <li>Grow a pharmacist-written knowledge base over time.</li>
      <li>Keep safety, trust, and pharmacist oversight first.</li>
    </ul>
  </div>
);

const ComingSoonBox = ({ children }) => (
  <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
    {children}
  </div>
);

// ---------- Main HomePage ----------
const HomePage = () => {
  // Optional: smooth scroll for anchor links
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top nav (keep simple and consistent with your current links) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <Container className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200" />
            <div>
              <div className="text-sm font-semibold">Almost Human</div>
              <div className="text-xs text-slate-500">AI for safe healthcare education</div>
            </div>
          </div>
          <nav className="hidden items-center gap-4 text-sm text-slate-700 md:flex">
            <a href="#health-a-z" className="hover:text-slate-900">Health A–Z</a>
            <a href="#medicine-a-z" className="hover:text-slate-900">Medicine A–Z</a>
            <a href="#who-we-are" className="hover:text-slate-900">Who We Are</a>
            <a href="#what-we-do" className="hover:text-slate-900">What We Do</a>
            <a href="#talk-to-garvan" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
              Talk to Garvan
            </a>
          </nav>
        </Container>
      </header>

      {/* HERO: Talk to Garvan */}
      <section id="talk-to-garvan" className="relative overflow-hidden py-10 md:py-14">
        <Container>
          <div className="grid gap-5 md:grid-cols-12 md:gap-6">
            {/* Left hero copy + avatar + talk box */}
            <div className="md:col-span-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-3 text-xs font-semibold tracking-wider text-slate-500">AI FOR SAFE HEALTHCARE EDUCATION</div>
                <h1 className="text-3xl font-bold leading-tight md:text-5xl">
                  Talk to Garvan
                  <span className="block text-slate-600">your virtual pharmacist</span>
                </h1>
                <p className="mt-3 max-w-2xl text-base text-slate-700 md:text-lg">
                  Ask anything about your health or medicines. This prototype is for education only and
                  doesn’t replace your own doctor, pharmacist, or emergency care.
                </p>

                <div className="mt-5">
                  <AvatarPanel />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Pill>Redefining patient experience</Pill>
                  <Pill>Safety and trust first</Pill>
                  <Pill>Pharmacist review</Pill>
                </div>

                <div className="mt-5">
                  <TalkToGarvanPanel />
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <a
                    href="#who-we-are"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                  >
                    Learn about Almost Human
                  </a>
                  <a
                    href="#health-a-z"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                  >
                    Browse Health A–Z
                  </a>
                </div>
              </div>
            </div>

            {/* Right hero support */}
            <div className="md:col-span-4">
              <SupportPanel />
            </div>
          </div>
        </Container>
      </section>

      {/* WHO WE ARE + WHAT WE DO two-column band */}
      <section className="py-8 md:py-10">
        <Container>
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <div id="who-we-are">
              <WhoWeArePanel />
            </div>
            <div id="what-we-do">
              <WhatWeDoPanel />
            </div>
          </div>
        </Container>
      </section>

      {/* Health / Medicine A–Z */}
      <section className="py-8 md:py-10">
        <Container>
          <div id="health-a-z" className="mb-8">
            <SectionTitle title="Health A–Z" />
            <ComingSoonBox>
              Coming soon. This section will contain pharmacist‑written health explainers and safety notes.
            </ComingSoonBox>
          </div>

          <div id="medicine-a-z">
            <SectionTitle title="Medicine A–Z" />
            <ComingSoonBox>
              Coming soon. This section will contain pharmacist‑written medicine explainers and safety notes.
            </ComingSoonBox>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <Container className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="text-sm text-slate-600">© {new Date().getFullYear()} Almost Human Labs</div>
          <div className="text-xs text-slate-500">
            Educational use only. Not medical advice. If you’re worried about symptoms, seek urgent care.
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default HomePage;
