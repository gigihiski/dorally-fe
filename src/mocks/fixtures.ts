/**
 * Seed data for the demo, shaped to the SERVICE/swagger types (NOT the loose
 * shapes in src/data/*). The display strategies in src/data/popularStrategies.ts
 * are reused as the source of names/returns, then mapped into the real
 * MoneyManager contract the components consume.
 */
import { popularStrategies } from "@/data/popularStrategies";
import type { AccountDetail } from "@/services/accounts";
import type { Brokerage } from "@/services/brokerages";
import type { DepositMethod, PcxAccount, PcxAccountsGrouped } from "@/services/integrations";
import type { MoneyManager } from "@/services/money-managers";
import type { User } from "@/services/users";

const nowIso = () => new Date().toISOString();

/** A money_manager_account_id per strategy, derived deterministically. */
export function mmAccountId(username: string): string {
  return `mm-acc-${username}`;
}

export function buildMoneyManagers(): MoneyManager[] {
  return popularStrategies.map((s, i) => {
    const username = s.id; // strategy id doubles as the public username in URLs
    return {
      id: `mm-${s.id}`,
      name: s.name,
      username,
      email: `${username}@dorally.demo`,
      avatar: undefined,
      status: "active",
      user_type: "money_manager",
      created_at: nowIso(),
      primary_account: {
        id: mmAccountId(username),
        login: String(700000 + i),
        currency: "USD",
      },
      profile: {
        account_id: mmAccountId(username),
        charge_on: "profit",
        fee_timing: "monthly",
        minimum_start: [50, 100, 200, 250, 500][i % 5],
        profit_sharing_fee_pct: [15, 20, 25, 30][i % 4],
        created_at: nowIso(),
        updated_at: nowIso(),
        id: `prof-${s.id}`,
      },
      performance: {
        this_month_return_pct: s.thisMonth,
        // biggest_drop_pct is a positive magnitude in the contract
        biggest_drop_pct: Math.abs(s.largestDrop),
        total_return_pct: Number((s.thisMonth * 3.2).toFixed(1)),
        winning_rate_pct: Math.min(95, 55 + (i % 7) * 5),
      },
      followers_count: 320 + i * 47,
      is_saved: false,
    };
  });
}

export function buildDefaultUser(): User {
  return {
    id: "user-demo-1",
    name: "Demo Investor",
    username: "demoinvestor",
    email: "demo@dorally.demo",
    phone: "+62 812 0000 0000",
    avatar: undefined,
    status: "active",
    user_type: "investor",
    country_code: "ID",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

/** The investor's own trading account(s) returned by /accounts/me. */
export function buildAccounts(): AccountDetail[] {
  return [
    {
      id: "acc-live-1",
      login: "5500123",
      name: "My Live Account",
      server: "PCX-Live",
      status: "active",
      balance: 1250.45,
      credit: 0,
      debit: 0,
      leverage: 100,
      investors_count: 0,
      currency: "USD",
      provider: "pcx",
      account_type: "trading",
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];
}

/** The PCX account groups returned by /integrations/pcx/accounts. */
export function buildPcxAccounts(): PcxAccountsGrouped {
  const trading: PcxAccount[] = [
    {
      id: "pcx-trading-1",
      number: 5500123,
      nickname: "Live USD",
      balance: 1250.45,
      currency: "USD",
      enabled: true,
      type: "trading",
      platform: { id: "mt5", type: "mt5" },
      account_type: { id: "live", name: "Live", type: "trading", can_deposit: true },
    },
  ];
  const demo: PcxAccount[] = [
    {
      id: "pcx-demo-1",
      number: 9900456,
      nickname: "Demo USD",
      balance: 10000,
      currency: "USD",
      enabled: true,
      type: "demo",
      platform: { id: "mt5", type: "mt5" },
      account_type: { id: "demo", name: "Demo", type: "demo", can_deposit: false },
    },
  ];
  return { trading, demo };
}

export function buildBrokerages(): Brokerage[] {
  return [
    {
      id: "pcx",
      name: "PrimeCodex (PCX)",
      server: "PCX-Live",
      description: "Connect your PrimeCodex trading account to start copy trading.",
      logo: undefined,
      status: "active",
      created_at: nowIso(),
    },
    {
      id: "coming-soon-1",
      name: "More brokers soon",
      description: "Additional brokers are coming soon.",
      status: "coming_soon",
      created_at: nowIso(),
    },
  ];
}

export function buildDepositMethods(): DepositMethod[] {
  return [
    {
      id: "card",
      slug: "card",
      name: "Credit / Debit Card",
      currency: ["USD"],
      is_public: true,
      extended_methods: [
        {
          id: "visa",
          slug: "visa",
          name: "Visa / Mastercard",
          currency: ["USD"],
          integration_id: "int-card",
          enabled: true,
        },
      ],
    },
    {
      id: "bank",
      slug: "bank-transfer",
      name: "Bank Transfer",
      currency: ["USD"],
      is_public: true,
      extended_methods: [
        {
          id: "wire",
          slug: "wire",
          name: "Wire Transfer",
          currency: ["USD"],
          integration_id: "int-bank",
          enabled: true,
        },
      ],
    },
  ];
}
