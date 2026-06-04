import { describe, it, expect, vi, afterEach } from "vitest";
import {
  listSavedMoneyManagers,
  saveMoneyManager,
  unsaveMoneyManager,
} from "./saved-money-managers";

function mockFetchJson(status: number, body: unknown) {
  const fn = vi.fn(
    async () =>
      ({
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(body),
      }) as Response,
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("listSavedMoneyManagers", () => {
  it("returns SavedCard[] plus meta", async () => {
    mockFetchJson(200, {
      data: [
        {
          id: "s1",
          money_manager_account_id: "mm-acc-1",
          investors_count: 42,
          profile: { minimum_start: 10, profit_sharing_fee_pct: 20, fee_timing: "weekly" },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
    });
    const result = await listSavedMoneyManagers({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].profile?.minimum_start).toBe(10);
    expect(result.meta?.total).toBe(1);
  });

  it("returns empty array when API returns no data", async () => {
    mockFetchJson(200, {});
    expect((await listSavedMoneyManagers()).data).toEqual([]);
  });

  it("forwards page/limit query params", async () => {
    const fetchMock = mockFetchJson(200, { data: [] });
    await listSavedMoneyManagers({ page: 2, limit: 50 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("limit=50");
  });
});

describe("saveMoneyManager", () => {
  it("POSTs money_manager_account_id and returns SavedMoneyManager", async () => {
    const fetchMock = mockFetchJson(200, {
      data: { id: "s1", money_manager_account_id: "mm-acc-1" },
    });
    const result = await saveMoneyManager("mm-acc-1");
    expect(result.id).toBe("s1");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      money_manager_account_id: "mm-acc-1",
    });
  });

  it("returns empty object when API returns no data", async () => {
    mockFetchJson(200, { data: null });
    expect(await saveMoneyManager("mm-acc-1")).toEqual({});
  });
});

describe("unsaveMoneyManager", () => {
  it("DELETEs and URL-encodes account_id", async () => {
    const fetchMock = mockFetchJson(200, {});
    await unsaveMoneyManager("acc/with space");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/me/saved-money-managers/acc%2Fwith%20space");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("DELETE");
  });

  it("resolves on 200", async () => {
    mockFetchJson(200, {});
    await expect(unsaveMoneyManager("a")).resolves.toBeUndefined();
  });
});
