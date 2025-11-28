// frontend/src/components/SupportBar.jsx

export default function SupportBar() {
    return (
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-sm text-slate-700">
            💚 <span className="font-medium">Support Almost Human</span>{" "}
            <span className="text-slate-500">
              Help fund pharmacist-led AI healthcare tools.
            </span>
          </div>
  
          <div className="flex gap-2">
            <a
              href="#"
              className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Support via Stripe
            </a>
            <a
              href="#"
              className="px-3 py-1.5 rounded-md border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Support via PayPal
            </a>
          </div>
        </div>
      </div>
    );
  }
  