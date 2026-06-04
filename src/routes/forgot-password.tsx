import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { forgotPassword } from "@/services/auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Batman" },
      { name: "description", content: "Reset your Batman account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError("Email address is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setShowPopup(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : "Failed to send reset link");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showPopup) return;
    const t = setTimeout(() => navigate({ to: "/login" }), 3000);
    return () => clearTimeout(t);
  }, [showPopup, navigate]);

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Forgot Password?</h2>
      <p className="text-gray-500 mb-8">
        Enter your email and we'll send you a link to reset your password.
      </p>

      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{generalError}</div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            EMAIL ADDRESS
          </label>
          <div className="relative">
            <Mail
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                error ? "text-red-500" : "text-gray-400"
              }`}
            />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className={`w-full pl-12 pr-4 py-3 rounded-lg border text-sm outline-none transition-colors ${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 focus:border-blue-500"
              }`}
            />
          </div>
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#2563EB" }}
        >
          {loading ? "SENDING..." : "SEND RESET LINK"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: "#2563EB" }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Link Sent</h3>
            <p className="text-sm text-gray-500 mb-5">
              We've sent a password reset link to{" "}
              <span className="font-semibold text-gray-900">{email}</span>. Check your inbox.
            </p>
            <p className="text-xs text-gray-400">Redirecting to login in 3 seconds...</p>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
