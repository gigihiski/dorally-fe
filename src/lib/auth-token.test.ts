import { describe, it, expect } from "vitest";
import {
  getAccessToken,
  setAuthSession,
  clearAuthSession,
  isTokenExpired,
  isAuthenticated,
  setBatmanUser,
  getBatmanUser,
} from "./auth-token";

describe("auth-token", () => {
  describe("getAccessToken / setAuthSession", () => {
    it("returns null when no token set", () => {
      expect(getAccessToken()).toBeNull();
    });

    it("persists access_token in localStorage", () => {
      setAuthSession({ access_token: "abc123" });
      expect(getAccessToken()).toBe("abc123");
    });

    it("stores expires_at when provided", () => {
      setAuthSession({
        access_token: "tok",
        expires_at: "2099-01-01T00:00:00Z",
      });
      expect(localStorage.getItem("batman_token_expires_at")).toBe("2099-01-01T00:00:00Z");
    });

    it("removes stale expires_at when none provided", () => {
      localStorage.setItem("batman_token_expires_at", "stale");
      setAuthSession({ access_token: "tok" });
      expect(localStorage.getItem("batman_token_expires_at")).toBeNull();
    });
  });

  describe("clearAuthSession", () => {
    it("removes token, expiry, and user info", () => {
      setAuthSession({ access_token: "tok", expires_at: "2099-01-01T00:00:00Z" });
      setBatmanUser({ id: "u1", email: "a@b.c" });
      clearAuthSession();
      expect(getAccessToken()).toBeNull();
      expect(localStorage.getItem("batman_token_expires_at")).toBeNull();
      expect(getBatmanUser()).toBeNull();
    });
  });

  describe("isTokenExpired", () => {
    it("returns false when no expiry stored", () => {
      expect(isTokenExpired()).toBe(false);
    });

    it("returns false for future expiry", () => {
      setAuthSession({ access_token: "tok", expires_at: "2099-01-01T00:00:00Z" });
      expect(isTokenExpired()).toBe(false);
    });

    it("returns true for past expiry", () => {
      setAuthSession({ access_token: "tok", expires_at: "2000-01-01T00:00:00Z" });
      expect(isTokenExpired()).toBe(true);
    });

    it("returns false when expiry is not a valid date", () => {
      localStorage.setItem("batman_token_expires_at", "not-a-date");
      expect(isTokenExpired()).toBe(false);
    });
  });

  describe("isAuthenticated", () => {
    it("is false without token", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("is true with valid token and no expiry", () => {
      setAuthSession({ access_token: "tok" });
      expect(isAuthenticated()).toBe(true);
    });

    it("is true with valid token and future expiry", () => {
      setAuthSession({ access_token: "tok", expires_at: "2099-01-01T00:00:00Z" });
      expect(isAuthenticated()).toBe(true);
    });

    it("is false with expired token", () => {
      setAuthSession({ access_token: "tok", expires_at: "2000-01-01T00:00:00Z" });
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("setBatmanUser / getBatmanUser", () => {
    it("roundtrips user data", () => {
      const user = { id: "u1", name: "Alice", email: "a@b.c", username: "alice", country_code: "ID" };
      setBatmanUser(user);
      expect(getBatmanUser()).toEqual(user);
    });

    it("returns null when no user stored", () => {
      expect(getBatmanUser()).toBeNull();
    });

    it("returns null when user JSON is corrupt", () => {
      localStorage.setItem("batman_user", "{not json");
      expect(getBatmanUser()).toBeNull();
    });
  });
});
