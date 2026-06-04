import { getAccessToken } from "./auth-token";
import { USE_MOCKS } from "@/mocks/config";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1").replace(
  /\/+$/,
  "",
);

export interface JSONResponse<T = unknown> {
  data?: T;
  error?: unknown;
  message?: string;
  success?: boolean;
}

export interface MetaData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export class ApiError extends Error {
  status: number;
  code?: number | string;
  payload?: JSONResponse;

  constructor(status: number, message: string, payload?: JSONResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${cleanPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.append(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<JSONResponse<T>> {
  // Frontend-only demo mode: route everything through the in-memory mock layer.
  // Dynamic import keeps the mock graph out of the bundle when mocks are off.
  if (USE_MOCKS) {
    const { handleMock } = await import("@/mocks");
    return handleMock<T>(path, options);
  }

  const { body, query, auth = true, headers, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    serializedBody = JSON.stringify(body);
  }

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: requestHeaders,
      body: serializedBody,
    });
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : "Network error");
  }

  let payload: JSONResponse<T> | undefined;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as JSONResponse<T>;
    } catch {
      // non-JSON response, keep payload undefined
    }
  }

  if (!response.ok) {
    // Token-invalid signal: only when WE attached an auth header.
    // Login-with-wrong-password also returns 401 but auth: false there,
    // so it won't accidentally fire the session-expired modal.
    if (response.status === 401 && auth && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("batman:session-expired"));
    }
    const message =
      payload?.message ||
      (typeof payload?.error === "string" ? (payload.error as string) : undefined) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload ?? { success: true };
}
