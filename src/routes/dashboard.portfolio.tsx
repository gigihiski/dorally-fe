import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Info, BarChart3, FileText, ShieldCheck, ChevronRight } from "lucide-react";
import { DashboardHeader } from "./dashboard";

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

function getDocsVerified(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem("pcx_docs_verified") === "1";
}

function DashboardPortfolioPage() {
  const [verified, setVerified] = useState(true);

  useEffect(() => {
    setVerified(getDocsVerified());
    const onStorage = () => setVerified(getDocsVerified());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DashboardHeader connected={verified} />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Portfolio</h1>
            <p className="text-sm text-gray-500">
              Your followed strategies and account progress will appear here.
            </p>
          </div>
          <Link
            to="/dashboard/strategies"
            className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90"
          >
            Explore Strategies
          </Link>
        </div>

        {/* Doc verification needed */}
        {!verified && (
          <section className="bg-white border border-gray-200 rounded-2xl p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Complete your document verification
            </h2>
            <p className="text-sm text-gray-500 mb-5 max-w-2xl">
              One last step — verify your documents with your broker to unlock full access to your portfolio.
            </p>
            <button className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90">
              Continue with Broker
            </button>
          </section>
        )}

        {/* Empty state */}
        <section className="bg-white border border-gray-200 rounded-2xl py-16 px-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-5">
            <FileText className="w-8 h-8 text-[#2563EB]" />
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">Your portfolio is empty</p>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            Once you follow a strategy, your portfolio value and progress will appear here. Choose a strategy to get started.
          </p>
          <Link
            to="/dashboard/strategies"
            className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90"
          >
            Explore Strategies
          </Link>
        </section>

        {/* Accounts (only when verified) */}
        {verified && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Accounts for Following</h2>
            <p className="text-sm text-gray-500 mb-4">Each account can follow one strategy at a time.</p>
            <div className="space-y-3">
              {[{ id: "123456" }, { id: "789012" }].map((a) => (
                <article
                  key={a.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 flex-wrap"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-[#DBEAFE] flex items-center justify-center text-[#2563EB] shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-bold text-gray-900">
                      Account #{a.id} Available
                    </p>
                    <p className="text-xs text-gray-500">
                      PrimeCodex · Ready to follow a strategy
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">$5,000.00</p>
                    <p className="text-[10px] font-semibold tracking-wider text-gray-400">AVAILABLE</p>
                  </div>
                  <div className="flex items-center gap-4 ml-auto">
                    <button className="text-xs font-semibold text-[#2563EB] hover:underline">
                      Add Funds
                    </button>
                    <span className="text-gray-300">|</span>
                    <button className="text-xs font-semibold text-[#2563EB] hover:underline">
                      Withdraw Funds
                    </button>
                    <Link
                      to="/dashboard/strategies"
                      className="bg-[#2563EB] text-white text-xs font-semibold px-4 py-2 rounded-md hover:opacity-90"
                    >
                      Explore Strategies
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-gray-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#2563EB]" />
          You will continue with your broker to add or withdraw funds.
        </p>

        {/* Understanding your portfolio */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Understanding your portfolio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: BarChart3, title: "How portfolio tracking works", body: "What you see in your portfolio and how it's calculated." },
              { icon: FileText, title: "Fees explained", body: "How strategy fees work and when they're charged." },
              { icon: ShieldCheck, title: "Risk basics", body: "What to expect when following a strategy." },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.title}
                  to="/dashboard/learn"
                  className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-3 hover:shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-1">{c.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{c.body}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
