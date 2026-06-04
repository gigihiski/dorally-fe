import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiRequest, ApiError } from "./api";
import { setAuthSession, clearAuthSession } from "./auth-token";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1").replace(
  /\/+$/,
  "",
);

function mockFetch(response: {
  status?: number;
  body?: unknown;
  text?: string;
  throw?: Error;
}) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    if (response.throw) throw response.throw;
    const text =
      response.text !== undefined
        ? response.text
        : response.body !== undefined
          ? JSON.stringify(response.body)
          : "";
    const status = response.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => text,
    } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("apiRequest", () => {
  beforeEach(() => {
    clearAuthSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on 200", async () => {
    mockFetch({ status: 200, body: { data: { id: 1 } } });
    const res = await apiRequest<{ id: number }>("/things", { auth: false });
    expect(res.data).toEqual({ id: 1 });
  });

  it("builds URL with leading slash if missing", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: null } });
    await apiRequest("things", { auth: false });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/things`);
  });

  it("appends non-empty query params and skips null/undefined/empty", async () => {
    const fetchMock = mockFetch({ status: 200, body: {} });
    await apiRequest("/list", {
      auth: false,
      query: { page: 1, status: "active", search: "", missing: undefined, gone: null },
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("status=active");
    expect(calledUrl).not.toContain("search=");
    expect(calledUrl).not.toContain("missing=");
    expect(calledUrl).not.toContain("gone=");
  });

  it("serializes body to JSON and sets Content-Type", async () => {
    const fetchMock = mockFetch({ status: 200, body: {} });
    await apiRequest("/things", { method: "POST", body: { a: 1 }, auth: false });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("attaches Authorization header when auth=true and token present", async () => {
    setAuthSession({ access_token: "tok-1" });
    const fetchMock = mockFetch({ status: 200, body: {} });
    await apiRequest("/me");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer tok-1");
  });

  it("omits Authorization when auth=false", async () => {
    setAuthSession({ access_token: "tok-1" });
    const fetchMock = mockFetch({ status: 200, body: {} });
    await apiRequest("/public", { auth: false });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("throws ApiError with payload on non-2xx", async () => {
    mockFetch({ status: 422, body: { message: "Invalid input", error: "validation" } });
    await expect(apiRequest("/x", { auth: false })).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Invalid input",
    });
  });

  it("falls back to string error field for message", async () => {
    mockFetch({ status: 400, body: { error: "bad thing" } });
    await expect(apiRequest("/x", { auth: false })).rejects.toMatchObject({
      status: 400,
      message: "bad thing",
    });
  });

  it("uses generic message when payload has none", async () => {
    mockFetch({ status: 500, text: "" });
    await expect(apiRequest("/x", { auth: false })).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("wraps network errors as ApiError with status 0", async () => {
    mockFetch({ throw: new TypeError("network down") });
    await expect(apiRequest("/x", { auth: false })).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "network down",
    });
  });

  it("dispatches batman:session-expired on 401 when auth=true", async () => {
    setAuthSession({ access_token: "tok" });
    mockFetch({ status: 401, body: { message: "unauthorized" } });
    const handler = vi.fn();
    window.addEventListener("batman:session-expired", handler);
    await expect(apiRequest("/private")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener("batman:session-expired", handler);
  });

  it("does NOT dispatch session-expired on 401 when auth=false (login flow)", async () => {
    mockFetch({ status: 401, body: { message: "invalid credentials" } });
    const handler = vi.fn();
    window.addEventListener("batman:session-expired", handler);
    await expect(apiRequest("/users/auth/login", { auth: false })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("batman:session-expired", handler);
  });

  it("returns success sentinel when 2xx with empty body", async () => {
    mockFetch({ status: 204, text: "" });
    const res = await apiRequest("/empty", { auth: false });
    expect(res).toEqual({ success: true });
  });

  it("returns success sentinel when response body is non-JSON", async () => {
    mockFetch({ status: 200, text: "OK plain text" });
    const res = await apiRequest("/text", { auth: false });
    expect(res).toEqual({ success: true });
  });
});

describe("ApiError", () => {
  it("captures status, message, and payload", () => {
    const err = new ApiError(409, "conflict", { message: "conflict", data: null });
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(409);
    expect(err.message).toBe("conflict");
    expect(err.payload).toEqual({ message: "conflict", data: null });
    expect(err).toBeInstanceOf(Error);
  });
});
