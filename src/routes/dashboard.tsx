import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPcxLinkStatus } from "@/services/integrations";
import { getMoneyManagers, type MoneyManager } from "@/services/money-managers";
import { clearAuthSession, getBatmanUser, isAuthenticated } from "@/lib/auth-token";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLearnGuide } from "@/components/learn/LearnGuideProvider";
import { useFollowedStrategies } from "@/lib/useFollowedStrategies";
import { popularStrategies } from "@/data/popularStrategies";
import {
  Search,
  Trophy,
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Info,
  Lock,
  ArrowRight,
  Wallet,
  FileBarChart,
  UserCheck,
  ClipboardList,
  HelpCircle,
  ChevronRight,
  CircleUser,
  Bookmark,
  LogOut,
} from "lucide-react";

const STAT_HINTS: Record<string, string> = {
  "THIS MONTH": "Return earned by this strategy so far in the current calendar month.",
  "LARGEST DROP": "Biggest decline from a recent peak (max drawdown). Smaller is better.",
  "ACCOUNT VALUE": "Total value of this account, including any open positions.",
};

function StatLabel({ label }: { label: string }) {
  const hint = STAT_HINTS[label];
  if (!hint) return <>{label}</>;
  return (
    <span className="inline-flex items-center justify-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3 h-3 text-gray-400 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] text-xs">{hint}</TooltipContent>
      </Tooltip>
    </span>
  );
}

const AVATAR_PALETTE = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#0EA5E9"];

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarBg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export const Route = createFileRoute("/dashboard")({
  component: () => <Outlet />,
});

export type DashboardState = "not-connected" | "need-verify" | "need-following" | "followed";

export function DashboardView({ state }: { state: DashboardState }) {
  // Even when already following, present the verified "Ready to Start" header —
  // hero + setup-progress card with Document verification checked (image spec).
  const headerState: Exclude<DashboardState, "followed"> =
    state === "followed" ? "need-following" : state;
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header state={state} />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <PortfolioHero state={headerState} />
        <GettingStartedCard state={headerState} />
        <ExploreBatman />
        {state === "need-following" && <PortfolioReviewEmpty />}
        {state === "followed" && <PortfolioPreview />}
        <PopularStrategies state={state} />
        {state === "followed" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RecentUpdates state={state} />
            <LearnSidebar />
          </div>
        ) : (
          <>
            <LearnGrid />
            <RecentUpdates state={state} />
          </>
        )}
      </main>
    </div>
  );
}


/* ============================= HEADER ============================= */

function Header(_: { state: DashboardState }) {
  return <DashboardHeader />;
}

export function DashboardHeader() {
  const hasSession = typeof window === "undefined" ? false : isAuthenticated();
  const { data } = useQuery({
    queryKey: ["pcx-link-status"],
    queryFn: getPcxLinkStatus,
    enabled: hasSession,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const linked = Boolean(data?.linked);
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-gray-900" />
          <span className="font-extrabold text-gray-900 tracking-tight">Batman</span>
          <span className="ml-1 text-[10px] font-semibold text-[#2563EB] bg-[#EEF2FF] px-2 py-0.5 rounded">
            BETA
          </span>
        </div>
        <DashboardNav />

        <div className="flex items-center gap-3">
          {linked ? (
            <span className="text-xs font-semibold flex items-center gap-1.5 text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              PrimeCodex Connected
            </span>
          ) : (
            <span className="text-xs font-semibold flex items-center gap-1.5 text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              Not Connected
            </span>
          )}
          <NotificationsPopover />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = typeof window === "undefined" ? null : getBatmanUser();
  const display = user?.name || user?.username || user?.email || "User";
  const initials = getInitials(display);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Supabase session may not exist for Batman-API-only users — safe to ignore.
    }
    clearAuthSession();
    queryClient.clear();
    navigate({ to: "/login" });
  };

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="w-9 h-9 rounded-full bg-[#EEF2FF] text-[#2563EB] font-semibold flex items-center justify-center hover:bg-[#DBEAFE] transition-colors"
        >
          {initials}
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{display}</p>
              {user?.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
            </div>
            <MenuItem
              to="/dashboard/account"
              icon={<CircleUser className="w-4 h-4 text-[#2563EB]" />}
              onClick={() => setOpen(false)}
            >
              Account
            </MenuItem>
            <MenuItem
              to="/dashboard/saved-strategies"
              icon={<Bookmark className="w-4 h-4 text-gray-500" />}
              onClick={() => setOpen(false)}
            >
              Saved Strategies
            </MenuItem>
            <div className="border-t border-gray-100" />
            <MenuItem
              icon={<LogOut className="w-4 h-4 text-[#DC2626]" />}
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
              tone="danger"
            >
              Log Out
            </MenuItem>
          </div>
        )}
      </div>

      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-in fade-in"
          onClick={() => {
            if (!loggingOut) setConfirmLogout(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <LogOut className="w-5 h-5 text-[#DC2626]" />
              </div>
              <h3 id="logout-confirm-title" className="text-lg font-bold text-gray-900">
                Anda yakin ingin keluar?
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Anda perlu sign in lagi untuk mengakses strategies dan portfolio Anda.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-3 rounded-xl bg-[#DC2626] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loggingOut ? "Signing out..." : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  tone,
  to,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
  to?: "/dashboard/account" | "/dashboard/saved-strategies";
}) {
  const cls = `w-full px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
    tone === "danger" ? "text-[#DC2626]" : "text-gray-700"
  }`;
  if (to) {
    return (
      <Link to={to} role="menuitem" onClick={onClick} className={cls}>
        {icon} {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onClick} className={cls}>
      {icon} {children}
    </button>
  );
}

function DashboardNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (target?: string) => {
    if (!target) return false;
    if (target === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
    return pathname === target || pathname.startsWith(target + "/");
  };
  return (
    <nav className="flex items-center gap-1 text-sm font-medium">
      <NavBtn label="Home" to="/dashboard" active={isActive("/dashboard")} />
      <NavBtn
        label="Strategies"
        to="/dashboard/strategies"
        active={isActive("/dashboard/strategies")}
      />
      <NavBtn
        label="Portfolio"
        to="/dashboard/portfolio"
        active={isActive("/dashboard/portfolio")}
      />
      <NavBtn label="Learn" to="/dashboard/learn" active={isActive("/dashboard/learn")} />
    </nav>
  );
}

function NavBtn({ label, active, to }: { label: string; active?: boolean; to?: string }) {
  const cls =
    "px-4 py-1.5 rounded-md transition-colors " +
    (active
      ? "bg-[#EEF2FF] text-[#2563EB]"
      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50");
  if (to) {
    return (
      <Link to={to} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" className={cls}>
      {label}
    </button>
  );
}

/* ============================= HERO ============================= */

function PortfolioHero({ state }: { state: DashboardState }) {
  const { strategies } = useFollowedStrategies();
  if (state === "followed") {
    const fmtMoney = (n: number) =>
      `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalValue = strategies.reduce((sum, s) => sum + s.accountValue, 0) + 5000;
    const todaysChange = strategies.reduce((sum, s) => sum + s.todaysChange, 0);
    return (
      <section className="rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white px-8 py-7 grid grid-cols-3 gap-6 items-end shadow-sm">
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
        <div className="text-right">
          <p className="text-xs text-white/70 mb-1">Following</p>
          <p className="text-2xl font-bold">
            {strategies.length} {strategies.length === 1 ? "strategy" : "strategies"}
          </p>
        </div>
      </section>
    );
  }

  const copy: Record<Exclude<DashboardState, "followed">, { eyebrow: string; title: string; body: string }> = {
    "not-connected": {
      eyebrow: "YOUR PORTFOLIO",
      title: "Your journey starts here",
      body: "Explore strategies first, or connect your account to get started.",
    },
    "need-verify": {
      eyebrow: "YOUR PORTFOLIO",
      title: "Not started yet",
      body: "Complete your setup or explore strategies first.",
    },
    "need-following": {
      eyebrow: "YOUR PORTFOLIO",
      title: "Ready to Start",
      body: "Your dedicated PrimeCodex account is verified. Follow a strategy to begin.",
    },
  };
  const c = copy[state];

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white px-8 py-10 shadow-sm">
      <div className="max-w-xl">
        <p className="text-[11px] font-semibold tracking-wider text-white/70 mb-3">{c.eyebrow}</p>
        <h1 className="text-3xl font-bold mb-2">{c.title}</h1>
        <p className="text-sm text-white/80">{c.body}</p>
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-30">
        <Wallet className="w-32 h-32" strokeWidth={1} />
      </div>
    </section>
  );
}

/* ============================= GETTING STARTED ============================= */

function GettingStartedCard({ state }: { state: Exclude<DashboardState, "followed"> }) {
  const config = {
    "not-connected": {
      eyebrow: "GETTING STARTED",
      title: "Set up your broker account",
      body: "Link your account once, then sit back, follow top strategies and watch your portfolio grow automatically.",
      primary: "Set Up Account",
      step: 1 as const,
      badges: null,
    },
    "need-verify": {
      eyebrow: "GETTING STARTED",
      title: "Complete your document verification",
      body: "One last step — verify your documents with your broker to unlock full access to strategies.",
      primary: "Continue with Broker",
      step: 2 as const,
      badges: (
        <div className="flex flex-wrap gap-2 mt-5">
          <Badge tone="green" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>Broker connected</Badge>
          <Badge tone="orange" icon={<AlertCircle className="w-3.5 h-3.5" />}>Document verification needed</Badge>
          <Badge tone="purple" icon={<Lock className="w-3.5 h-3.5" />}>Following limited</Badge>
        </div>
      ),
    },
    "need-following": {
      eyebrow: "YOU'RE ALL SET",
      title: "Account ready — start following a strategy",
      body: "Choose a strategy to follow and your account will start copying it automatically.",
      primary: "Explore Strategies",
      step: 3 as const,
      badges: null,
    },
  }[state];

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-7">
      <p className="text-[11px] font-semibold tracking-wider text-[#2563EB] mb-2">
        {config.eyebrow}
      </p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-3xl">{config.body}</p>
      <div className="flex gap-3">
        <Link
          to="/dashboard/strategies"
          className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90"
        >
          {config.primary}
        </Link>
      </div>
      {config.badges}
      <SetupProgress step={config.step} />
    </section>
  );
}

function Badge({
  tone,
  icon,
  children,
}: {
  tone: "green" | "orange" | "purple";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const map = {
    green: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
    orange: "bg-[#FFF7ED] text-[#D97706] border-[#FED7AA]",
    purple: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1 rounded-md ${map[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

function SetupProgress({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Broker account connected" },
    { n: 2, label: "Document verification" },
    { n: 3, label: "Ready to follow strategies" },
  ];
  return (
    <div className="mt-7 pt-6 border-t border-gray-100 flex items-center gap-3">
      <p className="text-[11px] font-semibold tracking-wider text-[#2563EB] mr-3 shrink-0">
        YOUR SETUP PROGRESS
      </p>
      {steps.map((s, i) => {
        const done = s.n < step;
        const active = s.n === step;
        return (
          <div key={s.n} className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done
                    ? "bg-[#2563EB] text-white"
                    : active
                    ? "border-2 border-[#2563EB] text-[#2563EB]"
                    : "border border-gray-300 text-gray-400"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
              </div>
              <span
                className={`text-xs leading-tight ${
                  done || active ? "text-[#2563EB] font-semibold" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}

/* ============================= EXPLORE BATMAN ============================= */

type ExploreKind = "browse" | "top-mm" | "low-drawdown" | "how-it-works";
type ExploreItem = {
  icon: typeof Search;
  title: string;
  sub: string;
  kind: ExploreKind;
};

const EXPLORE_ITEMS: ExploreItem[] = [
  { icon: Search, title: "Browse Strategies", sub: "Find a strategy to follow", kind: "browse" },
  { icon: Trophy, title: "Top Money Managers", sub: "Highest performing strategies", kind: "top-mm" },
  { icon: ShieldCheck, title: "Low Drawdown", sub: "Safer, steadier strategies", kind: "low-drawdown" },
  { icon: BookOpen, title: "How It Works", sub: "Learn before you start", kind: "how-it-works" },
];

const CARD_CLASS =
  "bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-sm text-left transition-shadow";

function ExploreCardInner({ item }: { item: ExploreItem }) {
  const Icon = item.icon;
  return (
    <>
      <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#2563EB]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
        <p className="text-xs text-gray-500 truncate">{item.sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
    </>
  );
}

function ExploreCard({ item }: { item: ExploreItem }) {
  switch (item.kind) {
    case "browse":
      return (
        <Link to="/dashboard/strategies" className={CARD_CLASS}>
          <ExploreCardInner item={item} />
        </Link>
      );
    case "top-mm":
      return (
        <Link
          to="/dashboard/strategies"
          search={{ sort: "highest_return" }}
          className={CARD_CLASS}
        >
          <ExploreCardInner item={item} />
        </Link>
      );
    case "low-drawdown":
      return (
        <Link
          to="/dashboard/strategies"
          search={{ drawdown: "under5" }}
          className={CARD_CLASS}
        >
          <ExploreCardInner item={item} />
        </Link>
      );
    case "how-it-works":
      return (
        <Link
          to="/dashboard/learn"
          search={{ guide: "how-following-works" }}
          className={CARD_CLASS}
        >
          <ExploreCardInner item={item} />
        </Link>
      );
  }
}

function ExploreBatman() {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Explore Batman</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXPLORE_ITEMS.map((it) => (
          <ExploreCard key={it.title} item={it} />
        ))}
      </div>
    </section>
  );
}

/* ============================= PORTFOLIO REVIEW (state 1.4) ============================= */

function PortfolioPreview() {
  const { strategies } = useFollowedStrategies();
  const s = strategies[0];
  if (!s) return null;
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  const fmtMoney = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Portfolio Review</h2>
        <p className="text-sm text-gray-500">Your followed strategies will appear here.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full font-semibold flex items-center justify-center text-sm"
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
            className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-1.5 rounded-md hover:bg-gray-50"
          >
            View
          </Link>
        </div>
        <div className="bg-[#F8FAFC] rounded-lg px-4 py-2 text-xs text-gray-600 mb-4">
          <span className="font-semibold text-gray-800">Followed with:</span> Account #{s.accountId}{" "}
          (PrimeCodex)
        </div>
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <Stat label="THIS MONTH" value={fmtPct(s.thisMonth)} valueClass="text-[#10B981]" />
          <Stat label="LARGEST DROP" value={fmtPct(s.largestDrop)} valueClass="text-[#EF4444]" />
          <Stat label="ACCOUNT VALUE" value={fmtMoney(s.accountValue)} valueClass="text-gray-900" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-1">
        <StatLabel label={label} />
      </p>
      <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

/* ============================= PORTFOLIO REVIEW EMPTY (state 1.3) ============================= */

function PortfolioReviewEmpty() {
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Portofolio Review</h2>
        <p className="text-sm text-gray-500">Your followed strategies will appear here.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-[#2563EB]" />
        </div>
        <p className="font-semibold text-gray-900 mb-1">Your portfolio is empty</p>
        <p className="text-sm text-gray-500 mb-1">Choose a strategy to start following.</p>
        <p className="text-sm text-gray-500 mb-5">Once you do, your strategy performance and account progress will appear here.</p>
        <Link
          to="/dashboard/strategies"
          className="border border-[#2563EB] text-[#2563EB] text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#EEF2FF]"
        >
          Explore Strategies
        </Link>
      </div>
    </section>
  );
}

/* ============================= POPULAR STRATEGIES ============================= */

function PopularStrategies({ state }: { state: DashboardState }) {
  const [tab, setTab] = useState<string>("All");
  const tabs = ["All", "Stable", "Growth", "Low Drawdown", "New"];
  const grid = state === "followed";

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["money-managers", { page: 1, limit: 20 }],
    queryFn: () => getMoneyManagers({ page: 1, limit: 20 }),
  });

  const strategies = useMemo(
    () =>
      (data?.data ?? []).map((mm: MoneyManager) => {
        const idForUrl = mm.username || mm.id;
        const displayName = mm.name || idForUrl;
        return {
          id: idForUrl,
          name: displayName,
          owner: popularStrategies.find((p) => p.id === idForUrl)?.owner ?? "",
          category: "" as string,
          thisMonth:
            typeof mm.performance?.this_month_return_pct === "number"
              ? Number(mm.performance.this_month_return_pct.toFixed(1))
              : (null as number | null),
          largestDrop:
            typeof mm.performance?.biggest_drop_pct === "number"
              ? -Number(mm.performance.biggest_drop_pct.toFixed(1))
              : (null as number | null),
          avatarBg: getAvatarBg(idForUrl),
          avatarFg: "#FFFFFF",
          initials: getInitials(displayName),
          avatar: mm.avatar,
        };
      }),
    [data],
  );

  const filtered = useMemo(() => {
    if (tab === "All") return strategies;
    return strategies.filter((s) => s.category === tab);
  }, [tab, strategies]);

  return (
    <section>
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Popular Strategies</h2>
          <p className="text-sm text-gray-500">
            Explore available strategies before you start following.
          </p>
        </div>
        <Link
          to="/dashboard/strategies"
          className="text-sm font-semibold text-[#2563EB] flex items-center gap-1"
        >
          See all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex gap-2 my-4 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs font-semibold px-4 py-1.5 rounded-full border ${
              tab === t
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]" />
        </div>
      ) : isError ? (
        <div className="bg-white border border-red-100 rounded-2xl p-6 text-center max-w-md mx-auto">
          <p className="text-sm text-red-600 mb-3">
            Failed to load strategies. {error instanceof Error ? error.message : ""}
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold disabled:opacity-60"
          >
            {isFetching ? "Retrying..." : "Try again"}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500">No strategies available right now.</p>
        </div>
      ) : grid ? (
        <div className="space-y-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 flex-wrap sm:flex-nowrap"
            >
              <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                {s.avatar ? (
                  <img
                    src={s.avatar}
                    alt={s.name}
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full font-semibold flex items-center justify-center text-sm shrink-0"
                    style={{ background: s.avatarBg, color: s.avatarFg }}
                  >
                    {s.initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{s.name}</p>
                  {s.owner && <p className="text-sm text-gray-500 truncate">{s.owner}</p>}
                </div>
              </div>
              <div className="text-center px-3">
                <p className="text-[11px] font-semibold tracking-wider text-gray-400 mb-1">
                  THIS MONTH
                </p>
                <p className="text-lg font-bold text-[#10B981]">
                  {s.thisMonth == null ? "—" : `+${s.thisMonth}%`}
                </p>
              </div>
              <div className="text-center px-3">
                <p className="text-[11px] font-semibold tracking-wider text-gray-400 mb-1">
                  LARGEST DROP
                </p>
                <p className="text-lg font-bold text-[#EF4444]">
                  {s.largestDrop == null ? "—" : `${s.largestDrop}%`}
                </p>
              </div>
              <Link
                to="/strategies/$username"
                params={{ username: s.id }}
                className="border border-[#2563EB] text-[#2563EB] font-semibold px-6 py-2.5 rounded-xl hover:bg-[#EEF4FF] whitespace-nowrap"
              >
                View Strategy
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {filtered.map((s) => (
            <div key={s.id} className="grid grid-cols-12 items-center gap-4 px-5 py-4">
              <Link
                to="/strategies/$username"
                params={{ username: s.id }}
                className="col-span-4 flex items-center gap-3 min-w-0 group"
              >
                {s.avatar ? (
                  <img
                    src={s.avatar}
                    alt={s.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full font-semibold flex items-center justify-center text-xs shrink-0"
                    style={{ background: s.avatarBg, color: s.avatarFg }}
                  >
                    {s.initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#2563EB] transition-colors">
                    {s.name}
                  </p>
                  {s.owner && <p className="text-xs text-gray-500 truncate">{s.owner}</p>}
                </div>
              </Link>
              <div className="col-span-3">
                <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-0.5">
                  <StatLabel label="THIS MONTH" />
                </p>
                <p className="text-sm font-bold text-[#10B981]">
                  {s.thisMonth == null ? "—" : `+${s.thisMonth}%`}
                </p>
              </div>
              <div className="col-span-3">
                <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-0.5">
                  <StatLabel label="LARGEST DROP" />
                </p>
                <p className="text-sm font-bold text-[#EF4444]">
                  {s.largestDrop == null ? "—" : `${s.largestDrop}%`}
                </p>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Link
                  to="/strategies/$username"
                  params={{ username: s.id }}
                  className="text-gray-600 text-xs font-semibold hover:text-gray-900 px-2 py-1"
                >
                  Details
                </Link>
                <Link
                  to="/strategies/$strategyId/$step"
                  params={{ strategyId: s.id, step: "step-1" }}
                  className="bg-[#2563EB] text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90"
                >
                  Follow
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================= LEARN ============================= */

const learnItems: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  slug: string;
}> = [
  { icon: UserCheck, title: "How strategy following works", sub: "Learn what it means to follow a strategy.", slug: "how-following-works" },
  { icon: ClipboardList, title: "Understanding fees", sub: "How profit sharing and fee charging works.", slug: "understanding-fees" },
  { icon: ShieldCheck, title: "Risk basics before following", sub: "What to expect before you start.", slug: "risk-basics" },
  { icon: HelpCircle, title: "How to choose a strategy", sub: "Tips for picking the right strategy for you.", slug: "how-to-choose" },
];

export function LearnGrid() {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900">Learn</h2>
      <p className="text-sm text-gray-500 mb-4">New to strategy following? Start here.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {learnItems.map((it) => (
          <LearnCard key={it.title} {...it} />
        ))}
      </div>
    </section>
  );
}

function LearnSidebar() {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900">Learn</h2>
      <p className="text-sm text-gray-500 mb-4">New to strategy following? Start here.</p>
      <div className="space-y-3">
        {learnItems.slice(0, 2).map((it) => (
          <LearnCard key={it.title} {...it} />
        ))}
      </div>
    </section>
  );
}

function LearnCard({
  icon: Icon,
  title,
  sub,
  slug,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  slug: string;
}) {
  const { openGuideBySlug } = useLearnGuide();
  return (
    <button
      type="button"
      onClick={() => openGuideBySlug(slug)}
      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-left hover:shadow-sm w-full"
    >
      <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#2563EB]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
    </button>
  );
}

/* ============================= RECENT UPDATES ============================= */

function RecentUpdates({ state }: { state: DashboardState }) {
  type Item = { icon: React.ReactNode; label: React.ReactNode; time: string };
  const all: Item[] = [
    {
      icon: <FileBarChart className="w-4 h-4 text-[#10B981]" />,
      label: <span><span className="font-semibold">Followed</span> "Consistent" Strategy</span>,
      time: "0m ago",
    },
    {
      icon: <FileBarChart className="w-4 h-4 text-[#10B981]" />,
      label: <span><span className="font-semibold">Document Verification</span> Completed</span>,
      time: "1m ago",
    },
    {
      icon: <FileBarChart className="w-4 h-4 text-[#2563EB]" />,
      label: <span><span className="font-semibold">Document Verification</span> Uploaded</span>,
      time: "30m ago",
    },
    {
      icon: <UserCheck className="w-4 h-4 text-[#10B981]" />,
      label: <span><span className="font-semibold">Broker Account Connected</span> <span className="text-gray-500">— Prime Codex</span></span>,
      time: "1h ago",
    },
  ];
  let items: Item[] = [];
  if (state === "not-connected") items = [];
  else if (state === "need-verify") items = [all[2], all[3]].filter(Boolean);
  else if (state === "need-following") items = [all[1], all[2], all[3]];
  else items = all;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">Recent Updates</h2>
        {state === "followed" && (
          <button className="text-sm font-semibold text-[#2563EB] flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl">
        {items.length === 0 ? (
          <div className="py-14 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-3">
              <FileBarChart className="w-6 h-6 text-[#2563EB]" />
            </div>
            <p className="font-semibold text-gray-900 mb-0.5">No updates yet</p>
            <p className="text-sm text-gray-500">Account and strategy updates will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    {it.icon}
                  </div>
                  <p className="text-sm text-gray-700 truncate">{it.label}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{it.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
