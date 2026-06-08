import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, ShieldCheck, ChevronRight } from "lucide-react";
import { DashboardHeader, LearnGrid } from "./dashboard";
import { getPcxLinkStatus } from "@/services/integrations";
import { useFollowedStrategies } from "@/lib/useFollowedStrategies";
import { useLearnGuide } from "@/components/learn/LearnGuideProvider";

export const Route = createFileRoute("/dashboard/portfolio")({
  component: DashboardPortfolioPage,
  head: () => ({
    meta: [
      { title: "Portfolio — Batman" },
      {
        name: "description",
        content: "Track your followed strategies, account progress, and available funds.",
      },
    ],
  }),
});

const AVAILABLE_ACCOUNT_VALUE = 5000;

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtMoney = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function DashboardPortfolioPage() {
  const { openGuideBySlug } = useLearnGuide();

  const { data: status } = useQuery({
    queryKey: ["pcx-link-status"],
    queryFn: getPcxLinkStatus,
    retry: false,
    staleTime: 5_000,
  });
  const verified = status?.kyc_approved === true;

  const { strategies } = useFollowedStrategies();
  const hasStrategies = strategies.length > 0;

  const followedValue = strategies.reduce((sum, s) => sum + s.accountValue, 0);
  const totalValue = followedValue + (verified ? AVAILABLE_ACCOUNT_VALUE : 0);
  const todaysChange = Number((totalValue * 0.0078).toFixed(2));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DashboardHeader connected={verified} />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Portfolio summary banner */}
        {hasStrategies ? (
          <section className="rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white px-8 py-7 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end shadow-sm">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-white/70 mb-2">
                YOUR PORTFOLIO
              </p>
              <p className="text-xs text-white/70 mb-1">Total Account Value</p>
              <p className="text-4xl font-bold">{fmtMoney(totalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">Today's Change</p>
              <p className="text-2xl font-bold text-[#34D399]">+{fmtMoney(todaysChange)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-white/70 mb-1">Following</p>
              <p className="text-2xl font-bold">
                {strategies.length} {strategies.length === 1 ? "strategy" : "strategies"}
              </p>
            </div>
          </section>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Portfolio</h1>
              <p className="text-sm text-gray-500">
                Your followed strategies and account progress.
              </p>
            </div>
            <Link
              to="/dashboard/strategies"
              className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90"
            >
              Explore Strategies
            </Link>
          </div>
        )}

        {/* Doc verification needed */}
        {!verified && (
          <section className="bg-white border border-gray-200 rounded-2xl p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Complete your document verification
            </h2>
            <p className="text-sm text-gray-500 mb-5 max-w-2xl">
              One last step — verify your documents with your broker to unlock full access to your
              portfolio.
            </p>
            <button className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90">
              Continue with Broker
            </button>
          </section>
        )}

        {/* Followed strategies */}
        {hasStrategies ? (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Your Portfolio</h2>
            <p className="text-sm text-gray-500 mb-4">Strategies you are currently following.</p>
            <div className="space-y-3">
              {strategies.map((s) => (
                <article key={s.followeeId} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full font-semibold flex items-center justify-center text-sm"
                        style={{ backgroundColor: s.avatarBg, color: s.avatarFg }}
                      >
                        {s.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">Money Manager: {s.owner}</p>
                      </div>
                    </div>
                    <Link
                      to="/strategies/$username"
                      params={{ username: s.id }}
                      className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-gray-50"
                    >
                      View
                    </Link>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap bg-[#F8FAFC] rounded-lg px-4 py-2 text-xs text-gray-600 mb-4">
                    <span>
                      <span className="font-semibold text-gray-800">Followed with:</span> Account #
                      {s.accountId} (PrimeCodex)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#10B981] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Automated Safeguard · Active
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100 text-center">
                    <PortfolioStat label="THIS MONTH" value={fmtPct(s.thisMonth)} valueClass="text-[#10B981]" />
                    <PortfolioStat label="LARGEST DROP" value={fmtPct(s.largestDrop)} valueClass="text-[#EF4444]" />
                    <PortfolioStat label="ACCOUNT VALUE" value={fmtMoney(s.accountValue)} valueClass="text-gray-900" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          /* Empty state */
          <section className="bg-white border border-gray-200 rounded-2xl py-16 px-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-5">
              <FileText className="w-8 h-8 text-[#2563EB]" />
            </div>
            <p className="text-lg font-bold text-gray-900 mb-2">Your portfolio is empty</p>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Once you follow a strategy, your portfolio value and progress will appear here. Choose a
              strategy to get started.
            </p>
            <Link
              to="/dashboard/strategies"
              className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90"
            >
              Explore Strategies
            </Link>
          </section>
        )}

        {/* Learn (image 2) */}
        {hasStrategies && <LearnGrid />}

        {/* Understanding your portfolio */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Understanding your portfolio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: BarChart3, title: "How portfolio tracking works", body: "What you see in your portfolio and how it's calculated.", slug: "portfolio-tracking" },
              { icon: FileText, title: "Fees explained", body: "How strategy fees work and when they're charged.", slug: "understanding-fees" },
              { icon: ShieldCheck, title: "Risk basics", body: "What to expect when following a strategy.", slug: "risk-basics" },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.title}
                  type="button"
                  onClick={() => openGuideBySlug(c.slug)}
                  className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-3 text-left hover:shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-1">{c.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{c.body}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function PortfolioStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
