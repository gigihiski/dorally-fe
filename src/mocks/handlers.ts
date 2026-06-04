/**
 * Mock endpoint handlers. Each maps a "METHOD /path" to a function that reads or
 * mutates the in-memory store and returns `{ data, meta? }` — the exact envelope
 * the services expect (meta is a sibling of data at the top level).
 */
import { ApiError, type MetaData } from "@/lib/api";
import type { TokenResponse, RegisteredUser } from "@/services/auth";
import type { SavedCard, SavedMoneyManager } from "@/services/saved-money-managers";
import type { LinkResult, RegisterLiveResult } from "@/services/integrations";
import {
  applyDeposit,
  approveKyc,
  findMoneyManager,
  getDB,
  linkPcx,
  setRisk,
  setSaved,
  toggleFollow,
  updateUser,
} from "./store";

export interface HandlerCtx {
  params: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface HandlerResult {
  data?: unknown;
  meta?: MetaData;
}

export type Handler = (ctx: HandlerCtx) => HandlerResult;

export interface MockRoute {
  method: string;
  path: string;
  handler: Handler;
}

function token(): TokenResponse {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    access_token: `mock-${Math.random().toString(36).slice(2)}`,
    expires_at: expires,
    token_type: "bearer",
  };
}

function meta(total: number, page = 1, limit = 50): MetaData {
  return { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) };
}

function asBody<T>(body: unknown): T {
  return (body ?? {}) as T;
}

export const routes: MockRoute[] = [
  // ── Auth ────────────────────────────────────────────────────────────────
  { method: "POST", path: "/users/auth/login", handler: () => ({ data: token() }) },
  { method: "POST", path: "/users/auth/oauth/google", handler: () => ({ data: token() }) },
  {
    method: "POST",
    path: "/users/auth/forgot-password",
    handler: () => ({ data: { success: true } }),
  },
  {
    method: "POST",
    path: "/users",
    handler: ({ body }) => {
      const b = asBody<{ name?: string; email?: string; username?: string; user_type?: string }>(body);
      const user = updateUser({
        name: b.name,
        email: b.email,
        username: b.username,
        user_type: b.user_type,
      });
      const registered: RegisteredUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        status: user.status,
        user_type: user.user_type,
        created_at: user.created_at,
      };
      return { data: registered };
    },
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  { method: "GET", path: "/users/me", handler: () => ({ data: getDB().currentUser }) },
  {
    method: "PATCH",
    path: "/users/me",
    handler: ({ body }) => ({ data: updateUser(asBody(body)) }),
  },

  // ── Accounts ───────────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/accounts/me",
    handler: () => {
      const d = getDB();
      return { data: d.accounts, meta: meta(d.accounts.length) };
    },
  },

  // ── Brokerages ─────────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/brokerages",
    handler: ({ query }) => {
      const d = getDB();
      const status = query?.status as string | undefined;
      const list = status ? d.brokerages.filter((b) => b.status === status) : d.brokerages;
      return { data: list, meta: meta(list.length) };
    },
  },

  // ── Money managers ─────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/users/money-managers",
    handler: ({ query }) => {
      const d = getDB();
      const search = (query?.search as string | undefined)?.toLowerCase();
      let list = d.moneyManagers;
      if (search) {
        list = list.filter(
          (m) =>
            m.name.toLowerCase().includes(search) ||
            (m.username ? m.username.toLowerCase().includes(search) : false),
        );
      }
      // reflect saved state
      list.forEach((m) => {
        if (m.primary_account?.id) m.is_saved = d.savedIds.has(m.primary_account.id);
      });
      return { data: list, meta: meta(list.length) };
    },
  },
  {
    method: "GET",
    path: "/users/money-managers/:username",
    handler: ({ params }) => {
      const d = getDB();
      const mm = findMoneyManager(params.username) ?? d.moneyManagers[0];
      if (mm?.primary_account?.id) mm.is_saved = d.savedIds.has(mm.primary_account.id);
      return { data: mm };
    },
  },

  // ── Saved money managers ────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/me/saved-money-managers",
    handler: () => {
      const d = getDB();
      const cards: SavedCard[] = [];
      d.savedIds.forEach((accId) => {
        const mm = d.moneyManagers.find((m) => m.primary_account?.id === accId);
        if (!mm) return;
        cards.push({
          id: `saved-${accId}`,
          money_manager_account_id: accId,
          saved_at: new Date().toISOString(),
          account: {
            id: accId,
            login: mm.primary_account?.login,
            name: mm.name,
            server: "PCX-Live",
          },
          owner: {
            user_id: mm.id,
            username: mm.username,
            name: mm.name,
            avatar: mm.avatar,
          },
          profile: mm.profile,
          investors_count: mm.followers_count,
        });
      });
      return { data: cards, meta: meta(cards.length) };
    },
  },
  {
    method: "POST",
    path: "/me/saved-money-managers",
    handler: ({ body }) => {
      const b = asBody<{ money_manager_account_id: string }>(body);
      setSaved(b.money_manager_account_id, true);
      const saved: SavedMoneyManager = {
        id: `saved-${b.money_manager_account_id}`,
        investor_user_id: getDB().currentUser.id,
        money_manager_account_id: b.money_manager_account_id,
        created_at: new Date().toISOString(),
      };
      return { data: saved };
    },
  },
  {
    method: "DELETE",
    path: "/me/saved-money-managers/:id",
    handler: ({ params }) => {
      setSaved(params.id, false);
      return { data: { success: true } };
    },
  },

  // ── Follows ──────────────────────────────────────────────────────────────────
  {
    method: "POST",
    path: "/followees/me/toggle",
    handler: ({ body }) => {
      const b = asBody<{ money_manager_id: string }>(body);
      return { data: toggleFollow(b.money_manager_id) };
    },
  },
  {
    method: "GET",
    path: "/followees/me",
    handler: ({ query }) => {
      const d = getDB();
      const status = query?.status as string | undefined;
      const list = status ? d.followees.filter((f) => f.status === status) : d.followees;
      return { data: list };
    },
  },
  {
    method: "PUT",
    path: "/followees/me/:id/risk",
    handler: ({ params, body }) => {
      const b = asBody<{ max_loss_pct: number }>(body);
      return { data: setRisk(params.id, Number(b.max_loss_pct) || 0) };
    },
  },

  // ── PCX integration ──────────────────────────────────────────────────────────
  { method: "GET", path: "/integrations/pcx/profile", handler: () => ({ data: getDB().pcxProfile }) },
  { method: "GET", path: "/integrations/pcx/status", handler: () => ({ data: getDB().pcxStatus }) },
  {
    method: "GET",
    path: "/integrations/pcx/deposits/methods",
    handler: () => ({ data: { methods: getDB().depositMethods } }),
  },
  {
    method: "POST",
    path: "/integrations/pcx/deposits",
    handler: ({ body }) => {
      const b = asBody<{ account_id: string; amount: number; currency?: string }>(body);
      return { data: applyDeposit(b.account_id, Number(b.amount) || 0, b.currency || "USD") };
    },
  },
  { method: "GET", path: "/integrations/pcx/accounts", handler: () => ({ data: getDB().pcxAccounts }) },
  {
    method: "POST",
    path: "/integrations/pcx/link",
    handler: () => {
      const status = linkPcx();
      const result: LinkResult = {
        provider: "pcx",
        linked: true,
        linked_at: status.linked_at,
        external_user_id: status.external_user_id,
        kyc_approved: status.kyc_approved,
      };
      return { data: result };
    },
  },
  {
    // Demo-only endpoint: the local "Verify now (demo)" button flips KYC.
    method: "POST",
    path: "/integrations/pcx/verify-now",
    handler: () => {
      approveKyc();
      return { data: getDB().pcxProfile };
    },
  },
  {
    method: "POST",
    path: "/integrations/pcx/register-live",
    handler: () => {
      const result: RegisterLiveResult = { provider: "pcx", success: true };
      return { data: result };
    },
  },
  {
    method: "POST",
    path: "/integrations/pcx/register-demo",
    handler: () => {
      const result: RegisterLiveResult = { provider: "pcx", success: true };
      return { data: result };
    },
  },
];

export { ApiError };
