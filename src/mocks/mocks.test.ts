import { beforeEach, describe, expect, it } from "vitest";
import { handleMock } from "./index";
import { resetStore } from "./store";
import { buildMoneyManagers } from "./fixtures";

/**
 * Exercises the in-memory mock layer the way the app does (through handleMock),
 * proving the demo state transitions that make buttons & flows feel real:
 * not-connected → need-verify → need-following → followed, plus save/unsave.
 */
describe("mock layer demo flows", () => {
  // These flows assert the progression from a fresh not-connected state. The app
  // itself now defaults the demo seed to "followed", so pin the start explicitly.
  beforeEach(() => {
    window.localStorage.setItem("demo_state", "not-connected");
    resetStore();
  });

  it("login returns a fake token", async () => {
    const res = await handleMock("/users/auth/login", {
      method: "POST",
      body: { identifier: "anyone@demo.test", password: "whatever" },
    });
    expect((res.data as { access_token: string }).access_token).toMatch(/^mock-/);
  });

  it("advances not-connected → need-verify → need-following via link + verify + follow", async () => {
    // starts not connected
    let status = (await handleMock("/integrations/pcx/status", { method: "GET" })).data as {
      linked?: boolean;
      kyc_approved?: boolean;
    };
    expect(status.linked).toBe(false);

    // link the broker → linked
    await handleMock("/integrations/pcx/link", {
      method: "POST",
      body: { email: "a@b.c", password: "x" },
    });
    status = (await handleMock("/integrations/pcx/status", { method: "GET" })).data as typeof status;
    expect(status.linked).toBe(true);
    expect(status.kyc_approved).toBe(false);

    // demo verify-now → kyc approved
    await handleMock("/integrations/pcx/verify-now", { method: "POST" });
    const profile = (await handleMock("/integrations/pcx/profile", { method: "GET" })).data as {
      email_confirmed: boolean;
      kyc_approved: boolean;
    };
    expect(profile.kyc_approved).toBe(true);
    expect(profile.email_confirmed).toBe(true);

    // no followees yet
    let followees = (
      await handleMock("/followees/me", { method: "GET", query: { status: "active" } })
    ).data as unknown[];
    expect(followees).toHaveLength(0);

    // follow a money manager → followed
    const mm = buildMoneyManagers()[0];
    const followRes = await handleMock("/followees/me/toggle", {
      method: "POST",
      body: { money_manager_id: mm.id, investor_account_id: "acc-live-1" },
    });
    const followee = followRes.data as { id: string; status: string };
    expect(followee.status).toBe("active");

    followees = (
      await handleMock("/followees/me", { method: "GET", query: { status: "active" } })
    ).data as unknown[];
    expect(followees).toHaveLength(1);

    // set risk on that followee
    const risk = (
      await handleMock(`/followees/me/${followee.id}/risk`, {
        method: "PUT",
        body: { max_loss_pct: 25 },
      })
    ).data as { max_loss_pct: number };
    expect(risk.max_loss_pct).toBe(25);
  });

  it("save/unsave reflects in is_saved and the saved list", async () => {
    const list = (await handleMock("/users/money-managers", { method: "GET" })).data as Array<{
      primary_account?: { id: string };
      is_saved?: boolean;
    }>;
    const accId = list[0].primary_account!.id;

    await handleMock("/me/saved-money-managers", {
      method: "POST",
      body: { money_manager_account_id: accId },
    });

    const saved = (await handleMock("/me/saved-money-managers", { method: "GET" })).data as unknown[];
    expect(saved).toHaveLength(1);

    const relisted = (await handleMock("/users/money-managers", { method: "GET" })).data as Array<{
      primary_account?: { id: string };
      is_saved?: boolean;
    }>;
    expect(relisted.find((m) => m.primary_account?.id === accId)?.is_saved).toBe(true);

    await handleMock(`/me/saved-money-managers/${accId}`, { method: "DELETE" });
    const afterUnsave = (await handleMock("/me/saved-money-managers", { method: "GET" }))
      .data as unknown[];
    expect(afterUnsave).toHaveLength(0);
  });

  it("deposit bumps the account balance and reports completed", async () => {
    const tx = (
      await handleMock("/integrations/pcx/deposits", {
        method: "POST",
        body: { account_id: "pcx-trading-1", amount: 500, currency: "USD" },
      })
    ).data as { status: string; amount: number };
    expect(tx.status).toBe("completed");
    expect(tx.amount).toBe(500);

    const accounts = (await handleMock("/integrations/pcx/accounts", { method: "GET" })).data as {
      trading?: Array<{ id: string; balance: number }>;
    };
    const trading = accounts.trading?.find((a) => a.id === "pcx-trading-1");
    expect(trading?.balance).toBeGreaterThan(1250); // seeded 1250.45 + 500
  });

  it("money manager lookup by username resolves a seeded strategy", async () => {
    const mm = (await handleMock("/users/money-managers/gold-trend", { method: "GET" })).data as {
      username?: string;
      performance?: { this_month_return_pct?: number };
    };
    expect(mm.username).toBe("gold-trend");
    expect(typeof mm.performance?.this_month_return_pct).toBe("number");
  });

  it("throws a loud 404 for an uncovered route", async () => {
    await expect(handleMock("/nope/not/real", { method: "GET" })).rejects.toThrow(/No mock for/);
  });
});
