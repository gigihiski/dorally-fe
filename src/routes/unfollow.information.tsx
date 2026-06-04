import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Info } from "lucide-react";

export const Route = createFileRoute("/unfollow/information")({
  head: () => ({
    meta: [
      { title: "Strategy following stopped — Batman" },
      { name: "description", content: "Fee settlement is still being processed for this strategy." },
    ],
  }),
  component: InformationModal,
});

const rows: { label: string; value: string; tone?: "green" | "muted" | "default" }[] = [
  { label: "Strategy", value: "Consistent Strategy" },
  { label: "Account", value: "Account #123456" },
  { label: "Open positions", value: "Closed", tone: "green" },
  { label: "Strategy fee", value: "Settlement pending", tone: "muted" },
  { label: "Account status", value: "Updating…", tone: "muted" },
];

function InformationModal() {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-8">
        <div className="w-12 h-12 rounded-full bg-[#EEF4FF] flex items-center justify-center mb-6">
          <Clock className="w-6 h-6 text-[#2563EB]" />
        </div>

        <h2 className="text-2xl font-bold text-[#0F1B3D] mb-3">Strategy following was stopped</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Your account has stopped following this strategy, but fee settlement is still being processed.
        </p>

        <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`flex items-center justify-between px-5 py-4 ${
                i % 2 === 1 ? "bg-gray-50" : "bg-white"
              }`}
            >
              <span className="text-sm text-gray-500">{r.label}</span>
              <span
                className={`text-sm font-bold ${
                  r.tone === "green"
                    ? "text-[#16A34A]"
                    : r.tone === "muted"
                      ? "text-gray-500"
                      : "text-[#0F1B3D]"
                }`}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-[#EEF4FF] rounded-xl p-4 flex items-start gap-3 mb-8">
          <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <p className="text-sm text-[#2563EB] leading-relaxed">
            Your account status will update once settlement is complete. You will be notified when it is ready.
          </p>
        </div>

        <Link
          to="/dashboard/portfolio"
          className="block w-full bg-[#2563EB] text-white font-semibold py-3.5 rounded-xl text-center hover:bg-[#1d4ed8] transition-colors"
        >
          View Portfolio
        </Link>
      </div>
    </div>
  );
}
