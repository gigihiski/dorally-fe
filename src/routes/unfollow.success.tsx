import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export const Route = createFileRoute("/unfollow/success")({
  head: () => ({
    meta: [
      { title: "Strategy following stopped — Batman" },
      { name: "description", content: "Your account is no longer following this strategy." },
    ],
  }),
  component: SuccessModal,
});

const rows: { label: string; value: string; tone?: "green" | "default" }[] = [
  { label: "Strategy", value: "Consistent Strategy" },
  { label: "Account", value: "Account #123456" },
  { label: "Open positions", value: "Closed", tone: "green" },
  { label: "Strategy fee", value: "Applied" },
  { label: "Account status", value: "Available", tone: "green" },
];

function SuccessModal() {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-8">
        <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-6">
          <Check className="w-6 h-6 text-[#16A34A]" strokeWidth={3} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">Strategy following stopped</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Your account is no longer following this strategy. It is now available to follow another strategy.
        </p>

        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 mb-8">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500">{r.label}</span>
              <span
                className={`text-sm font-bold ${
                  r.tone === "green" ? "text-[#16A34A]" : "text-gray-900"
                }`}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/dashboard/portfolio"
            className="border border-[#2563EB] text-[#2563EB] font-semibold py-3.5 rounded-xl text-center hover:bg-[#EEF4FF] transition-colors"
          >
            View Portfolio
          </Link>
          <Link
            to="/dashboard/strategies"
            className="bg-[#2563EB] text-white font-semibold py-3.5 rounded-xl text-center hover:bg-[#1d4ed8] transition-colors"
          >
            Explore Strategies
          </Link>
        </div>
      </div>
    </div>
  );
}
