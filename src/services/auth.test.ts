import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateUsernameFromEmail,
  loginUser,
  loginWithGoogle,
  registerUser,
  forgotPassword,
} from "./auth";
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

describe("generateUsernameFromEmail", () => {
  it("uses the email prefix lowercased and stripped of non-alphanum", () => {
    const username = generateUsernameFromEmail("Alice.Doe+99@example.com");
    expect(username).toMatch(/^alicedoe99[a-z0-9]{4}$/);
  });

  it("truncates very long prefixes to 20 chars", () => {
    const long = "a".repeat(50);
    const username = generateUsernameFromEmail(`${long}@x.com`);
    expect(username).toMatch(/^a{20}[a-z0-9]{4}$/);
  });

  it("falls back to 'user' for empty / all-non-alphanum prefix", () => {
    expect(generateUsernameFromEmail("@example.com")).toMatch(/^user[a-z0-9]{4}$/);
    expect(generateUsernameFromEmail("...@example.com")).toMatch(/^user[a-z0-9]{4}$/);
  });

  it("yields different suffixes across calls", () => {
    const a = generateUsernameFromEmail("foo@bar.com");
    const b = generateUsernameFromEmail("foo@bar.com");
    expect(a).not.toBe(b);
  });
});

describe("loginUser", () => {
  it("returns token data on success", async () => {
    mockFetchJson(200, { data: { access_token: "tok", expires_at: "2099" } });
    const res = await loginUser({ identifier: "a@b.c", password: "pw" });
    expect(res.access_token).toBe("tok");
  });

  it("throws ApiError when response has no access_token", async () => {
    mockFetchJson(200, { data: {}, message: "weird" });
    await expect(loginUser({ identifier: "a", password: "b" })).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "weird",
    });
  });

  it("propagates ApiError from apiRequest on 401", async () => {
    mockFetchJson(401, { message: "Invalid login" });
    await expect(loginUser({ identifier: "a", password: "b" })).rejects.toBeInstanceOf(ApiError);
  });
});

describe("loginWithGoogle", () => {
  it("returns token on success", async () => {
    mockFetchJson(200, { data: { access_token: "g-tok" } });
    const res = await loginWithGoogle("id-token");
    expect(res.access_token).toBe("g-tok");
  });

  it("throws when token missing", async () => {
    mockFetchJson(200, { data: {} });
    await expect(loginWithGoogle("x")).rejects.toMatchObject({ status: 500 });
  });
});

describe("registerUser", () => {
  it("returns registered user data", async () => {
    mockFetchJson(201, { data: { id: "u1", email: "a@b.c" } });
    const res = await registerUser({
      name: "A",
      email: "a@b.c",
      username: "alice",
      password: "pw",
      confirm_password: "pw",
      phone: "+62123",
      country_code: "ID",
      user_type: "investor",
    });
    expect(res).toEqual({ id: "u1", email: "a@b.c" });
  });

  it("returns empty object when API has no data", async () => {
    mockFetchJson(200, { data: null });
    const res = await registerUser({
      name: "A",
      email: "a@b.c",
      username: "alice",
      password: "pw",
      confirm_password: "pw",
      phone: "+62123",
      country_code: "ID",
      user_type: "investor",
    });
    expect(res).toEqual({});
  });
});

describe("forgotPassword", () => {
  it("resolves when API returns 2xx", async () => {
    mockFetchJson(204, {});
    await expect(forgotPassword({ email: "a@b.c" })).resolves.toBeUndefined();
  });

  it("rejects on non-2xx", async () => {
    mockFetchJson(404, { message: "not found" });
    await expect(forgotPassword({ email: "a@b.c" })).rejects.toBeInstanceOf(ApiError);
  });
});
