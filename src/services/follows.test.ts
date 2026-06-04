import { describe, it, expect, vi, afterEach } from "vitest";
import { toggleFollow, listMyFollowees, setFollowRisk } from "./follows";

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

describe("toggleFollow", () => {
  it("POSTs payload and returns Followee data", async () => {
    const fetchMock = mockFetchJson(200, {
      data: { id: "f1", money_manager_id: "mm1", status: "active" },
    });
    const result = await toggleFollow({
      money_manager_id: "mm1",
      investor_account_id: "acc1",
    });
    expect(result.id).toBe("f1");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      money_manager_id: "mm1",
      investor_account_id: "acc1",
    });
  });

  it("throws when API returns no data", async () => {
    mockFetchJson(200, { data: null });
    await expect(
      toggleFollow({ money_manager_id: "mm1", investor_account_id: "acc1" }),
    ).rejects.toThrow("toggleFollow returned no data");
  });
});

describe("listMyFollowees", () => {
  it("returns followee list from data field", async () => {
    mockFetchJson(200, { data: [{ id: "f1" }, { id: "f2" }] });
    const result = await listMyFollowees();
    expect(result).toHaveLength(2);
  });

  it("returns empty array when API returns null data", async () => {
    mockFetchJson(200, { data: null });
    expect(await listMyFollowees()).toEqual([]);
  });

  it("forwards query params (status, page, limit)", async () => {
    const fetchMock = mockFetchJson(200, { data: [] });
    await listMyFollowees({ status: "active", page: 2, limit: 50 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("status=active");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=50");
  });
});

describe("setFollowRisk", () => {
  it("PUTs max_loss_pct and URL-encodes followee id", async () => {
    const fetchMock = mockFetchJson(200, { data: { id: "r1", max_loss_pct: 25 } });
    const result = await setFollowRisk("foll/ee 1", 25);
    expect(result.max_loss_pct).toBe(25);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/followees/me/foll%2Fee%201/risk");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ max_loss_pct: 25 });
  });

  it("returns empty risk object when API has no data", async () => {
    mockFetchJson(200, { data: null });
    expect(await setFollowRisk("f1", 10)).toEqual({});
  });
});
