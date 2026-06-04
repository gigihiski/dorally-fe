import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/unfollow/failed")({
  head: () => ({
    meta: [
      { title: "Couldn't stop following — Batman" },
      { name: "description", content: "We couldn't stop following the strategy. Please try again." },
    ],
  }),
  component: FailedModal,
});

function FailedModal() {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-8">
        <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-6">
          <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
        </div>

        <h2 className="text-2xl font-bold text-[#0F1B3D] mb-3">We couldn't stop following yet</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Some open positions could not be closed. Please try again or contact support if this continues.
        </p>

        <div className="bg-[#FEF9C3] border border-[#FDE68A] rounded-xl p-5 mb-8">
          <p className="text-sm text-[#92400E] leading-relaxed">
            Your account is still following this strategy. No changes have been made to your account status.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/dashboard/portfolio"
            className="border border-[#2563EB]/40 text-[#2563EB] font-semibold py-3.5 rounded-xl text-center hover:bg-[#EEF4FF] transition-colors"
          >
            Cancel
          </Link>
          <Link
            to="/unfollow/loading"
            className="bg-[#2563EB] text-white font-semibold py-3.5 rounded-xl text-center hover:bg-[#1d4ed8] transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}
