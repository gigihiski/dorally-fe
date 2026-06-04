import { useEffect, useRef, useState } from "react";
import { loadGoogleIdentityServices, type GoogleCredentialResponse } from "@/lib/google-identity";
import { USE_MOCKS } from "@/mocks/config";

interface GoogleSignInButtonProps {
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  onSuccess: (idToken: string) => void;
  onError?: (error: Error) => void;
  width?: number;
}

const LABELS: Record<NonNullable<GoogleSignInButtonProps["text"]>, string> = {
  continue_with: "Continue with Google",
  signin_with: "Sign in with Google",
  signup_with: "Sign up with Google",
  signin: "Sign in with Google",
};

/**
 * Demo-mode stub: a clickable Google button that resolves to a mock ID token,
 * so the OAuth flow works fully offline. The mock `loginWithGoogle` handler
 * turns this token into a fake session.
 */
function GoogleSignInButtonMock({ text = "continue_with", onSuccess, width = 360 }: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSuccess("mock-google-id-token")}
      style={{ maxWidth: width }}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
      </svg>
      {LABELS[text]}
    </button>
  );
}

export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  if (USE_MOCKS) return <GoogleSignInButtonMock {...props} />;
  return <GoogleSignInButtonReal {...props} />;
}

function GoogleSignInButtonReal({
  text = "continue_with",
  onSuccess,
  onError,
  width = 360,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      setUnavailable(true);
      onErrorRef.current?.(new Error("Google OAuth client ID is not configured"));
      return;
    }

    let cancelled = false;
    loadGoogleIdentityServices()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        api.initialize({
          client_id: clientId,
          callback: (response: GoogleCredentialResponse) => {
            if (!response?.credential) {
              onErrorRef.current?.(new Error("Google sign-in returned no credential"));
              return;
            }
            onSuccessRef.current(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        api.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUnavailable(true);
        onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
    };
  }, [text, width]);

  if (unavailable) {
    return (
      <div className="w-full py-3 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 text-center">
        Google sign-in is unavailable
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
