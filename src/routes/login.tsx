import { createFileRoute, Link, useNavigate, type NavigateOptions } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { loginUser, loginWithGoogle } from "@/services/auth";
import { getPcxProfile } from "@/services/integrations";
import { isAuthenticated, setAuthSession, setBatmanUser } from "@/lib/auth-token";
import { ApiError } from "@/lib/api";

async function resolvePostLoginRoute(): Promise<NavigateOptions> {
  try {
    const profile = await getPcxProfile();
    if (profile.email_confirmed && profile.kyc_approved) {
      return { to: "/dashboard" };
    }
    return { to: "/onboarding/$step", params: { step: "verifying-document" } };
  } catch {
    return { to: "/onboarding/$step", params: { step: "select" } };
  }
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Batman" },
      { name: "description", content: "Sign in to your Batman account" },
    ],
  }),
  component: LoginPage,
});

interface FieldError {
  identifier?: string;
  password?: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] = useState(() => isAuthenticated());

  useEffect(() => {
    if (!checkingExistingSession) return;
    let cancelled = false;
    void (async () => {
      const route = await resolvePostLoginRoute();
      if (!cancelled) navigate(route);
    })();
    return () => {
      cancelled = true;
    };
  }, [checkingExistingSession, navigate]);

  useEffect(() => {
    if (!showSuccessPopup) return;
    let cancelled = false;
    void (async () => {
      const route = await resolvePostLoginRoute();
      if (!cancelled) navigate(route);
    })();
    return () => {
      cancelled = true;
    };
  }, [showSuccessPopup, navigate]);

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!identifier.trim()) {
      newErrors.identifier = "Email or username is required";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const token = await loginUser({ identifier: identifier.trim(), password });
      setAuthSession({ access_token: token.access_token, expires_at: token.expires_at });
      setBatmanUser({
        email: identifier.includes("@") ? identifier : undefined,
        username: identifier.includes("@") ? undefined : identifier,
      });
      setShowSuccessPopup(true);
    } catch (err) {
      console.error("[login] submit failed:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) setGeneralError("Invalid email/username or password.");
        else if (err.status === 423)
          setGeneralError("Account temporarily locked. Try again later.");
        else setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setGeneralError("");
    setLoading(true);
    try {
      const token = await loginWithGoogle(idToken);
      setAuthSession({ access_token: token.access_token, expires_at: token.expires_at });
      setShowSuccessPopup(true);
    } catch (err) {
      console.error("[login] google sign-in failed:", err);
      if (err instanceof ApiError) {
        if (err.status === 404) setGeneralError("Account not found. Please register first.");
        else if (err.status === 401) setGeneralError("Google sign-in failed. Please try again.");
        else if (err.status === 423)
          setGeneralError("Account temporarily locked. Try again later.");
        else setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : "Google sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err: Error) => {
    setGeneralError(err.message);
  };

  const inputClass = (field: keyof FieldError) =>
    `w-full pl-12 pr-4 py-3 rounded-lg border text-sm outline-none transition-colors ${
      errors[field]
        ? "border-red-500 focus:border-red-500"
        : "border-gray-200 focus:border-blue-500"
    }`;

  const iconClass = (field: keyof FieldError) =>
    `absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
      errors[field] ? "text-red-500" : "text-gray-400"
    }`;

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome Back</h2>
      <p className="text-gray-500 mb-8">Pick up where you left off.</p>

      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{generalError}</div>
      )}

      <GoogleSignInButton
        text="continue_with"
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
      />

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-medium text-gray-400 tracking-wider">
          OR LOG IN WITH EMAIL
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            EMAIL OR USERNAME
          </label>
          <div className="relative">
            <Mail className={iconClass("identifier")} />
            <input
              type="text"
              autoComplete="username"
              placeholder="name@example.com or username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setErrors((prev) => ({ ...prev, identifier: undefined }));
              }}
              className={inputClass("identifier")}
            />
          </div>
          {errors.identifier && <p className="mt-1.5 text-xs text-red-500">{errors.identifier}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            PASSWORD
          </label>
          <div className="relative">
            <KeyRound className={iconClass("password")} />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className={`${inputClass("password")} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#2563EB" }}
        >
          {loading ? "SIGNING IN..." : "LOGIN"}
        </button>
      </form>

      <div className="mt-4">
        <Link to="/forgot-password" className="text-sm font-medium" style={{ color: "#2563EB" }}>
          Forgot Password
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          New to Batman?{" "}
          <Link to="/register" className="font-semibold" style={{ color: "#2563EB" }}>
            Sign Up
          </Link>
        </p>
      </div>

      {(showSuccessPopup || checkingExistingSession) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-[#2563EB] animate-spin" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {showSuccessPopup ? "Login Successful" : "Welcome back"}
            </h3>
            <p className="text-sm text-gray-500">
              {showSuccessPopup ? "Checking your account..." : "Checking your session..."}
            </p>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
