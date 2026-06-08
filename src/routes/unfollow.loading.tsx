import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Check, Clock, X } from "lucide-react";

export const Route = createFileRoute("/unfollow/loading")({
  head: () => ({
    meta: [
      { title: "Stopping strategy following — Batman" },
      { name: "description", content: "Closing open positions and updating your account." },
    ],
  }),
  component: LoadingModal,
});

type StepState = "done" | "active" | "pending";

const steps: { label: string; state: StepState }[] = [
  { label: "Closing open positions", state: "done" },
  { label: "Calculating final account value", state: "active" },
  { label: "Settling any applicable strategy fee", state: "pending" },
  { label: "Updating account status", state: "pending" },
];

function LoadingModal() {
  const navigate = useNavigate();
  // Auto-advance from "Stopping…" to the "Strategy following stopped" success popup.
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/unfollow/success" }), 2400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-8 relative">
        <Link
          to="/dashboard/portfolio"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Link>

        <div className="flex justify-center mb-6 pt-2">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle
                cx="40" cy="40" r="36"
                fill="none" stroke="#2563EB" strokeWidth="3"
                strokeDasharray={`${0.35 * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                strokeLinecap="round"
              />
            </svg>
            <Clock className="w-7 h-7 text-[#2563EB] absolute inset-0 m-auto" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[#0F1B3D] text-center mb-3">Stopping strategy following</h2>
        <p className="text-sm text-gray-500 text-center leading-relaxed mb-8 max-w-xs mx-auto">
          We're closing open positions and updating your account status. This may take a moment.
        </p>

        <ol className="space-y-5 px-2">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-start gap-4 relative">
              {i < steps.length - 1 && (
                <span className="absolute left-3 top-7 w-px h-7 bg-gray-200" />
              )}
              <StepIcon state={s.state} />
              <span
                className={`text-base ${
                  s.state === "done"
                    ? "text-gray-900 font-semibold"
                    : s.state === "active"
                      ? "text-[#0F1B3D] font-bold"
                      : "text-gray-400 font-medium"
                }`}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="w-6 h-6 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin shrink-0" />
    );
  }
  return <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />;
}
