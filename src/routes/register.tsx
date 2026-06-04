import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, KeyRound, User, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { generateUsernameFromEmail, loginWithGoogle, registerUser } from "@/services/auth";
import { setAuthSession, setBatmanUser } from "@/lib/auth-token";
import { ApiError } from "@/lib/api";
import { decodeGoogleIdToken } from "@/lib/google-identity";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sign Up — Batman" },
      { name: "description", content: "Create your Batman account" },
    ],
  }),
  component: RegisterPage,
});

interface FieldError {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    if (!showSuccessPopup) return;
    const t = setTimeout(() => navigate({ to: "/login" }), 3000);
    return () => clearTimeout(t);
  }, [showSuccessPopup, navigate]);

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!termsAccepted) {
      newErrors.terms = "You must agree to the Terms of Service and Privacy Policy";
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
      let attempt = 0;
      let lastError: unknown = null;
      while (attempt < 2) {
        const username = generateUsernameFromEmail(email);
        try {
          const user = await registerUser({
            name: fullName.trim(),
            email: email.trim(),
            username,
            password,
            confirm_password: confirmPassword,
            phone: "",
            country_code: "",
            user_type: "investor",
          });
          if (user?.email || user?.name) {
            setBatmanUser({
              id: user.id,
              name: user.name ?? fullName,
              email: user.email ?? email,
              username: user.username ?? username,
            });
          }
          setGeneralError("");
          if (googleIdToken) {
            try {
              const token = await loginWithGoogle(googleIdToken);
              setAuthSession({
                access_token: token.access_token,
                expires_at: token.expires_at,
              });
              navigate({ to: "/onboarding/$step", params: { step: "select" } });
              return;
            } catch {
              // Auto-login failed — fall back to manual login
            }
          }
          setShowSuccessPopup(true);
          return;
        } catch (err) {
          lastError = err;
          // Retry once if the conflict is plausibly a username collision.
          if (err instanceof ApiError && err.status === 409 && attempt === 0) {
            attempt += 1;
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    } catch (err) {
      console.error("[register] submit failed:", err);
      if (err instanceof ApiError) {
        if (err.status === 409) setGeneralError("Email, username, or phone already exists.");
        else if (err.status === 400)
          setGeneralError(err.message || "Please check your details and try again.");
        else setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : "Registration failed");
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
      navigate({ to: "/onboarding/$step", params: { step: "select" } });
    } catch (err) {
      console.error("[register] google sign-in failed:", err);
      if (err instanceof ApiError && err.status === 404) {
        const claims = decodeGoogleIdToken(idToken);
        if (claims?.email && claims?.name) {
          setFullName(claims.name);
          setEmail(claims.email);
          setGoogleIdToken(idToken);
          setGoogleEmail(claims.email);
          setErrors((prev) => ({ ...prev, fullName: undefined, email: undefined }));
          return;
        }
        setGeneralError("Account not found. Please complete registration to continue.");
        return;
      }
      if (err instanceof ApiError) {
        if (err.status === 401) setGeneralError("Google sign-in failed. Please try again.");
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

  const cancelGoogleFlow = () => {
    setGoogleIdToken(null);
    setGoogleEmail(null);
    setFullName("");
    setEmail("");
  };

  const clearError = (field: keyof FieldError) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

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
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Create your Batman account</h2>
      <p className="text-gray-500 mb-8">Your first step to smarter portfolio management.</p>

      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{generalError}</div>
      )}

      {googleIdToken && googleEmail ? (
        <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <div className="flex-1 text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-0.5">Continue with Google</p>
            <p>
              Signed in as <span className="font-medium">{googleEmail}</span>. Set a password to
              finish creating your Batman account.
            </p>
            <button
              type="button"
              onClick={cancelGoogleFlow}
              className="mt-1 text-xs font-semibold underline"
              style={{ color: "#2563EB" }}
            >
              Use a different account
            </button>
          </div>
        </div>
      ) : (
        <>
          <GoogleSignInButton
            text="signup_with"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 tracking-wider">
              OR SIGN UP WITH EMAIL
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            FULL NAME
          </label>
          <div className="relative">
            <User className={iconClass("fullName")} />
            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError("fullName");
              }}
              className={inputClass("fullName")}
            />
          </div>
          {errors.fullName && <p className="mt-1.5 text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            EMAIL ADDRESS
          </label>
          <div className="relative">
            <Mail className={iconClass("email")} />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              readOnly={Boolean(googleIdToken)}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              className={`${inputClass("email")} ${googleIdToken ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
              PASSWORD
            </label>
            <div className="relative">
              <KeyRound className={iconClass("password")} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                className={`${inputClass("password")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
              CONFIRM PASSWORD
            </label>
            <div className="relative">
              <ShieldCheck className={iconClass("confirmPassword")} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError("confirmPassword");
                }}
                className={`${inputClass("confirmPassword")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              clearError("terms");
            }}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600"
          />
          <label className="text-sm text-gray-600">
            I agree to the{" "}
            <span className="font-medium" style={{ color: "#2563EB" }}>
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="font-medium" style={{ color: "#2563EB" }}>
              Privacy Policy
            </span>
            .
          </label>
        </div>
        {errors.terms && <p className="text-xs text-red-500 -mt-2">{errors.terms}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#2563EB" }}
        >
          {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold" style={{ color: "#2563EB" }}>
            Login
          </Link>
        </p>
      </div>

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-[#2563EB] animate-spin" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Registration Successful</h3>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
