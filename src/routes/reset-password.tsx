import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Batman" },
      { name: "description", content: "Set a new password for your Batman account." },
    ],
  }),
  component: ResetPasswordPage,
});

interface FieldError {
  password?: string;
  confirmPassword?: string;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase auto-exchanges the recovery token from the URL hash and sets a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setValidSession(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      else setValidSession((v) => (v === null ? false : v));
    });

    return () => subscription.unsubscribe();
  }, []);

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    if (!validate()) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setGeneralError(error.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate({ to: "/login" }), 2000);
  };

  const inputClass = (field: keyof FieldError) =>
    `w-full pl-12 pr-12 py-3 rounded-lg border text-sm outline-none transition-colors ${
      errors[field] ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
    }`;
  const iconClass = (field: keyof FieldError) =>
    `absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors[field] ? "text-red-500" : "text-gray-400"}`;

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Password updated</h2>
          <p className="text-gray-500 mb-8">
            Your password has been changed. Redirecting you to login...
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (validSession === false) {
    return (
      <AuthLayout>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Invalid or expired link</h2>
        <p className="text-gray-500 mb-8">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="inline-block w-full text-center py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-colors"
          style={{ backgroundColor: "#2563EB" }}
        >
          REQUEST NEW LINK
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Reset Password</h2>
      <p className="text-gray-500 mb-8">Choose a new password for your account.</p>

      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{generalError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            NEW PASSWORD
          </label>
          <div className="relative">
            <KeyRound className={iconClass("password")} />
            <input
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
              className={inputClass("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            CONFIRM PASSWORD
          </label>
          <div className="relative">
            <KeyRound className={iconClass("confirmPassword")} />
            <input
              type={showCPwd ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
              className={inputClass("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowCPwd((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#2563EB" }}
        >
          {loading ? "UPDATING..." : "UPDATE PASSWORD"}
        </button>
      </form>
    </AuthLayout>
  );
}
