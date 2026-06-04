const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

export interface GoogleIdTokenClaims {
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
}

export function decodeGoogleIdToken(idToken: string): GoogleIdTokenClaims | null {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded =
      typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as GoogleIdTokenClaims;
  } catch {
    return null;
  }
}

export interface GoogleIdentityIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number | string;
      locale?: string;
    },
  ) => void;
  prompt: (notification?: (notification: unknown) => void) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityIdApi;
      };
    };
  }
}

let scriptPromise: Promise<GoogleIdentityIdApi> | null = null;

export function loadGoogleIdentityServices(): Promise<GoogleIdentityIdApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services unavailable on server"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GoogleIdentityIdApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    const onReady = () => {
      const api = window.google?.accounts?.id;
      if (!api) {
        scriptPromise = null;
        reject(new Error("Google Identity Services loaded but API unavailable"));
        return;
      }
      resolve(api);
    };
    const onFail = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Google Identity Services"));
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", onFail, { once: true });
      if (window.google?.accounts?.id) onReady();
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", onFail, { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
}
