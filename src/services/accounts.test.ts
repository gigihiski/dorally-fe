import { describe, it, expect, vi, afterEach } from "vitest";
import { getMyAccounts } from "./accounts";

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

describe("getMyAccounts", () => {
  it("returns data + meta from response", async () => {
    mockFetchJson(200, {
      data: [{ id: "a1", login: "12345", balance: 100, currency: "USD" }],
      meta: { page: 1, limit: 10, total: 1, total_pages: 1 },
    });
    const result = await getMyAccounts();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].login).toBe("12345");
    expect(result.meta?.total).toBe(1);
  });

  it("returns empty array when data is missing", async () => {
    mockFetchJson(200, {});
    const result = await getMyAccounts();
    expect(result.data).toEqual([]);
  });

  it("forwards status/search/page/limit query params", async () => {
    const fetchMock = mockFetchJson(200, { data: [] });
    await getMyAccounts({ status: "active", search: "live", page: 2, limit: 5 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("status=active");
    expect(url).toContain("search=live");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=5");
  });

  it("does not append empty / undefined query params", async () => {
    const fetchMock = mockFetchJson(200, { data: [] });
    await getMyAccounts({ search: "", page: undefined });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("search=");
    expect(url).not.toContain("page=");
  });
});
