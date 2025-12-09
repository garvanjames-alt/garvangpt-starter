import React from "react";

/**
 * SupportBar
 * Restored lightweight support banner.
 * Safe, standalone, no dependencies.
 */
export default function SupportBar({
  stripeUrl = "https://buy.stripe.com/",
  paypalUrl = "https://www.paypal.com/",
  message = "Support Almost Human — Help fund pharmacist‑led AI healthcare tools.",
}) {
  return (
    <div className="w-full bg-white border-b border-slate-200">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm sm:text-base text-slate-700 flex items-center gap-2">
          <span className="text-green-600 text-lg">💚</span>
          <span>{message}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={stripeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition"
          >
            Support via Stripe
          </a>
          <a
            href={paypalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-800 text-sm font-semibold shadow-sm hover:bg-slate-50 transition"
          >
            Support via PayPal
          </a>
        </div>
      </div>
    </div>
  );
}
