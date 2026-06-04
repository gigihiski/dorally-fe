const TOKEN_KEY = "batman_access_token";
const EXPIRES_KEY = "batman_token_expires_at";
const USER_KEY = "batman_user";

export interface BatmanSessionPayload {
  access_token: string;
  expires_at?: string;
}

export interface BatmanUserInfo {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  country_code?: string;
}

const safeStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function getAccessToken(): string | null {
  return safeStorage()?.getItem(TOKEN_KEY) ?? null;
}

export function setAuthSession({ access_token, expires_at }: BatmanSessionPayload): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(TOKEN_KEY, access_token);
  if (expires_at) storage.setItem(EXPIRES_KEY, expires_at);
  else storage.removeItem(EXPIRES_KEY);
}

export function clearAuthSession(): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(EXPIRES_KEY);
  storage.removeItem(USER_KEY);
}

export function isTokenExpired(): boolean {
  const expiresAt = safeStorage()?.getItem(EXPIRES_KEY);
  if (!expiresAt) return false;
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) return false;
  return Date.now() >= expiresMs;
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken()) && !isTokenExpired();
}

export function setBatmanUser(user: BatmanUserInfo): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function getBatmanUser(): BatmanUserInfo | null {
  const raw = safeStorage()?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BatmanUserInfo;
  } catch {
    return null;
  }
}
