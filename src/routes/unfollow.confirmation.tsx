import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Info } from "lucide-react";

export const Route = createFileRoute("/unfollow/confirmation")({
  head: () => ({
    meta: [
      { title: "Stop following strategy? — Batman" },
      { name: "description", content: "Confirm stopping your strategy following." },
    ],
  }),
  component: ConfirmationModal,
});

function ConfirmationModal() {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-8">
        <div className="w-12 h-12 rounded-full bg-[#EEF4FF] flex items-center justify-center mb-6">
          <AlertTriangle className="w-6 h-6 text-[#2563EB]" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">Stop following this strategy?</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Your account will stop following this strategy. Any open positions will be closed at market price,
          and any applicable strategy fee will be settled.
        </p>

        <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-[#EEF4FF] text-[#2563EB] font-semibold text-xs flex items-center justify-center shrink-0">
            AK
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900">Consistent Strategy</p>
            <p className="text-xs text-gray-500">Account #123456 • Managed by Alex K.</p>
          </div>
        </div>

        <div className="bg-[#EEF4FF] rounded-xl p-4 flex items-start gap-3 mb-8">
          <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <p className="text-sm text-[#2563EB] leading-relaxed">
            After this is complete, the account can be used to follow another strategy.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/dashboard/portfolio"
            className="border border-gray-200 text-[#2563EB] font-semibold py-3.5 rounded-xl text-center hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <Link
            to="/unfollow/loading"
            className="bg-[#2563EB] text-white font-semibold py-3.5 rounded-xl text-center hover:bg-[#1d4ed8] transition-colors"
          >
            Stop Following
          </Link>
        </div>
      </div>
    </div>
  );
}
