/**
 * In-memory mock database for the frontend-only demo.
 *
 * A single mutable singleton holds all demo state. Service handlers read from
 * and mutate this store; because React Query keys are stable, the existing
 * `invalidateQueries` / `refetch` calls in components re-read the mutated store
 * and the UI advances on its own — so buttons & flows feel real.
 *
 * State is intentionally NOT persisted across reloads (a fresh reload resets to
 * the seeded starting state), except for an optional `demo_state` localStorage
 * hint used to jump straight into a given dashboard state for screenshots.
 */
import type { AccountDetail } from "@/services/accounts";
import type { Brokerage } from "@/services/brokerages";
import type {
  DepositMethod,
  PcxAccountsGrouped,
  TransactionResult,
} from "@/services/integrations";
import type { MoneyManager } from "@/services/money-managers";
import type { Followee, RiskSettings } from "@/services/follows";
import type { User } from "@/services/users";
import {
  buildAccounts,
  buildBrokerages,
  buildDefaultUser,
  buildDepositMethods,
  buildMoneyManagers,
  buildPcxAccounts,
} from "./fixtures";

export interface PcxProfileState {
  email_confirmed: boolean;
  kyc_approved: boolean;
}

export interface PcxStatusState {
  linked: boolean;
  kyc_approved: boolean;
  provider: string;
  linked_at?: string;
  external_user_id?: string;
}

export interface MockDB {
  currentUser: User;
  pcxProfile: PcxProfileState;
  pcxStatus: PcxStatusState;
  accounts: AccountDetail[];
  pcxAccounts: PcxAccountsGrouped;
  moneyManagers: MoneyManager[];
  brokerages: Brokerage[];
  depositMethods: DepositMethod[];
  savedIds: Set<string>;
  followees: Followee[];
  deposits: TransactionResult[];
  risk: Record<string, RiskSettings>;
}

let db: MockDB | null = null;

type DemoState = "not-connected" | "need-verify" | "need-following" | "followed";

function readDemoStateHint(): DemoState | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem("demo_state");
  if (v === "not-connected" || v === "need-verify" || v === "need-following" || v === "followed") {
    return v;
  }
  return null;
}

function freshDB(): MockDB {
  const next: MockDB = {
    currentUser: buildDefaultUser(),
    pcxProfile: { email_confirmed: false, kyc_approved: false },
    pcxStatus: { linked: false, kyc_approved: false, provider: "pcx" },
    accounts: buildAccounts(),
    pcxAccounts: buildPcxAccounts(),
    moneyManagers: buildMoneyManagers(),
    brokerages: buildBrokerages(),
    depositMethods: buildDepositMethods(),
    savedIds: new Set<string>(),
    followees: [],
    deposits: [],
    risk: {},
  };

  // Optional jump-to-state for screenshots / demos.
  const hint = readDemoStateHint();
  if (hint === "need-verify" || hint === "need-following" || hint === "followed") {
    next.pcxStatus.linked = true;
    next.pcxStatus.linked_at = new Date().toISOString();
  }
  if (hint === "need-following" || hint === "followed") {
    next.pcxProfile.email_confirmed = true;
    next.pcxProfile.kyc_approved = true;
    next.pcxStatus.kyc_approved = true;
  }
  if (hint === "followed") {
    const mm = next.moneyManagers[0];
    next.followees.push({
      id: "fol-seed-1",
      money_manager_id: mm.id,
      investor_id: next.currentUser.id,
      status: "active",
      created_at: new Date().toISOString(),
    });
  }
  return next;
}

export function getDB(): MockDB {
  if (!db) db = freshDB();
  return db;
}

export function resetStore(): void {
  db = freshDB();
}

// ──────────────────────────────────────────────────────────────────────────
// Lookups
// ──────────────────────────────────────────────────────────────────────────

/** Match a money manager by username, id, primary account id, or fall back. */
export function findMoneyManager(key: string): MoneyManager | undefined {
  const d = getDB();
  return (
    d.moneyManagers.find((m) => m.username === key) ||
    d.moneyManagers.find((m) => m.id === key) ||
    d.moneyManagers.find((m) => m.primary_account?.id === key)
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────────────────────────────────

export function linkPcx(): PcxStatusState {
  const d = getDB();
  d.pcxStatus.linked = true;
  d.pcxStatus.linked_at = new Date().toISOString();
  d.pcxStatus.external_user_id = "pcx-ext-demo-1";
  return d.pcxStatus;
}

/** The demo "verify now" action that flips KYC to approved. */
export function approveKyc(): void {
  const d = getDB();
  d.pcxProfile.email_confirmed = true;
  d.pcxProfile.kyc_approved = true;
  d.pcxStatus.kyc_approved = true;
}

export function setSaved(moneyManagerAccountId: string, saved: boolean): void {
  const d = getDB();
  if (saved) d.savedIds.add(moneyManagerAccountId);
  else d.savedIds.delete(moneyManagerAccountId);
  const mm = d.moneyManagers.find((m) => m.primary_account?.id === moneyManagerAccountId);
  if (mm) mm.is_saved = saved;
}

export function toggleFollow(moneyManagerId: string): Followee {
  const d = getDB();
  const existing = d.followees.find((f) => f.money_manager_id === moneyManagerId);
  if (existing) {
    existing.status = existing.status === "active" ? "inactive" : "active";
    existing.updated_at = new Date().toISOString();
    return existing;
  }
  const followee: Followee = {
    id: `fol-${moneyManagerId}-${d.followees.length + 1}`,
    money_manager_id: moneyManagerId,
    investor_id: d.currentUser.id,
    status: "active",
    created_at: new Date().toISOString(),
  };
  d.followees.push(followee);
  return followee;
}

export function setRisk(followeeId: string, maxLossPct: number): RiskSettings {
  const d = getDB();
  const risk: RiskSettings = {
    id: `risk-${followeeId}`,
    followee_id: followeeId,
    max_loss_pct: maxLossPct,
    updated_at: new Date().toISOString(),
  };
  d.risk[followeeId] = risk;
  const followee = d.followees.find((f) => f.id === followeeId);
  if (followee) followee.risk = risk;
  return risk;
}

export function applyDeposit(accountId: string, amount: number, currency: string): TransactionResult {
  const d = getDB();
  // bump the matching PCX/trading account balance so minimums are satisfied
  const trading = d.pcxAccounts.trading?.find((a) => a.id === accountId || String(a.number) === accountId);
  if (trading && typeof trading.balance === "number") trading.balance += amount;
  const local = d.accounts.find((a) => a.id === accountId || a.login === accountId);
  if (local && typeof local.balance === "number") local.balance += amount;

  const tx: TransactionResult = {
    transaction_id: `txn-${d.deposits.length + 1}`,
    provider: "pcx",
    amount,
    currency,
    status: "completed",
  };
  d.deposits.push(tx);
  return tx;
}

export function updateUser(patch: Partial<User>): User {
  const d = getDB();
  d.currentUser = { ...d.currentUser, ...patch, updated_at: new Date().toISOString() };
  return d.currentUser;
}
