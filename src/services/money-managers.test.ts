import { describe, it, expect, vi, afterEach } from "vitest";
import { getMoneyManagers, getMoneyManagerByUsername } from "./money-managers";
import { ApiError } from "@/lib/api";

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

describe("getMoneyManagers", () => {
  it("returns data + meta", async () => {
    mockFetchJson(200, {
      data: [{ id: "m1", name: "Alice" }],
      meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
    });
    const result = await getMoneyManagers({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta?.total).toBe(1);
  });

  it("returns empty array when data is missing", async () => {
    mockFetchJson(200, {});
    const result = await getMoneyManagers();
    expect(result.data).toEqual([]);
    expect(result.meta).toBeUndefined();
  });

  it("forwards search/page/limit params", async () => {
    const fetchMock = mockFetchJson(200, { data: [] });
    await getMoneyManagers({ page: 3, limit: 25, search: "alice" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("page=3");
    expect(url).toContain("limit=25");
    expect(url).toContain("search=alice");
  });
});

describe("getMoneyManagerByUsername", () => {
  it("returns money manager on hit", async () => {
    mockFetchJson(200, { data: { id: "m1", name: "Alice", username: "alice" } });
    const mm = await getMoneyManagerByUsername("alice");
    expect(mm.username).toBe("alice");
  });

  it("URL-encodes the username param", async () => {
    const fetchMock = mockFetchJson(200, { data: { id: "m1", name: "X" } });
    await getMoneyManagerByUsername("a/b c");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/users/money-managers/a%2Fb%20c");
  });

  it("throws ApiError 404 when API returns no data", async () => {
    mockFetchJson(200, { data: null, message: "not found" });
    await expect(getMoneyManagerByUsername("ghost")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "not found",
    });
  });

  it("propagates ApiError on 500", async () => {
    mockFetchJson(500, { message: "boom" });
    await expect(getMoneyManagerByUsername("alice")).rejects.toBeInstanceOf(ApiError);
  });
});
