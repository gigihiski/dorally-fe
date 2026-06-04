import { describe, it, expect, vi, afterEach } from "vitest";
import { getMyProfile, updateMyProfile } from "./users";

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

describe("getMyProfile", () => {
  it("returns User data", async () => {
    mockFetchJson(200, {
      data: { id: "u1", name: "Alice", email: "a@b.c", user_type: "investor" },
    });
    const me = await getMyProfile();
    expect(me.id).toBe("u1");
    expect(me.user_type).toBe("investor");
  });

  it("returns empty object when API has no data", async () => {
    mockFetchJson(200, {});
    expect(await getMyProfile()).toEqual({});
  });
});

describe("updateMyProfile", () => {
  it("PATCHes the payload and returns updated User", async () => {
    const fetchMock = mockFetchJson(200, {
      data: { id: "u1", name: "Alicia", email: "a@b.c" },
    });
    const result = await updateMyProfile({ name: "Alicia" });
    expect(result.name).toBe("Alicia");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Alicia" });
  });

  it("returns empty object when API has no data", async () => {
    mockFetchJson(200, { data: null });
    expect(await updateMyProfile({ name: "X" })).toEqual({});
  });
});
