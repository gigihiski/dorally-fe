import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  Wrench,
  Search,
  Play,
  BarChart3,
  StopCircle,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { DashboardHeader } from "./dashboard";
import { GUIDES, GUIDE_SLUGS } from "@/components/learn/guides";
import { useLearnGuide } from "@/components/learn/LearnGuideProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type LearnSearch = { guide?: string };

export const Route = createFileRoute("/dashboard/learn")({
  component: DashboardLearnPage,
  validateSearch: (raw: Record<string, unknown>): LearnSearch => ({
    guide:
      typeof raw.guide === "string" && raw.guide in GUIDE_SLUGS ? raw.guide : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Learn — Batman" },
      {
        name: "description",
        content:
          "Simple guides to help you understand Batman fees, risks, and portfolio tracking.",
      },
    ],
  }),
});

const STEPS = [
  { n: 1, icon: Wrench, title: "Set up your broker account", body: "Connect your broker account to Batman so you can prepare your account for strategy following." },
  { n: 2, icon: Search, title: "Explore strategies", body: "Browse strategies by movement level, historical performance, and manager." },
  { n: 3, icon: Play, title: "Follow with one account", body: "Each trading account can follow one strategy at a time." },
  { n: 4, icon: BarChart3, title: "Track your portfolio", body: "See your account value, returns, and the largest drop in one place." },
  { n: 5, icon: StopCircle, title: "Stop anytime", body: "You can stop following a strategy whenever you need to." },
];

const RISK_CARDS = [
  { icon: AlertTriangle, tone: "amber" as const, title: "Past results are not guarantees", body: "Strategy history represents a manager's movement, but does not predict future results." },
  { icon: Activity, tone: "blue" as const, title: "Results may be different", body: "Small differences can happen because of timing, latency, account size, or trade execution." },
  { icon: ShieldAlert, tone: "red" as const, title: "Auto-stop risk limit", body: "Batman will stop following automatically when your account reaches the 30% high water mark. Open positions will be closed at market price." },
  { icon: ShieldCheck, tone: "green" as const, title: "Stay in control", body: "You can stop following a strategy anytime from your portfolio. No approval needed." },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is strategy following?",
    a: "Strategy following means your account automatically copies the trades of an experienced trader (Money Manager). When they open or close a trade, the same action is applied to your account proportionally.",
  },
  {
    q: "Can I choose which strategy to follow?",
    a: "Yes. You browse strategies on the Explore page and choose one to follow. You can compare them by movement level, historical performance, starting amount, and manager.",
  },
  {
    q: "Can I follow more than one strategy?",
    a: "Each trading account can follow one strategy at a time. If you have more than one trading account connected to Batman, each account can follow a different strategy.",
  },
  {
    q: "Why can one account only follow one strategy?",
    a: "Following a strategy means your entire account is used to copy that strategy's trades. Mixing multiple strategies in one account would make it impossible to track performance or calculate fees accurately.",
  },
  {
    q: "Can I stop following anytime?",
    a: "Yes. You can stop following a strategy at any time from your Portfolio. There is no lock-in period. Once stopped, your account becomes available to follow another strategy.",
  },
  {
    q: "What happens when I stop following?",
    a: "When you stop following, any open positions that were copied from the strategy will be closed at market price. Any applicable strategy fee on new profit will be settled at that point. Your account then becomes available to follow another strategy.",
  },
  {
    q: "What happens if the risk limit is reached?",
    a: "If your account drops 30% from its high water mark, Batman will automatically stop following the strategy. Open positions will be closed at market price, and any applicable fee will be settled. Your account will then become available again. This is a platform-wide safety limit and applies to all strategies.",
  },
  {
    q: "How are fees calculated?",
    a: "Fees are based on new profit only. If your account value goes above its previous highest point, a percentage of that new profit is charged as a strategy fee. If there is no new profit, no fee is charged. Fees are settled weekly and transferred directly to the Money Manager's account.",
  },
  {
    q: "Why can my result differ from the strategy?",
    a: "Small differences can happen because of timing, trade execution speed, your account size, or fractional lot sizing. Batman copies trades proportionally based on your account balance compared to the strategy's account, so the exact results may vary slightly.",
  },
  {
    q: "Where do I add or withdraw funds?",
    a: "You can start Add Funds or Withdraw Funds from the Accounts for Following section in Portfolio. You will continue with your broker to complete the transaction. Batman does not process funds directly.",
  },
  {
    q: "Does Batman process my document verification?",
    a: "No. Document verification is handled entirely by your broker. Batman only shows the verification status and explains how it affects your ability to follow strategies. To complete or check verification, you continue with your broker directly.",
  },
  {
    q: "How do I verify my account with PrimeCodex?",
    a: "Verification is handled entirely by PrimeCodex. From your portfolio, click Continue with Broker and follow the steps in PrimeCodex to upload your documents. Once PrimeCodex confirms verification, Batman will reflect the updated status automatically.",
  },
];

function DashboardLearnPage() {
  const { guide: guideSlug } = Route.useSearch();
  const { openGuideByIndex, openGuideBySlug } = useLearnGuide();
  const popularGuidesRef = useRef<HTMLElement>(null);

  // Open the requested guide popup when arriving via a ?guide= deep link.
  useEffect(() => {
    if (guideSlug) openGuideBySlug(guideSlug);
  }, [guideSlug, openGuideBySlug]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Learn</h1>
          <p className="text-sm text-gray-500">
            Simple guides to help you understand Batman fees, risks, and portfolio tracking.
          </p>
        </header>

        {/* HERO */}
        <section className="rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white px-8 py-8 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wider text-white/70 mb-2">GETTING STARTED</p>
          <h2 className="text-2xl font-bold mb-2">New to strategy following?</h2>
          <p className="text-sm text-white/80 max-w-xl mb-5">
            Batman lets you follow strategies managed by experienced traders. You choose a strategy, connect an available account, and follow — everything from your portfolio.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                popularGuidesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="bg-white text-[#1E3A8A] text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90"
            >
              Start with the basics
            </button>
            <Link
              to="/dashboard/strategies"
              className="border border-white/40 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/10"
            >
              Explore Strategies
            </Link>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">How Batman works</h2>
          <p className="text-sm text-gray-500 mb-4">Five steps from set up to following your first strategy.</p>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.n} className="text-center">
                    <p className="text-[#10B981] text-sm font-bold mb-2">{s.n}</p>
                    <div className="w-10 h-10 rounded-full bg-[#EEF2FF] mx-auto flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-[#2563EB]" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1.5">{s.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* POPULAR GUIDES */}
        <section ref={popularGuidesRef}>
          <h2 className="text-lg font-bold text-gray-900">Popular guides</h2>
          <p className="text-sm text-gray-500 mb-4">Quick reads to help you follow your first strategy.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GUIDES.map((g, idx) => {
              const Icon = g.icon;
              const emoji = g.popup?.emoji;
              const hasPopup = Boolean(g.popup);
              return (
                <article key={g.title} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-2xl mb-3 leading-none" aria-hidden="true">
                    {emoji ?? <Icon className="w-5 h-5 text-gray-500 inline" />}
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1.5">{g.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{g.body}</p>
                  <button
                    type="button"
                    onClick={() => hasPopup && openGuideByIndex(idx)}
                    disabled={!hasPopup}
                    title={hasPopup ? undefined : "Coming soon"}
                    className={`text-xs font-semibold ${
                      hasPopup
                        ? "text-[#10B981] hover:underline cursor-pointer"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Read guide →
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* FEES */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">Fees, simply explained</h2>
          <p className="text-sm text-gray-500 mb-4">No hidden charges. You only pay when there is new profit.</p>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <p className="text-base font-bold text-gray-900 mb-2">You only pay a strategy fee on new profit.</p>
            <p className="text-sm text-gray-600 mb-4">
              If your account does not make new profit above the previous highest value, no strategy fee is charged. The fee is settled weekly and goes directly to the strategy manager.
            </p>
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4 flex gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-[#F59E0B] shrink-0" />
              <div>
                <p className="text-[11px] font-bold tracking-wider text-[#92400E] mb-1">EXAMPLE</p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  If your account goes from $100 to $110.42, the fee applies only to the $10.42 new profit. If your account drops and recovers, no fee is charged until it reaches a new high.
                </p>
              </div>
            </div>
            <button className="text-sm font-semibold text-[#10B981] hover:underline">
              Read more about fees →
            </button>
          </div>
        </section>

        {/* RISK BASICS */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">Risk basics</h2>
          <p className="text-sm text-gray-500 mb-4">
            Following a strategy involves risk. Your account value can go up or down, and you may lose money.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RISK_CARDS.map((r) => {
              const Icon = r.icon;
              const tones = {
                amber: { bg: "bg-[#FFFBEB]", fg: "text-[#D97706]" },
                blue: { bg: "bg-[#EFF6FF]", fg: "text-[#2563EB]" },
                red: { bg: "bg-[#FEF2F2]", fg: "text-[#DC2626]" },
                green: { bg: "bg-[#ECFDF5]", fg: "text-[#059669]" },
              } as const;
              const t = tones[r.tone];
              return (
                <article key={r.title} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className={`w-9 h-9 rounded-lg ${t.bg} ${t.fg} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1.5">{r.title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{r.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">Frequently asked questions</h2>
          <p className="text-sm text-gray-500 mb-4">Common questions about Batman and strategy following.</p>
          <div className="bg-white border border-gray-200 rounded-2xl px-2">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-gray-100 last:border-b-0">
                  <AccordionTrigger className="px-4 text-sm font-semibold text-gray-900 hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 text-sm text-gray-600 leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CONTACT */}
        <section className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-gray-900 mb-0.5">Still need help?</p>
            <p className="text-xs text-gray-500">Get help with account setup, document verification, or strategy following.</p>
          </div>
          <button className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90">
            Contact Support
          </button>
        </section>

        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" />
          <p className="text-xs text-gray-700">
            Following a strategy involves risk. Your account value can go up or down. Past performance does not guarantee future results. Read full risk disclosure.
          </p>
        </div>
      </main>
    </div>
  );
}
