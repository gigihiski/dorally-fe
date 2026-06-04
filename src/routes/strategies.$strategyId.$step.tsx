import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Shield,
  Lock,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Building2,
  CreditCard,
  Info,
  Plus,
  X,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import type { MoneyManager as MockMoneyManager } from "@/data/moneyManagers";
import { FollowHeader, StepsBar, StrategyCard, FollowFooter } from "@/components/FollowLayout";
import step1Illustration from "@/assets/step1-illustration.png";
import {
  createPcxDeposit,
  getPcxAccounts,
  getPcxDepositMethods,
  type DepositMethod,
  type ExtendedMethod,
  type PcxAccount,
  type PcxAccountsGrouped,
} from "@/services/integrations";
import { getMoneyManagerByUsername } from "@/services/money-managers";
import { setFollowRisk, toggleFollow } from "@/services/follows";
import { getBatmanUser } from "@/lib/auth-token";
import { ApiError } from "@/lib/api";
import { USE_MOCKS } from "@/mocks/config";

interface NinjaChargeWidgetInstance {
  open: (orderData: unknown, method?: string, isNewWindow?: boolean) => void;
  close: () => void;
}

declare global {
  interface Window {
    SalesChargeWidget?: new (options: {
      params?: Record<string, unknown>;
    }) => NinjaChargeWidgetInstance;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing && existing.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.body.appendChild(script);
  });
}

async function openNinjaChargeWidget(
  widgetUrl: string,
  widgetData: Record<string, unknown>,
): Promise<NinjaChargeWidgetInstance> {
  await loadScript(widgetUrl);
  const Ctor = window.SalesChargeWidget;
  if (!Ctor) {
    throw new Error("Payment widget script loaded but global constructor was not found.");
  }
  const widget = new Ctor({ params: {} });
  widget.open(widgetData, "deposit");
  return widget;
}

const ACCOUNTS_QUERY_KEY = ["pcx-accounts"] as const;

type AccountTypeKey = keyof PcxAccountsGrouped;

interface MyAccount extends PcxAccount {
  type: AccountTypeKey;
}

const ACCOUNT_TYPE_ORDER: AccountTypeKey[] = [
  "trading",
  "ib",
  "mam",
  "investor",
  "wallet",
  "affiliate",
  "demo",
];

const ACCOUNT_TYPE_LABEL: Record<AccountTypeKey, string> = {
  trading: "Trading",
  demo: "Demo",
  ib: "IB",
  mam: "MAM",
  investor: "Investor",
  wallet: "Wallet",
  affiliate: "Affiliate",
};

function flattenAccounts(grouped: PcxAccountsGrouped | undefined): MyAccount[] {
  if (!grouped) return [];
  return ACCOUNT_TYPE_ORDER.flatMap((t) => (grouped[t] ?? []).map((a) => ({ ...a, type: t })));
}
const PCX_VERIFICATION_URL = import.meta.env.VITE_PCX_VERIFICATION_URL ?? "https://my.pcxfx.com";

const AVATAR_PALETTE = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#0EA5E9"];

function getAvatarBg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

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

type MoneyManagerView = MockMoneyManager & { avatar?: string; money_manager_id?: string };

const viewSchema = z.object({
  view: z.string().optional(),
  dialog: z.enum(["add-funds", "waiting"]).optional(),
  amount: z.coerce.number().optional(),
  safeguards: z.coerce.boolean().optional(),
  loss: z.coerce.number().optional(),
  method_id: z.string().optional(),
  currency: z.string().optional(),
  account_id: z.string().optional(),
});

export const Route = createFileRoute("/strategies/$strategyId/$step")({
  component: FollowStep,
  validateSearch: (s) => viewSchema.parse(s),
  head: () => ({ meta: [{ title: "Follow Strategy — Batman" }] }),
});

function FollowStep() {
  const { strategyId, step } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const {
    data: apiMm,
    isLoading: mmLoading,
    isError: mmError,
  } = useQuery({
    queryKey: ["money-manager", strategyId],
    queryFn: () => getMoneyManagerByUsername(strategyId),
    retry: false,
    staleTime: 60_000,
  });

  const mm: MoneyManagerView | null = useMemo(() => {
    if (!apiMm) return null;
    const username = apiMm.username ?? strategyId;
    return {
      id: username,
      money_manager_id: apiMm.id,
      name: apiMm.name ?? username,
      description: "",
      followers: apiMm.followers_count ?? 0,
      averageGrowth: 0,
      category: "—",
      avatarBg: getAvatarBg(username),
      initials: getInitials(apiMm.name ?? username),
      avatar: apiMm.avatar,
    };
  }, [apiMm, strategyId]);

  const stepMatch = step.match(/^step-(\d)$/);
  const stepNum = stepMatch ? parseInt(stepMatch[1], 10) : 0;

  // Auto-advance simulation: step-1 creating -> select
  useEffect(() => {
    if (stepNum === 1 && search.view === "creating") {
      const t = setTimeout(() => {
        navigate({
          to: "/strategies/$strategyId/$step",
          params: { strategyId, step: "step-1" },
          search: { view: "select" },
        });
      }, 3000);
      return () => clearTimeout(t);
    }
    if (stepNum === 2 && search.dialog === "waiting") {
      const t = setTimeout(() => {
        navigate({
          to: "/strategies/$strategyId/$step",
          params: { strategyId, step: "step-2" },
          search: {
            view: "success",
            amount: search.amount || 10000,
            account_id: search.account_id,
          },
        });
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [stepNum, search.view, search.dialog, strategyId, navigate, search.amount, search.account_id]);

  if (!stepMatch) {
    return <Navigate to="/strategies/$strategyId/$step" params={{ strategyId, step: "step-1" }} />;
  }
  if (mmLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" />
      </div>
    );
  }
  if (mmError || !mm) {
    return <Navigate to="/dashboard/strategies" />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <FollowHeader strategyName={mm.name} />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Follow {mm.name}</h1>
          <p className="text-gray-500">
            Set up your copy trading account to start following this strategy.
          </p>
        </div>

        <StepsBar currentStep={stepNum} />

        {stepNum === 1 && <Step1 mm={mm} view={search.view} />}
        {stepNum === 2 && (
          <Step2
            mm={mm}
            view={search.view}
            dialog={search.dialog}
            amount={search.amount}
            accountId={search.account_id}
          />
        )}
        {stepNum === 3 && (
          <Step3
            mm={mm}
            safeguards={search.safeguards}
            loss={search.loss}
            amount={search.amount}
            accountId={search.account_id}
          />
        )}
        {stepNum === 4 && (
          <Step4
            mm={mm}
            amount={search.amount}
            safeguards={search.safeguards}
            loss={search.loss}
            accountId={search.account_id}
          />
        )}
      </main>
    </div>
  );
}

// ============ STEP 1: Account ============
function Step1({ mm, view }: { mm: MoneyManagerView; view?: string }) {
  const params = { strategyId: mm.id, step: "step-1" };
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { data: accounts = [] } = useMyAccountsQuery();
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  if (view === "consent") {
    return (
      <>
        <StrategyCard mm={mm} />
        <div className="bg-[#F0F4FF] rounded-2xl p-6 flex gap-4 mb-6">
          <Lock className="w-7 h-7 text-[#2563EB] flex-shrink-0" />
          <div>
            <h3 className="font-bold text-gray-900 mb-1">
              You are leaving this site and going to PCX.
            </h3>
            <p className="text-sm text-gray-600">
              Please make sure the destination is my.pcxfx.com. This ensures your data and
              transactions remain secure within the official PCX portal.
            </p>
          </div>
        </div>
        <div className="border border-gray-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#2563EB]" />
              </div>
              <h4 className="font-bold text-gray-900">You'll continue in PCX</h4>
            </div>
            <p className="text-xs font-semibold text-gray-500 tracking-wider mb-2">DESTINATION</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">my.pcxfx.com</span>
              </div>
              <Copy className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <ul className="space-y-3">
            {[
              "You will create a dedicated trading account in PCX",
              "The account will be linked back automatically",
              "You can add funds after the account is ready",
              "You will return here to complete the setup",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" strokeWidth={3} />{" "}
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-4">
          <Link
            to="/strategies/$strategyId/$step"
            params={params}
            search={{}}
            className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
          >
            ← Back
          </Link>
          <Link
            to="/strategies/$strategyId/$step"
            params={params}
            search={{ view: "creating" }}
            className="flex-1 py-4 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90"
            style={{ backgroundColor: "#2563EB" }}
          >
            Continue to PCX →
          </Link>
        </div>
      </>
    );
  }

  if (view === "creating") {
    return (
      <>
        <div className="bg-[#F0F4FF] rounded-2xl p-6 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-[#2563EB] animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Waiting for your account to be ready...</h3>
            <p className="text-sm text-gray-600">
              Do not close this page. We'll automatically detect when your PCX account is ready.
            </p>
          </div>
        </div>
        <div className="border border-gray-200 rounded-2xl p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
          <div>
            <h4 className="font-bold text-gray-900 mb-5">What happens next?</h4>
            <ul className="space-y-5">
              {[
                "You're creating your dedicated trading account in PCX",
                "Once your account is ready, it will be linked back automatically",
                "You can add funds in the next step",
                "You'll continue with risk settings and final review",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="w-6 h-6 rounded-full border-2 border-[#2563EB] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={3} />
                  </div>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-[#F8FAFF] to-[#EEF2FF] rounded-2xl p-8 flex flex-col items-center justify-center">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xs text-center">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900">PCX</span>
              </div>
              <div className="w-20 h-20 mx-auto mb-3 rounded-full border-4 border-[#2563EB] border-t-transparent animate-spin flex items-center justify-center">
                <Check className="w-8 h-8 text-[#2563EB]" />
              </div>
              <p className="font-semibold text-gray-900">Creating your account...</p>
              <p className="text-xs text-gray-500 mt-1">This may take up to 30 seconds</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F0F4FF] rounded-2xl p-5 flex items-center justify-between mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#2563EB] mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 text-sm">Having trouble?</p>
              <p className="text-sm text-gray-600">
                If the page doesn't update after a while, make sure your account creation is
                completed in PCX.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg border border-[#2563EB] text-[#2563EB] text-sm font-semibold inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh status
          </button>
        </div>
        <div className="flex justify-center">
          <Link
            to="/strategies/$strategyId/$step"
            params={params}
            search={{ view: "consent" }}
            className="px-12 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </Link>
        </div>
      </>
    );
  }

  if (view === "select") {
    return (
      <>
        <StrategyCard mm={mm} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 border border-gray-200 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-6">Account Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center md:pr-2">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                  <Shield className="w-8 h-8 text-[#2563EB]" />
                </div>
                <p className="font-bold text-gray-900 text-sm mb-2 leading-snug">
                  You have a dedicated PCX account
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Use one of your existing linked PCX accounts to continue this setup.
                </p>
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">Select your PCX account</p>
                  <AccountCountBadge />
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Choose the linked account you want to use for this strategy.
                </p>
                <AccountDropdown onSelectionChange={setSelectedAccountId} />
                <p className="text-xs text-gray-500 mt-2">Click to view other linked accounts.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <InfoRow
                icon={<CreditCard className="w-5 h-5 text-[#2563EB]" />}
                title={`Current balance is ${formatBalance(selectedAccount?.balance, selectedAccount?.currency)}.`}
                desc="You'll be able to add funds in the next step."
              />
              <InfoRow
                icon={<RefreshCw className="w-5 h-5 text-[#2563EB]" />}
                title="This account will only start following the strategy"
                desc="after the final confirmation step."
              />
            </div>
          </div>
          <SidePanel />
        </div>
        {selectedAccountId ? (
          <ContinueLink
            to="/strategies/$strategyId/$step"
            params={{ strategyId: mm.id, step: "step-2" }}
            search={{ account_id: selectedAccountId }}
            label="Continue"
          />
        ) : (
          <button
            type="button"
            disabled
            className="block w-full py-4 rounded-xl text-white text-sm font-semibold text-center opacity-60 cursor-not-allowed"
            style={{ backgroundColor: "#2563EB" }}
          >
            Continue
          </button>
        )}
      </>
    );
  }

  // Default view: intro
  return (
    <>
      <StrategyCard mm={mm} />
      <div className="bg-gradient-to-br from-[#EEF4FF] to-[#F8FAFF] rounded-2xl p-8 flex items-center gap-6 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
          <Shield className="w-7 h-7 text-[#2563EB]" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg mb-2">Dedicated PCX Account Required</h3>
          <p className="text-gray-600 text-sm">
            To copy {mm.name}, you need a dedicated PCX trading account. This account will be
            created in PCX and linked back to this strategy automatically.
          </p>
        </div>
        <div className="hidden md:block flex-shrink-0">
          <img
            src={step1Illustration}
            alt="Dedicated account illustration"
            className="w-28 h-auto"
          />
        </div>
      </div>
      <div className="border border-gray-200 rounded-2xl p-6 mb-6">
        <h4 className="font-bold text-gray-900 mb-5">Why is this needed?</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Lock className="w-5 h-5 text-[#2563EB]" />,
              t: "Separate & Secure",
              d: "Keeps your copy trading activity separate from your other trading accounts.",
            },
            {
              icon: <Shield className="w-5 h-5 text-[#2563EB]" />,
              t: "Better Risk Management",
              d: "Easier to manage funds, risk settings, and strategy performance.",
            },
            {
              icon: <Check className="w-5 h-5 text-[#2563EB]" />,
              t: "Used Only for This Strategy",
              d: `This dedicated account will be used exclusively for ${mm.name}.`,
            },
          ].map((it) => (
            <div key={it.t}>
              <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center mb-3">
                {it.icon}
              </div>
              <p className="font-bold text-gray-900 text-sm mb-1">{it.t}</p>
              <p className="text-sm text-gray-500">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <Link
          to="/dashboard/strategies"
          className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
        >
          ← Back To Strategy
        </Link>
        <Link
          to="/strategies/$strategyId/$step"
          params={params}
          search={{ view: "consent" }}
          className="flex-1 py-4 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90"
          style={{ backgroundColor: "#2563EB" }}
        >
          Create Account
        </Link>
      </div>
    </>
  );
}

// ============ STEP 2: Funds ============
function Step2({
  mm,
  view,
  dialog,
  amount,
  accountId,
}: {
  mm: any;
  view?: string;
  dialog?: string;
  amount?: number;
  accountId?: string;
}) {
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useMyAccountsQuery();
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;

  // balanceKnown gates the displayed number and status badge so we don't
  // flash the URL `amount` param as a fake balance while the accounts
  // query is still in-flight. URL `amount` is the requested deposit
  // amount, not the account balance.
  const balanceKnown = !accountId || (!accountsLoading && selectedAccount !== null);
  const accountBalance = selectedAccount?.balance;
  const currentAmount = !accountId
    ? (amount ?? 0)
    : typeof accountBalance === "number"
      ? accountBalance
      : 0;
  const accountCurrency = selectedAccount?.currency ?? "USD";
  const accountLabelText = selectedAccount
    ? `ACCOUNT #${selectedAccount.number ?? selectedAccount.id.slice(0, 6)}`
    : "ACCOUNT —";
  const minRequired = 10;
  const isSuccess = balanceKnown && currentAmount >= minRequired;
  const depositPending = balanceKnown && view === "success" && currentAmount < minRequired;
  // Demo accounts can't fund a live follow flow — Step-3 follow API will
  // reject them anyway, so block the Continue here too.
  const isDemoAccount =
    selectedAccount?.type === "demo" || selectedAccount?.account_type?.can_deposit === false;

  // After returning from PCX (view=success), refetch accounts so the
  // displayed balance reflects the just-completed deposit if PCX has
  // already pushed it to Batman.
  useEffect(() => {
    if (view === "success") refetchAccounts();
  }, [view, refetchAccounts]);

  return (
    <>
      <StrategyCard mm={mm} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Allocate Funds</h3>
            <p className="text-sm text-gray-500 mb-5">
              Your available balance will be used to copy this strategy automatically.
            </p>
            <div
              className={`border-2 rounded-2xl p-6 ${
                !balanceKnown
                  ? "border-gray-100"
                  : isSuccess
                    ? "border-[#10B981]"
                    : depositPending
                      ? "border-[#FCD34D]"
                      : currentAmount < minRequired
                        ? "border-[#FCA5A5]"
                        : "border-gray-200"
              }`}
            >
              <p className="text-xs font-semibold text-gray-500 tracking-wider mb-2">
                AVAILABLE BALANCE · {accountLabelText}
                {selectedAccount && (
                  <span className="ml-2 inline-block">
                    <TypeBadge type={selectedAccount.type} />
                  </span>
                )}
              </p>
              <div className="flex items-center justify-between mb-2">
                {balanceKnown ? (
                  <p className="text-4xl font-bold text-gray-900">
                    {formatBalance(currentAmount, accountCurrency)}
                  </p>
                ) : (
                  <span
                    aria-busy
                    aria-label="Loading balance"
                    className="inline-block h-10 w-40 rounded bg-gray-100 animate-pulse"
                  />
                )}
                <Link
                  to="/strategies/$strategyId/$step"
                  params={{ strategyId: mm.id, step: "step-2" }}
                  search={{ dialog: "add-funds", amount: currentAmount, account_id: accountId }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" /> Top Up
                </Link>
              </div>
              {!balanceKnown ? (
                <p className="text-sm text-gray-400">Loading account…</p>
              ) : isSuccess ? (
                <div className="flex items-center gap-2 text-[#10B981] text-sm font-semibold">
                  <Check className="w-4 h-4" /> Minimum requirement met
                  <span className="text-gray-500 font-normal">You are ready to continue.</span>
                </div>
              ) : depositPending ? (
                <div className="flex items-center justify-between gap-2 text-[#B45309] text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Deposit pending — waiting for PCX to confirm
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchAccounts()}
                    className="text-xs font-semibold text-[#B45309] hover:underline"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#DC2626]">
                    Minimum required: ${minRequired}
                  </p>
                  <p className="text-xs text-[#DC2626]">
                    You need ${minRequired - currentAmount} more to continue
                  </p>
                </>
              )}
            </div>
          </div>
          <InfoRow
            icon={<CreditCard className="w-5 h-5 text-gray-400" />}
            title="Have funds in another account?"
            desc="You can transfer funds from another broker account."
            action="Transfer"
          />
          <div className="bg-[#F0F4FF] rounded-xl p-5 flex gap-3">
            <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-bold text-xs text-[#2563EB] tracking-wider mb-1">
                {isSuccess ? "AUTOMATIC ALLOCATION" : "HOW YOUR BALANCE IS USED"}
              </p>
              <p>
                {isSuccess
                  ? "All available balance in your selected account will automatically be used for copy trading this strategy."
                  : "Your selected account balance will be used to mirror this strategy based on your chosen risk settings."}
              </p>
            </div>
          </div>
          <div className="bg-[#F8FAFC] rounded-xl p-5 flex gap-3">
            <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-bold text-xs text-[#2563EB] tracking-wider mb-1">
                BROKER ACTIVITY DISCLAIMER
              </p>
              <p>
                Financial activity shown here is displayed from your broker account for reference
                only. Transactions do not take place on this page, including deposits and other
                broker-side actions.
              </p>
            </div>
          </div>
        </div>
        <SidePanel summary={{ amount: currentAmount, ready: isSuccess }} accountId={accountId} />
      </div>

      <div className="flex gap-4">
        <Link
          to="/strategies/$strategyId/$step"
          params={{ strategyId: mm.id, step: "step-1" }}
          search={{ view: "select" }}
          className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
        >
          ← Back
        </Link>
        {isDemoAccount ? (
          <button
            type="button"
            disabled
            title="Demo accounts can't follow live strategies. Pick a live account in step 1."
            className="flex-1 py-4 rounded-xl text-white text-sm font-semibold text-center opacity-50 cursor-not-allowed"
            style={{ backgroundColor: "#2563EB" }}
          >
            Continue
          </button>
        ) : isSuccess ? (
          <Link
            to="/strategies/$strategyId/$step"
            params={{ strategyId: mm.id, step: "step-3" }}
            search={{ amount: currentAmount, account_id: accountId }}
            className="flex-1 py-4 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90"
            style={{ backgroundColor: "#2563EB" }}
          >
            Continue
          </Link>
        ) : (
          <Link
            to="/strategies/$strategyId/$step"
            params={{ strategyId: mm.id, step: "step-2" }}
            search={{ dialog: "add-funds", amount: currentAmount, account_id: accountId }}
            className="flex-1 py-4 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90"
            style={{ backgroundColor: "#2563EB" }}
          >
            Add Funds to Continue
          </Link>
        )}
      </div>
      {isDemoAccount && (
        <p className="mt-3 text-xs text-[#B45309] text-center">
          Demo accounts can't follow live strategies.{" "}
          <Link
            to="/strategies/$strategyId/$step"
            params={{ strategyId: mm.id, step: "step-1" }}
            search={{ view: "select" }}
            className="font-semibold underline hover:text-[#92400E]"
          >
            Pick a live account in step 1
          </Link>
          .
        </p>
      )}

      {dialog === "add-funds" && <AddFundsDialog mm={mm} accountId={accountId} />}
      {dialog === "waiting" && <WaitingDialog mm={mm} accountId={accountId} />}
    </>
  );
}

// ============ STEP 3: Risk ============
function Step3({
  mm,
  safeguards,
  loss,
  amount,
  accountId,
}: {
  mm: any;
  safeguards?: boolean;
  loss?: number;
  amount?: number;
  accountId?: string;
}) {
  const navigate = useNavigate();
  const [on, setOn] = useState(safeguards ?? false);
  const [lossPct, setLossPct] = useState(loss ?? 30);
  const { data: step3Accounts = [] } = useMyAccountsQuery();
  const step3Account = accountId ? step3Accounts.find((a) => a.id === accountId) : undefined;
  const equity =
    typeof step3Account?.balance === "number" ? step3Account.balance : (amount ?? 10000);
  const stopBelow = equity - (equity * lossPct) / 100;

  // Demo accounts cannot follow (no real money to risk-cap or copy with).
  // Detect via account.type === "demo" OR account_type.can_deposit === false.
  const isDemoAccount =
    step3Account?.type === "demo" || step3Account?.account_type?.can_deposit === false;

  const [followError, setFollowError] = useState<string | null>(null);
  const continueMutation = useMutation({
    mutationFn: async () => {
      if (!mm.money_manager_id) {
        throw new Error("Money manager id is missing. Please reload the page.");
      }
      if (!accountId) {
        throw new Error("No account selected. Pick an account in step 1.");
      }
      const followee = await toggleFollow({
        money_manager_id: mm.money_manager_id,
        investor_account_id: accountId,
      });
      if (on) await setFollowRisk(followee.id, lossPct);
      return followee;
    },
    onSuccess: (followee) => {
      console.info("[follow] toggled + risk set:", {
        followee_id: followee.id,
        status: followee.status,
        max_loss_pct: on ? lossPct : null,
      });
      navigate({
        to: "/strategies/$strategyId/$step",
        params: { strategyId: mm.id, step: "step-4" },
        search: { amount: equity, safeguards: on, loss: lossPct, account_id: accountId },
      });
    },
    onError: (err) => {
      console.error("[follow] continue failed:", err);
      if (err instanceof ApiError) {
        if (err.status === 422) {
          setFollowError(err.message || "Can't follow with this account.");
        } else if (err.status === 403) {
          setFollowError("You don't have permission to use this account.");
        } else if (err.status === 404) {
          setFollowError("Follow record not found. Please try again.");
        } else if (err.status === 400) {
          setFollowError(err.message || "Invalid request. Please reload and try again.");
        } else {
          setFollowError(err.message);
        }
      } else {
        setFollowError(err instanceof Error ? err.message : "Failed to start following");
      }
    },
  });

  const handleContinue = () => {
    if (isDemoAccount || continueMutation.isPending) return;
    setFollowError(null);
    console.info("[follow] continue clicked:", {
      money_manager_id: mm.money_manager_id,
      investor_account_id: accountId,
      account_number: step3Account?.number,
      account_type: step3Account?.type,
      safeguards: on,
      max_loss_pct: on ? lossPct : null,
    });
    continueMutation.mutate();
  };

  return (
    <>
      <StrategyCard mm={mm} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Risk Settings</h3>
            <p className="text-sm text-gray-500 mb-5">
              Set your protection limit. Copying will stop automatically if losses reach this limit.
            </p>
          </div>
          <div className="border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 tracking-wider mb-1">
                CURRENT ACCOUNT EQUITY
              </p>
              <p className="text-2xl font-bold text-gray-900">${equity.toLocaleString()}.00</p>
            </div>
            <p className="text-xs text-gray-500 text-right max-w-[180px]">
              We'll use this to calculate your protection limit.
            </p>
          </div>

          <div
            className={`rounded-2xl p-5 ${on ? "bg-[#1E3A8A] text-white" : "border border-gray-200 bg-white"}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-bold ${on ? "text-white" : "text-gray-900"}`}>
                  Automated Safeguards
                </p>
                <p className={`text-sm ${on ? "text-blue-100" : "text-gray-500"}`}>
                  Apply your protection settings automatically.
                </p>
              </div>
              <Toggle on={on} onChange={setOn} />
            </div>
            {on && (
              <div className="pt-4 border-t border-blue-700">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-5 h-5 text-blue-200" />
                  <div className="flex-1">
                    <p className="font-bold text-white">Maximum Loss Limit</p>
                    <p className="text-sm text-blue-100">
                      Choose the maximum percentage of loss you're willing to allow.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-1">
                    <input
                      type="number"
                      value={lossPct}
                      onChange={(e) =>
                        setLossPct(Math.max(1, Math.min(100, parseInt(e.target.value) || 0)))
                      }
                      className="w-12 text-gray-900 font-bold text-center outline-none"
                    />
                    <span className="text-gray-500 font-bold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={lossPct}
                  onChange={(e) => setLossPct(parseInt(e.target.value))}
                  className="w-full accent-white"
                />
                <div className="flex justify-between text-xs text-blue-100 mt-1">
                  <span>0%</span>
                  <span>Use the slider or enter an exact percentage.</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>

          {!on ? (
            <>
              <div className="border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      Copying will continue without a protection limit.
                    </p>
                    <p className="text-xs text-gray-500">
                      No automatic stop-below-equity protection will apply.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded">
                  NO MAXIMUM LOSS
                </span>
              </div>
              <div className="bg-[#F0F4FF] rounded-xl p-4 flex gap-3 text-sm text-gray-700">
                <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0" />
                You can continue without safeguards. Keep in mind, no automatic stop-below-equity
                protection will apply.
              </div>
            </>
          ) : (
            <>
              <div className="border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <p className="text-xs text-gray-500">Copying stops below equity</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${stopBelow.toLocaleString()}.00
                    </p>
                    <p className="text-xs text-gray-500">
                      Based on your current equity of ${equity.toLocaleString()}.00.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#2563EB] border border-[#2563EB] px-3 py-1.5 rounded">
                  {lossPct}% MAXIMUM LOSS
                </span>
              </div>
              <div className="bg-[#F0F4FF] rounded-xl p-4 flex gap-3 text-sm text-gray-700">
                <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0" />
                If your equity falls to ${stopBelow.toLocaleString()}.00 ({lossPct}% loss), copying
                will stop automatically.
              </div>
            </>
          )}

          <div className="bg-[#F8FAFC] rounded-xl p-4 flex gap-3 text-sm text-gray-700">
            <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-[#2563EB] tracking-wider mb-1">
                RISK PROTECTION DISCLAIMER
              </p>
              <p>
                These settings help limit losses for this copy trading strategy, but they do not
                guarantee protection. You can change or stop copying anytime.
              </p>
            </div>
          </div>
        </div>
        <SidePanel
          accountId={accountId}
          summary={{
            amount: equity,
            ready: true,
            protection: on ? `${lossPct}% maximum loss` : "OFF",
            stopBelow: on ? `$${stopBelow.toLocaleString()}.00` : "Not set",
            riskWarning: !on,
          }}
        />
      </div>
      <div className="flex gap-4">
        <Link
          to="/strategies/$strategyId/$step"
          params={{ strategyId: mm.id, step: "step-2" }}
          search={{ view: "success", amount: equity, account_id: accountId }}
          className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
        >
          ← Back
        </Link>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isDemoAccount || equity <= 0 || continueMutation.isPending}
          title={
            isDemoAccount
              ? "Demo accounts can't follow live strategies. Pick a live account."
              : equity <= 0
                ? "Current equity is 0. Add funds before continuing."
                : undefined
          }
          className="flex-1 py-4 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#2563EB" }}
        >
          {continueMutation.isPending ? "Submitting…" : "Continue"}
        </button>
      </div>

      {isDemoAccount && (
        <p className="mt-3 text-xs text-[#B45309] text-center">
          Demo accounts can't follow live strategies.{" "}
          <Link
            to="/strategies/$strategyId/$step"
            params={{ strategyId: mm.id, step: "step-1" }}
            search={{ view: "select" }}
            className="font-semibold underline hover:text-[#92400E]"
          >
            Pick a live account in step 1
          </Link>
          .
        </p>
      )}
      {!isDemoAccount && equity <= 0 && (
        <p className="mt-3 text-xs text-[#B45309] text-center">
          Current equity is 0.{" "}
          <Link
            to="/strategies/$strategyId/$step"
            params={{ strategyId: mm.id, step: "step-2" }}
            search={{ amount: equity, account_id: accountId }}
            className="font-semibold underline hover:text-[#92400E]"
          >
            Go back to step 2 and add funds
          </Link>{" "}
          before continuing.
        </p>
      )}

      {followError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-in fade-in"
          onClick={() => setFollowError(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Couldn't continue</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 break-words">{followError}</p>
            <button
              type="button"
              onClick={() => setFollowError(null)}
              className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ============ STEP 4: Review ============
function Step4({
  mm,
  amount,
  safeguards,
  loss,
  accountId,
}: {
  mm: any;
  amount?: number;
  safeguards?: boolean;
  loss?: number;
  accountId?: string;
}) {
  const { data: step4Accounts = [] } = useMyAccountsQuery();
  const step4Account = accountId ? step4Accounts.find((a) => a.id === accountId) : undefined;
  const equity =
    typeof step4Account?.balance === "number" ? step4Account.balance : (amount ?? 10000);
  const equityCurrency = step4Account?.currency ?? "USD";
  return (
    <>
      <StrategyCard mm={mm} />
      <div className="border border-gray-200 rounded-2xl p-8 mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Review your setup</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <ReviewItem label="Strategy" value={mm.name} />
          <ReviewItem
            label="Account"
            value={
              step4Account
                ? `PCX Account #${step4Account.number ?? step4Account.id.slice(0, 6)}`
                : "PCX Account —"
            }
            badge="Ready"
          />
          <ReviewItem label="Available Balance" value={formatBalance(equity, equityCurrency)} />
          <ReviewItem
            label="Risk Protection"
            value={safeguards ? `${loss}% maximum loss` : "Off"}
          />
        </dl>
        <div className="bg-[#F0F4FF] rounded-xl p-4 flex gap-3 text-sm text-gray-700">
          <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0" />
          By confirming, your account will start copy trading {mm.name} automatically. You can stop
          anytime from your dashboard.
        </div>
      </div>
      <div className="flex gap-4">
        <Link
          to="/strategies/$strategyId/$step"
          params={{ strategyId: mm.id, step: "step-3" }}
          search={{ amount: equity, safeguards, loss, account_id: accountId }}
          className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
        >
          ← Back
        </Link>
        <Link
          to="/dashboard/strategies"
          className="flex-1 py-4 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90"
          style={{ backgroundColor: "#2563EB" }}
        >
          Confirm & Start Copying
        </Link>
      </div>
    </>
  );
}

// ============ Helpers ============
function accountLabel(a: MyAccount): string {
  const nick = a.nickname?.trim();
  if (nick) return nick;
  if (typeof a.number === "number") return `#${a.number}`;
  return "Account";
}

function formatBalance(value?: number, currency?: string): string {
  const amount = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const code = (currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

function TypeBadge({ type }: { type: AccountTypeKey }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2563EB] bg-[#EEF2FF] px-1.5 py-0.5 rounded whitespace-nowrap">
      {ACCOUNT_TYPE_LABEL[type]}
    </span>
  );
}

function useMyAccountsQuery() {
  return useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: getPcxAccounts,
    select: flattenAccounts,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

function AccountCountBadge() {
  const { data } = useMyAccountsQuery();
  const total = data?.length ?? 0;
  if (!total) return null;
  return (
    <span className="text-[10px] font-semibold text-[#2563EB] bg-[#EEF2FF] px-2 py-1 rounded whitespace-nowrap">
      {total} linked {total === 1 ? "account" : "accounts"}
    </span>
  );
}

function AccountDropdown({
  onSelectionChange,
}: {
  onSelectionChange?: (accountId: string | null) => void;
}) {
  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useMyAccountsQuery();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleRefresh = () => {
    if (!isFetching) refetch();
  };

  useEffect(() => {
    if (selectedId || accounts.length === 0) return;
    setSelectedId(accounts[0].id);
  }, [accounts, selectedId]);

  useEffect(() => {
    onSelectionChange?.(selectedId);
  }, [selectedId, onSelectionChange]);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  if (isLoading) {
    return <div className="h-14 bg-gray-50 rounded-xl border-2 border-gray-100 animate-pulse" />;
  }

  if (isError) {
    return (
      <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
        <span>{error instanceof Error ? error.message : "Failed to load accounts."}</span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="underline font-semibold flex-shrink-0 disabled:opacity-60"
        >
          {isFetching ? "Retrying..." : "Retry"}
        </button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div>
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label={isFetching ? "Refreshing accounts" : "Refresh accounts"}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#EEF2FF] text-[#2563EB] text-xs font-semibold hover:bg-[#2563EB] hover:text-white transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing" : "Refresh"}
          </button>
        </div>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-3">You don't have any active accounts yet.</p>
          <button
            type="button"
            onClick={() => {
              if (USE_MOCKS) {
                handleRefresh();
                return;
              }
              window.open(PCX_VERIFICATION_URL, "_blank", "noopener,noreferrer");
            }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB] hover:underline"
          >
            Open account on PCX <Building2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border-2 border-[#2563EB] rounded-xl px-4 py-3 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Building2 className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">
            {selected ? accountLabel(selected) : "Select an account"}
          </span>
          {selected && <TypeBadge type={selected.type} />}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setSelectedId(a.id);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-sm hover:bg-gray-50 ${selectedId === a.id ? "bg-[#F0F4FF]" : ""}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                <div className="flex flex-col min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{accountLabel(a)}</span>
                    <TypeBadge type={a.type} />
                  </div>
                  {a.platform?.type && (
                    <span className="text-[11px] text-gray-500 truncate">{a.platform.type}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatBalance(a.balance, a.currency)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: string;
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      {action && <button className="text-[#2563EB] font-semibold text-sm">{action} ›</button>}
    </div>
  );
}

function ReviewItem({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 tracking-wider mb-1">{label.toUpperCase()}</dt>
      <dd className="font-bold text-gray-900 flex items-center gap-2">
        {value}
        {badge && (
          <span className="text-xs font-semibold text-[#10B981] bg-[#D1FAE5] px-2 py-0.5 rounded">
            {badge}
          </span>
        )}
      </dd>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-14 h-7 rounded-full relative transition-colors ${on ? "bg-[#2563EB]" : "bg-gray-300"}`}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-7" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function SidePanel({
  summary,
  accountId,
}: {
  summary?: {
    amount: number;
    ready: boolean;
    protection?: string;
    stopBelow?: string;
    riskWarning?: boolean;
  };
  accountId?: string;
}) {
  const { data: accounts = [] } = useMyAccountsQuery();
  const account = accountId ? (accounts.find((a) => a.id === accountId) ?? null) : null;
  const accountNumberText = account
    ? `PCX Account #${account.number ?? account.id.slice(0, 6)}`
    : "PCX Account —";
  const currency = account?.currency ?? "USD";

  return (
    <aside className="border border-gray-200 rounded-2xl p-6 h-fit">
      <h3 className="font-bold text-gray-900 mb-5">{summary ? "Setup Summary" : "How it works"}</h3>
      {summary ? (
        <dl className="space-y-3 text-sm mb-5">
          <Row
            label="Account"
            value={
              <span className="inline-flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1.5">
                  {account && <TypeBadge type={account.type} />}
                  {summary.ready && (
                    <span className="text-[10px] font-semibold text-[#10B981] bg-[#D1FAE5] px-1.5 py-0.5 rounded">
                      Ready
                    </span>
                  )}
                </span>
                <span>{accountNumberText}</span>
              </span>
            }
          />
          <Row label="Available Balance" value={formatBalance(summary.amount, currency)} />
          <Row label="Minimum Required" value="$10" />
          {summary.protection && <Row label="Protection Limit" value={summary.protection} />}
          {summary.stopBelow && <Row label="Stop Below Equity" value={summary.stopBelow} />}
          {!summary.protection && (
            <Row label="Risk" value={<span className="text-gray-400">Not set yet</span>} />
          )}
        </dl>
      ) : (
        <ul className="space-y-4 text-sm mb-5">
          {[
            { t: "Profit sharing", d: "You only pay when there is new profit." },
            {
              t: "High-Water Mark",
              d: "Fees apply only to profits above your previous highest profit level.",
            },
            { t: "Weekly calculation", d: "Profit sharing is calculated on a weekly basis." },
            {
              t: "No profit, no charge",
              d: "If there is no new profit, no profit share is charged.",
            },
            {
              t: "You stay in control",
              d: "The selected account is only connected at the final confirmation step.",
            },
          ].map((it) => (
            <li key={it.t} className="flex gap-2">
              <Check className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">{it.t}</p>
                <p className="text-gray-500 text-xs">{it.d}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {summary?.riskWarning && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 flex gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-gray-900">Risk protection is not enabled.</p>
            <p className="text-gray-600">
              Copying will continue without an automatic protection limit until you turn it on.
            </p>
          </div>
        </div>
      )}
      <div className="bg-[#F0F4FF] rounded-xl p-3 flex gap-2">
        <Shield className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          Only your linked broker account data is shown here. Deposits and transfers are completed
          with your broker.
        </p>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-bold text-gray-900 text-right">{value}</dd>
    </div>
  );
}

function ContinueLink({ to, params, search, label = "Continue", className }: any) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      className={
        className ??
        "block w-full py-4 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90"
      }
      style={className ? undefined : { backgroundColor: "#2563EB" }}
    >
      {label}
    </Link>
  );
}

// ============ Dialogs ============
const methodKey = (m: DepositMethod) => `${m.slug}__${m.currency[0] ?? ""}`;
const formatCurrency = (c: string) => c.toUpperCase().replace(/_/g, " ");
const PCX_IMAGE_BASE_URL = import.meta.env.VITE_PCX_IMAGE_BASE_URL ?? "https://my.pcxfx.com";

function AddFundsDialog({ mm, accountId }: { mm: any; accountId?: string }) {
  const navigate = useNavigate();
  const [amt, setAmt] = useState(10000);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedExtKey, setSelectedExtKey] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);
  const { data: dialogAccounts = [], isLoading: accountsLoading } = useMyAccountsQuery();
  const dialogAccount = accountId ? dialogAccounts.find((a) => a.id === accountId) : undefined;
  const dialogAccountLabel = dialogAccount
    ? `Account #${dialogAccount.number ?? dialogAccount.id.slice(0, 6)}`
    : "Account —";

  const canDeposit = dialogAccount?.account_type?.can_deposit !== false;
  const accountValidationMsg = !accountId
    ? "No account selected. Go back and pick one."
    : accountsLoading
      ? null
      : !dialogAccount
        ? "Selected account isn't linked to your profile. Please pick a valid account."
        : !canDeposit
          ? `This account (${dialogAccount.account_type?.name ?? dialogAccount.type ?? "demo"}) doesn't accept deposits. Pick a different account.`
          : null;
  const close = () =>
    navigate({
      to: "/strategies/$strategyId/$step",
      params: { strategyId: mm.id, step: "step-2" },
      search: { account_id: accountId },
    });

  const {
    data: methods,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["pcx-deposit-methods"],
    queryFn: getPcxDepositMethods,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const userCountry = getBatmanUser()?.country_code?.toUpperCase();
  const visibleMethods = useMemo(
    () =>
      (methods ?? []).filter((m) => {
        if (m.is_public === false) return false;
        if (userCountry && m.restricted_countries?.includes(userCountry)) return false;
        return true;
      }),
    [methods, userCountry],
  );

  useEffect(() => {
    if (selectedKey || !visibleMethods.length) return;
    setSelectedKey(methodKey(visibleMethods[0]));
  }, [visibleMethods, selectedKey]);

  const selectedMethod = useMemo(
    () => visibleMethods.find((m) => methodKey(m) === selectedKey) ?? null,
    [visibleMethods, selectedKey],
  );

  const extendedOptions = useMemo(
    () => (selectedMethod?.extended_methods ?? []).filter((em) => em.enabled !== false),
    [selectedMethod],
  );
  const extKey = (em: ExtendedMethod) => em.id ?? em.slug;
  const selectedExt = useMemo(
    () => extendedOptions.find((em) => extKey(em) === selectedExtKey) ?? null,
    [extendedOptions, selectedExtKey],
  );

  useEffect(() => {
    if (extendedOptions.length === 0) {
      if (selectedExtKey !== null) setSelectedExtKey(null);
      return;
    }
    if (!extendedOptions.some((em) => extKey(em) === selectedExtKey)) {
      setSelectedExtKey(extKey(extendedOptions[0]));
    }
  }, [extendedOptions, selectedExtKey]);

  const canContinue = Boolean(selectedMethod) && amt >= 10;

  const depositMutation = useMutation({ mutationFn: createPcxDeposit });

  const submitDeposit = () => {
    if (!accountId || !selectedMethod) return;
    if (!dialogAccount) {
      setDepositError(
        accountsLoading
          ? "Loading your accounts… please wait, then try again."
          : "Selected account isn't linked to your profile. Please pick a valid account.",
      );
      return;
    }
    if (!canDeposit) {
      setDepositError(
        `This account (${dialogAccount.account_type?.name ?? dialogAccount.type ?? "demo"}) doesn't accept deposits. Pick a different account.`,
      );
      return;
    }
    setDepositError(null);
    setPendingPaymentUrl(null);

    const integrationId =
      typeof selectedMethod.extra?.integration_id === "string"
        ? selectedMethod.extra.integration_id
        : "";
    if (!integrationId) {
      setDepositError(
        "This payment method is missing an integration_id. Please pick a different method or contact support.",
      );
      return;
    }

    const requestBody = {
      account_id: accountId,
      amount: amt,
      currency: selectedMethod.currency[0],
      method_id: selectedMethod.slug,
      integration_id: integrationId,
      ...(selectedExt ? { ext_merchant: selectedExt.slug } : {}),
    };
    console.info("[deposit] request POST /integrations/pcx/deposits:", requestBody);

    depositMutation.mutate(requestBody, {
      onSuccess: async (data) => {
        const next = data.next_action;
        console.info("[deposit] success:", {
          transaction_id: data.transaction_id,
          external_transaction_id: data.external_transaction_id,
          provider: data.provider,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          next_action_type: next?.type,
          next_action_redirect_url: next?.redirect_url,
          next_action_pending_url: next?.pending_url,
          next_action_widget_url: next?.widget_url,
          next_action_has_widget_data: Boolean(next?.widget_data),
        });
        const fallbackUrl = next?.redirect_url ?? next?.pending_url ?? next?.success_url ?? null;

        const navigateToWaiting = () =>
          navigate({
            to: "/strategies/$strategyId/$step",
            params: { strategyId: mm.id, step: "step-2" },
            search: {
              dialog: "waiting",
              amount: amt,
              method_id: selectedMethod?.slug,
              currency: selectedMethod?.currency[0],
              account_id: accountId,
            },
          });

        // Demo mode: the deposit is applied in-memory (balance already bumped),
        // so skip the external payment window entirely and show the waiting view.
        if (USE_MOCKS) {
          navigateToWaiting();
          return;
        }

        // NinjaCharge widget script auto-detects localhost as its OWN
        // dev environment (tries to load /widget/widget.css from us and
        // iframe http://localhost:9891). On localhost we can't make it
        // work, so skip the widget and use the URL fallback instead.
        // Access Batman via your machine's network IP (e.g.
        // http://192.168.1.6:8081) to test the widget locally.
        const isWidgetDevModeHost =
          typeof window !== "undefined" &&
          ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);

        if (
          next?.type === "widget" &&
          next.widget_url &&
          next.widget_data &&
          !isWidgetDevModeHost
        ) {
          try {
            await openNinjaChargeWidget(next.widget_url, next.widget_data);
            navigateToWaiting();
            return;
          } catch (e) {
            console.warn("[deposit] widget load failed, falling back to URL:", e);
            // fall through to URL fallback below
          }
        } else if (next?.type === "widget" && isWidgetDevModeHost) {
          console.info(
            "[deposit] Skipping NinjaCharge widget on localhost (script's " +
              "internal dev-mode check loads /widget/widget.css and " +
              "http://localhost:9891 which don't exist in Batman). " +
              "Falling back to pending_url. Access Batman via a non-localhost " +
              "hostname (e.g. http://192.168.1.6:8081) to test the widget.",
          );
        }

        // Hosted URL flow (type=redirect, OR widget skipped/failed). Try to
        // open in a new tab now; popup may be blocked because we're past
        // the user gesture — if so, expose a manual link below the error
        // banner so the user can click to continue.
        if (fallbackUrl) {
          const opened = window.open(fallbackUrl, "_blank", "noopener,noreferrer");
          if (!opened) {
            setPendingPaymentUrl(fallbackUrl);
            setDepositError("Browser blocked the payment tab. Click the button below to continue.");
            return;
          }
          navigateToWaiting();
          return;
        }
        setDepositError(
          "Deposit created, but no payment URL was returned. Please contact support.",
        );
        navigateToWaiting();
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const lower = (err.message || "").toLowerCase();
          if (lower.includes("can not deposit") || lower.includes("cannot deposit")) {
            setDepositError(
              "This account doesn't accept deposits (likely a demo or read-only account). Pick a different account.",
            );
          } else if (err.status === 401) {
            setDepositError("Your session expired. Please log in again.");
          } else if (err.status === 422) {
            setDepositError(err.message || "Invalid deposit details.");
          } else if (err.status === 400) {
            setDepositError(err.message || "Bad request. Check the amount and payment method.");
          } else if (err.status >= 500) {
            setDepositError("Deposit service temporarily unavailable. Please try again.");
          } else {
            setDepositError(err.message);
          }
        } else {
          setDepositError(err instanceof Error ? err.message : "Failed to initiate deposit");
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 relative my-8">
        <button
          onClick={close}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-gray-900 text-lg mb-1">Add Funds</h3>
        <p className="text-sm text-gray-500 mb-5">
          Enter the amount you want to add to your PCX account.
        </p>
        <div className="bg-[#F8FAFC] rounded-xl p-4 flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-500">
              Current available balance · {dialogAccountLabel}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatBalance(dialogAccount?.balance, dialogAccount?.currency)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#2563EB]" />
          </div>
        </div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Amount</label>
        <div className="border-2 border-[#2563EB] rounded-xl px-4 py-3 flex items-center gap-2 mb-3">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            value={amt}
            onChange={(e) => setAmt(parseInt(e.target.value) || 0)}
            className="flex-1 outline-none text-lg font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {[10, 50, 100, 500, 1000].map((v) => (
            <button
              key={v}
              onClick={() => setAmt(v)}
              className="px-4 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-gray-50"
            >
              ${v}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-5">Minimum $10</p>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Method</label>
        <div className="space-y-3 mb-5">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-2 border-gray-100 rounded-xl p-4 h-16 bg-gray-50 animate-pulse"
              />
            ))}
          {isError && !isLoading && (
            <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
              <span>
                {error instanceof Error ? error.message : "Failed to load payment methods."}
              </span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="underline font-semibold flex-shrink-0 disabled:opacity-60"
              >
                {isFetching ? "Retrying..." : "Retry"}
              </button>
            </div>
          )}
          {!isLoading && !isError && visibleMethods.length === 0 && (
            <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-500 text-center">
              No deposit methods available right now.
            </div>
          )}
          {!isLoading &&
            !isError &&
            visibleMethods.map((m) => {
              const key = methodKey(m);
              const isSelected = selectedKey === key;
              return (
                <div key={key}>
                  <PaymentOption
                    selected={isSelected}
                    onClick={() => setSelectedKey(key)}
                    name={m.name}
                    sub={m.currency.map(formatCurrency).join(" · ")}
                    icon={
                      m.image_path ? (
                        <img
                          src={`${PCX_IMAGE_BASE_URL}${m.image_path}`}
                          alt={m.name}
                          className="w-6 h-6 object-contain"
                        />
                      ) : (
                        m.name.charAt(0)
                      )
                    }
                  />
                  {isSelected && extendedOptions.length > 0 && (
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-[#EEF2FF]">
                      <p className="text-[11px] font-semibold text-gray-500 tracking-wider mb-2">
                        SUB-OPTION
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {extendedOptions.map((em) => {
                          const key = extKey(em);
                          const active = key === selectedExtKey;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedExtKey(key)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                active
                                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB]"
                              }`}
                            >
                              {em.image_path && (
                                <img
                                  src={`${PCX_IMAGE_BASE_URL}${em.image_path}`}
                                  alt=""
                                  className="w-3.5 h-3.5 object-contain"
                                />
                              )}
                              {em.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
        <div className="bg-[#F0F4FF] rounded-xl p-3 flex gap-2 text-xs text-gray-600 mb-5">
          <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
          This form only collects your funding details. After you continue, this information will be
          sent securely to PCX.
        </div>
        {(depositError || accountValidationMsg) && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
            {depositError ?? accountValidationMsg}
          </div>
        )}
        {pendingPaymentUrl && (
          <a
            href={pendingPaymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-flex items-center justify-center w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#2563EB" }}
          >
            Continue to payment →
          </a>
        )}
        <div className="flex gap-3">
          <button
            onClick={close}
            disabled={depositMutation.isPending}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitDeposit}
            disabled={
              !canContinue || !!accountValidationMsg || accountsLoading || depositMutation.isPending
            }
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold text-center hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#2563EB" }}
          >
            {depositMutation.isPending ? "Processing..." : "Continue to PCX →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentOption({
  selected,
  onClick,
  icon,
  name,
  sub,
}: {
  selected?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  name: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left border-2 rounded-xl p-4 flex items-center gap-3 transition-colors ${
        selected ? "border-[#2563EB]" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />}
      </div>
      <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center font-bold flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
        {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
      </div>
    </button>
  );
}

function WaitingDialog({ mm, accountId }: { mm: any; accountId?: string }) {
  const navigate = useNavigate();
  const closeToStep2 = () =>
    navigate({
      to: "/strategies/$strategyId/$step",
      params: { strategyId: mm.id, step: "step-2" },
      search: { account_id: accountId },
    });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 relative text-center">
        <button
          onClick={closeToStep2}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 mx-auto mb-5 rounded-full border-4 border-[#2563EB] border-t-transparent animate-spin" />
        <h3 className="font-bold text-gray-900 text-xl mb-2">Waiting for PCX</h3>
        <p className="text-sm text-gray-500 mb-5">
          Complete your deposit in the PCX window. We'll update this page automatically once PCX
          confirms the process.
        </p>
        <div className="bg-[#F0F4FF] rounded-xl p-4 flex gap-3 text-left mb-4">
          <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0" />
          <p className="text-sm font-semibold text-gray-900">
            Do not close this page or the PCX window until your deposit is complete.
          </p>
        </div>
        <p className="text-xs text-gray-500 flex items-center justify-center gap-2 mb-5">
          <Shield className="w-4 h-4" /> Your funding details were sent securely to PCX.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={closeToStep2}
            className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold"
          >
            Cancel
          </button>
          <button className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh Status
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Available after confirmation</p>
      </div>
    </div>
  );
}
