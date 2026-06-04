import { ApiError, apiRequest } from "@/lib/api";

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  expires_at?: string;
  token_type?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  phone: string;
  country_code: string;
  user_type: "investor" | "money_manager";
}

export interface RegisteredUser {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  avatar?: string;
  status?: string;
  user_type?: string;
  created_at?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

function randomSuffix(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateUsernameFromEmail(email: string): string {
  const prefix = (email.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  const base = prefix || "user";
  return `${base}${randomSuffix(4)}`;
}

export async function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  const response = await apiRequest<TokenResponse>("/users/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
  if (!response.data?.access_token) {
    throw new ApiError(500, response.message || "Login response missing access token", response);
  }
  return response.data;
}

export async function loginWithGoogle(idToken: string): Promise<TokenResponse> {
  const response = await apiRequest<TokenResponse>("/users/auth/oauth/google", {
    method: "POST",
    body: { id_token: idToken },
    auth: false,
  });
  if (!response.data?.access_token) {
    throw new ApiError(500, response.message || "OAuth response missing access token", response);
  }
  return response.data;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisteredUser> {
  const response = await apiRequest<RegisteredUser>("/users", {
    method: "POST",
    body: payload,
    auth: false,
  });
  return response.data ?? {};
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await apiRequest("/users/auth/forgot-password", {
    method: "POST",
    body: payload,
    auth: false,
  });
}
