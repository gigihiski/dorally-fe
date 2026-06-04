import { Link } from "@tanstack/react-router";
import { ChevronLeft, Home, HelpCircle, Check } from "lucide-react";
import type { MoneyManager } from "@/data/moneyManagers";

type StrategyCardData = MoneyManager & { avatar?: string };

const stepLabels = ["Account", "Funds", "Risk", "Review"];

export function FollowHeader({ strategyName }: { strategyName: string }) {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <Link to="/dashboard/strategies" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link to="/dashboard/strategies" className="text-gray-500 hover:text-gray-700">
            <Home className="w-5 h-5" />
          </Link>
          <span className="text-gray-400">Strategy</span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-400">{strategyName}</span>
          <span className="text-gray-300">›</span>
          <span className="text-[#2563EB] font-medium">Follow</span>
        </div>
        <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
          <HelpCircle className="w-5 h-5" />
          Need help?
        </button>
      </div>
    </header>
  );
}

export function StepsBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {stepLabels.map((label, i) => {
        const num = i + 1;
        const completed = currentStep > num;
        const active = currentStep === num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-2 w-24">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                  completed
                    ? "bg-[#2563EB] border-[#2563EB] text-white"
                    : active
                    ? "border-[#2563EB] text-[#2563EB] bg-white"
                    : "border-gray-200 text-gray-400 bg-white"
                }`}
              >
                {completed ? <Check className="w-5 h-5" /> : num}
              </div>
              <span
                className={`text-sm ${
                  active ? "text-[#2563EB] font-semibold" : completed ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`h-0.5 w-20 -mt-7 ${completed ? "bg-[#2563EB]" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StrategyCard({ mm }: { mm: StrategyCardData }) {
  return (
    <div className="border border-gray-200 rounded-2xl p-6 flex items-center justify-between mb-8">
      <div className="flex items-center gap-5">
        {mm.avatar ? (
          <img
            src={mm.avatar}
            alt={mm.name}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: mm.avatarBg }}
          >
            {mm.initials}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900">{mm.name}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] bg-[#EEF2FF] px-2 py-0.5 rounded">
              STRATEGY PROVIDER
            </span>
          </div>
          <p className="text-gray-500 max-w-xl text-sm">{mm.description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#2563EB]">👥</div>
          <div>
            <p className="font-bold text-gray-900">{mm.followers.toLocaleString()}</p>
            <p className="text-xs text-gray-500 tracking-wider">FOLLOWERS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#2563EB]">📊</div>
          <div>
            <p className="font-bold text-gray-900">{mm.averageGrowth}%</p>
            <p className="text-xs text-gray-500 tracking-wider">AVERAGE GROWTH</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FollowFooter({
  backTo,
  backLabel = "Back",
  primary,
  onPrimary,
  primaryDisabled = false,
}: {
  backTo?: string;
  backLabel?: string;
  primary: React.ReactNode;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
}) {
  return (
    <div className="flex gap-4 mt-10">
      {backTo ? (
        <Link
          to={backTo as any}
          className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
        >
          ← {backLabel}
        </Link>
      ) : (
        <button
          onClick={() => window.history.back()}
          className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← {backLabel}
        </button>
      )}
      <button
        onClick={onPrimary}
        disabled={primaryDisabled}
        className="flex-1 py-4 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#2563EB" }}
      >
        {primary}
      </button>
    </div>
  );
}
