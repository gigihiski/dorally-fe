import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, BookmarkCheck, Info, PlayCircle, DollarSign, ShieldCheck } from "lucide-react";
import { getMoneyManagerByUsername, type MoneyManager } from "@/services/money-managers";
import { saveMoneyManager, unsaveMoneyManager } from "@/services/saved-money-managers";
import { toggleFollow } from "@/services/follows";
import { useFollowedStrategies } from "@/lib/useFollowedStrategies";
import { ApiError } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DashboardHeader } from "./dashboard";

export const Route = createFileRoute("/strategies/$username")({
  component: StrategyDetailPage,
  head: () => ({ meta: [{ title: "Strategy Detail — Batman" }] }),
});

type Range = "1M" | "3M" | "6M" | "All";

const AVATAR_PALETTE = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#0EA5E9"];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "MM";
}

function getAvatarBg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function StrategyDetailPage() {
  const { username } = Route.useParams();
  const [range, setRange] = useState<Range>("1M");

  const { data: mm, isLoading, isError, error } = useQuery({
    queryKey: ["money-manager", username],
    queryFn: () => getMoneyManagerByUsername(username),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <DashboardHeader />
        <div className="flex justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" />
        </div>
      </div>
    );
  }

  if (isError || !mm) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <DashboardHeader />
        <main className="max-w-md mx-auto px-6 py-20">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <p className="font-semibold text-gray-900 mb-1">
              {isNotFound ? "Strategy not found" : "Failed to load strategy"}
            </p>
            <p className="text-sm text-gray-500 mb-5">
              {isNotFound
                ? `No money manager with the identifier "${username}".`
                : error instanceof Error
                  ? error.message
                  : "Unknown error."}
            </p>
            <Link
              to="/dashboard/strategies"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Strategies
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return <StrategyDetailView mm={mm} range={range} setRange={setRange} />;
}

const DASH = "—";

function formatFeeTiming(timing?: string): string {
  if (!timing) return DASH;
  // BE values: daily | weekly | bi_weekly | monthly
  const map: Record<string, string> = {
    daily: "Settled daily",
    weekly: "Settled weekly",
    bi_weekly: "Settled bi-weekly",
    monthly: "Settled monthly",
  };
  return map[timing] ?? timing;
}

function formatChargeOn(charge?: string): string {
  if (!charge) return DASH;
  // BE values seen so far: "profit_hwm", "profit_period"
  const map: Record<string, string> = {
    profit_hwm: "New profit only",
    profit_period: "New profit per period",
  };
  return map[charge] ?? charge.replace(/_/g, " ");
}

function StrategyDetailView({
  mm,
  range,
  setRange,
}: {
  mm: MoneyManager;
  range: Range;
  setRange: (r: Range) => void;
}) {
  const usernameOrId = mm.username || mm.id;
  const displayName = mm.name || usernameOrId;
  const initials = getInitials(displayName);
  const avatarBg = getAvatarBg(usernameOrId);
  const queryClient = useQueryClient();

  const broker = "PrimeCodex";
  const strategyType = "Strategy";

  // Profile values — display em-dash when API doesn't provide them.
  const minStart = mm.profile?.minimum_start;
  const minStartDisplay = typeof minStart === "number" ? `$${minStart}` : DASH;
  const profitSharePct = mm.profile?.profit_sharing_fee_pct;
  const profitShareDisplay =
    typeof profitSharePct === "number" ? `${profitSharePct}%` : DASH;
  const feeTimingDisplay = formatFeeTiming(mm.profile?.fee_timing);
  const chargeOnDisplay = formatChargeOn(mm.profile?.charge_on);
  const followersDisplay =
    typeof mm.followers_count === "number" ? mm.followers_count.toLocaleString() : DASH;

  // Performance — BE sends % values as numbers; biggest_drop_pct is a positive magnitude.
  const perf = mm.performance;
  const formatPct = (n?: number, withSign = false): string => {
    if (typeof n !== "number") return DASH;
    const rounded = Number(n.toFixed(1));
    return withSign && rounded > 0 ? `+${rounded}%` : `${rounded}%`;
  };
  const thisMonthDisplay = formatPct(perf?.this_month_return_pct, true);
  const thisMonthClass =
    typeof perf?.this_month_return_pct === "number"
      ? perf.this_month_return_pct >= 0
        ? "text-[#10B981]"
        : "text-[#EF4444]"
      : "text-gray-900";
  const totalReturnDisplay = formatPct(perf?.total_return_pct, true);
  const totalReturnClass =
    typeof perf?.total_return_pct === "number"
      ? perf.total_return_pct >= 0
        ? "text-[#10B981]"
        : "text-[#EF4444]"
      : "text-gray-900";
  const biggestDropDisplay =
    typeof perf?.biggest_drop_pct === "number"
      ? `-${Number(perf.biggest_drop_pct.toFixed(1))}%`
      : DASH;
  const biggestDropClass =
    typeof perf?.biggest_drop_pct === "number" ? "text-[#EF4444]" : "text-gray-900";
  const winningRateDisplay = formatPct(perf?.winning_rate_pct);
  const movementLevel =
    typeof perf?.biggest_drop_pct === "number"
      ? perf.biggest_drop_pct < 2
        ? "Lower"
        : perf.biggest_drop_pct < 5
          ? "Medium"
          : "Higher"
      : DASH;
  const movementClass =
    movementLevel === "Lower"
      ? "text-[#10B981]"
      : movementLevel === "Medium"
        ? "text-[#D97706]"
        : movementLevel === "Higher"
          ? "text-[#EF4444]"
          : "text-gray-900";

  const mmAccountId = mm.primary_account?.id;
  const savedMutation = useMutation({
    mutationFn: async (nextSaved: boolean) => {
      if (!mmAccountId) throw new Error("Money manager has no primary account");
      if (nextSaved) await saveMoneyManager(mmAccountId);
      else await unsaveMoneyManager(mmAccountId);
      return nextSaved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["money-manager", mm.username || mm.id] });
      queryClient.invalidateQueries({ queryKey: ["saved-money-managers"] });
    },
  });
  const isSaved = mm.is_saved === true;
  const canSave = Boolean(mmAccountId);

  // Is the user already following this strategy? If so, swap Follow -> Unfollow.
  const { strategies: followedStrategies } = useFollowedStrategies();
  const followedEntry = followedStrategies.find(
    (s) => s.id === usernameOrId || s.moneyManagerId === mm.id,
  );
  const isFollowing = Boolean(followedEntry);
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!followedEntry) return;
      await toggleFollow({
        money_manager_id: followedEntry.moneyManagerId,
        investor_account_id: followedEntry.accountId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followees-me", "active"] });
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link
          to="/dashboard/strategies"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Strategies
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                {mm.avatar ? (
                  <img
                    src={mm.avatar}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full font-bold flex items-center justify-center text-lg shrink-0 text-white"
                    style={{ background: avatarBg }}
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                  <p className="text-sm text-gray-500">
                    Managed by{" "}
                    <span className="text-gray-900 font-semibold">
                      {mm.username ? `@${mm.username}` : placeholder}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge color="blue">{strategyType.toUpperCase()}</Badge>
                    <Badge color="green">START FROM {minStartDisplay}</Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 italic">No description available.</p>
            </section>

            {/* Key Stats */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold tracking-wider text-gray-700">KEY STATS</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">
                    A quick summary of this strategy's main performance metrics.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard
                  label="This Month Return"
                  value={thisMonthDisplay}
                  valueClass={thisMonthClass}
                  hint="The percentage return generated by this strategy this month."
                />
                <StatCard
                  label="Total Return"
                  value={totalReturnDisplay}
                  valueClass={totalReturnClass}
                  hint="The total return generated since the strategy started."
                />
                <StatCard
                  label="Biggest Drop"
                  value={biggestDropDisplay}
                  valueClass={biggestDropClass}
                  hint="The largest decline from the strategy's highest point."
                />
                <StatCard
                  label="Followers"
                  value={followersDisplay}
                  valueClass="text-gray-900"
                  hint="The number of investors currently following this strategy."
                />
                <StatCard
                  label="Winning Rate"
                  value={winningRateDisplay}
                  valueClass="text-gray-900"
                  hint="The percentage of trades that closed in profit."
                />
              </div>
            </section>

            {/* Performance chart */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Performance</h3>
                  <p className="text-xs text-gray-500">
                    {perf
                      ? "See how this strategy has performed over time."
                      : "Performance data is not yet available for this strategy."}
                  </p>
                </div>
                <div className="inline-flex bg-gray-100 rounded-md p-0.5">
                  {(["1M", "3M", "6M", "All"] as Range[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                        range === r ? "bg-[#2563EB] text-white" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <PerformanceChart range={range} />
              <p className="text-xs text-gray-400 mt-4">
                Past performance is for reference only and does not guarantee future results.
              </p>
            </section>

            {/* 3 info cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-xs font-bold tracking-wider text-gray-700 mb-3">
                  RISK & MOVEMENT
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Understand the movement and risk level.
                </p>
                <Row
                  label="Movement Level"
                  value={<span className={`font-semibold ${movementClass}`}>{movementLevel}</span>}
                  hint="Shows how much this strategy tends to move up and down."
                />
                <Row
                  label="Biggest Drop"
                  value={
                    <span className={`font-semibold ${biggestDropClass}`}>
                      {biggestDropDisplay}
                    </span>
                  }
                  hint="The largest recorded decline based on past performance."
                />
                <p className="text-[11px] text-gray-400 mt-4 italic">
                  Stats will appear once this strategy has trading history.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-xs font-bold tracking-wider text-gray-700 mb-3">HOW FEES WORK</p>
                <p className="text-xs text-gray-500 mb-4">
                  You only pay a fee when this strategy makes new profit for you.
                </p>
                <Row
                  label="Profit-sharing fee"
                  value={<span className="font-semibold text-gray-900">{profitShareDisplay}</span>}
                  hint="The percentage fee charged on new profits."
                />
                <Row
                  label="Fee timing"
                  value={<span className="font-semibold text-gray-900">{feeTimingDisplay}</span>}
                  hint="When the profit-sharing fee is calculated and charged."
                />
                <Row
                  label="Charged on"
                  value={<span className="font-semibold text-gray-900">{chargeOnDisplay}</span>}
                  hint="Fees apply only when your account reaches new profit."
                />
                <div className="mt-4 bg-[#F1F5F9] rounded-xl p-3">
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Example: If your account grows from $10 to $10.42, the fee applies only to the
                    $0.42 profit. If your account drops and later recovers, no fee is charged until
                    it reaches a new high.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-xs font-bold tracking-wider text-gray-700 mb-3">
                  INVESTMENT DETAILS
                </p>
                <Row
                  label="Broker"
                  value={<span className="font-semibold text-gray-900">{broker}</span>}
                  hint="The broker where this strategy is run."
                />
                <Row
                  label="Minimum start"
                  value={<span className="font-semibold text-gray-900">{minStartDisplay}</span>}
                  hint="The minimum amount needed to start following."
                />
                <Row
                  label="Control"
                  value={<span className="font-semibold text-[#2563EB]">Stop anytime</span>}
                  hint="You can stop following the strategy anytime."
                />
                <Row
                  label="Strategy type"
                  value={<span className="font-semibold text-gray-900">{strategyType}</span>}
                  hint="The category of strategy based on its style and goal."
                />
              </div>
            </section>

            <div className="bg-[#EEF4FF] rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                Following a strategy involves risk. Your balance can go up or down.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Ready to start?</h3>
              <div className="space-y-3 mb-5">
                <Row
                  className="text-sm"
                  label="Start from"
                  value={<span className="font-bold text-gray-900">{minStartDisplay}</span>}
                  hint="The minimum amount needed to follow this strategy."
                />
                <Row
                  className="text-sm"
                  label="Profit-sharing fee"
                  value={<span className="font-bold text-gray-900">{profitShareDisplay}</span>}
                  hint="The percentage fee charged only on new profits."
                />
                <Row
                  className="text-sm"
                  label="Fee timing"
                  value={<span className="font-bold text-gray-900">{feeTimingDisplay}</span>}
                  hint="When the profit-sharing fee is calculated and settled."
                />
                <Row
                  className="text-sm"
                  label="Control"
                  value={<span className="font-bold text-[#2563EB]">Stop anytime</span>}
                  hint="You can stop following this strategy at any time."
                />
              </div>
              {isFollowing ? (
                <button
                  type="button"
                  onClick={() => unfollowMutation.mutate()}
                  disabled={unfollowMutation.isPending}
                  className="w-full block text-center border-2 border-[#EF4444] text-[#EF4444] font-semibold py-3.5 rounded-xl hover:bg-[#FEF2F2] transition-colors mb-3 disabled:opacity-60"
                >
                  {unfollowMutation.isPending ? "Unfollowing…" : "Unfollow Strategy"}
                </button>
              ) : (
                <Link
                  to="/strategies/$strategyId/$step"
                  params={{ strategyId: usernameOrId, step: "step-1" }}
                  className="w-full block text-center bg-[#2563EB] text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity mb-3"
                >
                  Follow Strategy
                </Link>
              )}
              <button
                onClick={() => savedMutation.mutate(!isSaved)}
                disabled={!canSave || savedMutation.isPending}
                title={
                  canSave
                    ? undefined
                    : "This money manager has no primary account exposed for saving yet."
                }
                className={`w-full border-2 font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
                  isSaved
                    ? "border-[#10B981] text-[#10B981] hover:bg-[#ECFDF5]"
                    : "border-[#2563EB] text-[#2563EB] hover:bg-[#EEF4FF]"
                }`}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                {savedMutation.isPending
                  ? isSaved
                    ? "Removing..."
                    : "Saving..."
                  : isSaved
                    ? "Saved"
                    : "Save for Later"}
              </button>
              {savedMutation.isError && (
                <p className="text-xs text-red-500 text-center mt-2">
                  {savedMutation.error instanceof Error
                    ? savedMutation.error.message
                    : "Failed to update saved state."}
                </p>
              )}
              <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
                Following a strategy involves risk.
                <br />
                Your balance can go up or down.
              </p>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-1">New to strategy following?</h3>
              <p className="text-xs text-gray-500 mb-4">Learn the basics before you start.</p>
              <ul className="space-y-3">
                <LearnLink
                  icon={<PlayCircle className="w-5 h-5 text-[#2563EB]" />}
                  label="How following works"
                  slug="how-following-works"
                />
                <LearnLink
                  icon={<DollarSign className="w-5 h-5 text-[#2563EB]" />}
                  label="Fees explained"
                  slug="understanding-fees"
                />
                <LearnLink
                  icon={<ShieldCheck className="w-5 h-5 text-[#2563EB]" />}
                  label="Risk basics"
                  slug="risk-basics"
                />
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: "orange" | "blue" | "green";
  children: React.ReactNode;
}) {
  const map = {
    orange: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]",
    blue: "bg-[#EEF4FF] text-[#2563EB] border border-[#DBEAFE]",
    green: "bg-[#DCFCE7] text-[#059669] border border-[#BBF7D0]",
  } as const;
  return (
    <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded ${map[color]}`}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-1 mb-2">
        <p className="text-[10px] font-bold tracking-wider text-gray-700">{label.toUpperCase()}</p>
        {hint ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">{hint}</TooltipContent>
          </Tooltip>
        ) : (
          <Info className="w-3 h-3 text-gray-400" />
        )}
      </div>
      <p className={`text-2xl font-bold mb-1 ${valueClass}`}>{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  className,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-2 py-2 ${className ?? "text-[11px]"}`}>
      <span className="text-gray-500 inline-flex items-start gap-1 min-w-0 shrink">
        <span className="leading-snug">{label}</span>
        {hint ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-2.5 h-2.5 text-gray-400 flex-shrink-0 mt-0.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">{hint}</TooltipContent>
          </Tooltip>
        ) : (
          <Info className="w-2.5 h-2.5 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
      </span>
      <span className="text-right shrink-0 max-w-[60%] leading-snug">{value}</span>
    </div>
  );
}

function LearnLink({
  icon,
  label,
  slug,
}: {
  icon: React.ReactNode;
  label: string;
  slug: string;
}) {
  return (
    <li>
      <Link
        to="/dashboard/learn"
        search={{ guide: slug }}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 rounded-full bg-[#EEF4FF] flex items-center justify-center">
          {icon}
        </div>
        <span className="font-semibold text-[#2563EB] text-sm">{label}</span>
      </Link>
    </li>
  );
}

type ChartSeries = { points: number[]; labels: string[] };

const PERF_SERIES: Record<Range, ChartSeries> = {
  "1M": {
    points: [100, 100.4, 100.1, 100.7, 101.3, 101.0, 101.8, 102.4, 102.1, 102.9, 103.2, 103.6],
    labels: ["MAY 6", "MAY 13", "MAY 20", "MAY 27", "JUN 3"],
  },
  "3M": {
    points: [98, 99.2, 100, 99.5, 100.8, 102, 101.5, 102.7, 101.9, 103.2, 104.1, 103.6],
    labels: ["APR", "MAY", "JUN"],
  },
  "6M": {
    points: [95, 96.8, 98.4, 97.5, 99.1, 100.6, 99.8, 101.4, 103.0, 102.4, 104.2, 103.6],
    labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"],
  },
  All: {
    points: [88, 91.4, 93.1, 90.7, 95.2, 97.6, 96.5, 100.1, 102.4, 99.8, 103.2, 103.6],
    labels: ["2025", "Q2", "Q3", "Q4", "2026", "NOW"],
  },
};

function PerformanceChart({ range }: { range: Range }) {
  const series = PERF_SERIES[range];
  const { points, labels } = series;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pad = Math.max((max - min) * 0.15, 0.5);
  const yMin = min - pad;
  const yMax = max + pad;
  const yRange = yMax - yMin;
  const width = 600;
  const height = 200;
  const xStep = width / (points.length - 1);
  const coords = points.map((v, i) => ({
    x: i * xStep,
    y: height - ((v - yMin) / yRange) * height,
  }));
  const linePath = coords
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  const yTicks = [yMax, yMax - yRange / 3, yMin + yRange / 3, yMin].map((v) => v.toFixed(1));

  return (
    <div className="relative">
      <div className="flex">
        <div
          className="flex flex-col justify-between text-[10px] text-gray-400 pr-2 py-1"
          style={{ height: 200 }}
        >
          {yTicks.map((t, i) => (
            <span key={i}>{t}%</span>
          ))}
        </div>
        <svg viewBox="0 0 600 200" className="flex-1 h-[200px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="perfGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 66, 132, 198].map((y) => (
            <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#F1F5F9" strokeWidth="1" />
          ))}
          <path d={areaPath} fill="url(#perfGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex justify-between text-[10px] font-semibold tracking-wider text-gray-400 mt-2 pl-10">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
