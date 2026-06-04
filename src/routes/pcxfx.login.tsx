import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, KeyRound, Eye, EyeOff, X, ShieldCheck } from "lucide-react";
import pcxLogo from "@/assets/pcx-logo.png";
import { linkPcxAccount } from "@/services/integrations";
import { ApiError } from "@/lib/api";

const PRIMARY = "#0A0547";
const SECONDARY = "#CBA030";

export const Route = createFileRoute("/pcxfx/login")({
  head: () => ({
    meta: [{ title: "PCX Login" }],
  }),
  component: PcxLogin,
});

interface Errors {
  email?: string;
  password?: string;
}

function PcxLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const validate = (): boolean => {
    const e: Errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGeneralError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await linkPcxAccount({ email: email.trim(), password });
      navigate({ to: "/onboarding/$step", params: { step: "verifying-document" } });
    } catch (err) {
      console.error("[pcxfx/login] link failed:", err);
      if (err instanceof ApiError) {
        const errBlob = `${err.message || ""} ${JSON.stringify(err.payload || {})}`.toLowerCase();
        const isNonConfirmed = err.status === 461 || errBlob.includes("non_confirmed");
        const isAnotherUser =
          err.status === 409 && (err.message || "").toLowerCase().includes("another user");
        if (isNonConfirmed) {
          setGeneralError(
            "Your PCX email is not confirmed yet. Please confirm your email at PCX, then try again.",
          );
        } else if (isAnotherUser) {
          setGeneralError(
            "This PCX account is already linked to a different Batman user. Please use a different PCX account or contact support.",
          );
        } else if (err.status === 422) {
          setGeneralError("Invalid PCX credentials. Please try again.");
        } else if (err.status === 401) {
          setGeneralError("Your Batman session expired. Please log in again.");
        } else if (err.status === 400) {
          setGeneralError("Unknown provider. Please contact support.");
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError(err instanceof Error ? err.message : "Failed to link PCX account");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (k: keyof Errors) =>
    `w-full pl-12 pr-4 py-3 rounded-lg border text-sm outline-none transition-colors ${
      errors[k] ? "border-red-500 focus:border-red-500" : "border-gray-200"
    }`;
  const inputStyle = (k: keyof Errors): React.CSSProperties =>
    errors[k] ? {} : { borderColor: undefined };
  const iconClass = (k: keyof Errors) =>
    `absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors[k] ? "text-red-500" : "text-gray-400"}`;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #1a0f6b 50%, ${PRIMARY} 100%)` }}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1 w-full" style={{ background: SECONDARY }} />
        <button
          onClick={() => navigate({ to: "/onboarding/$step", params: { step: "binding" } })}
          className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-b from-gray-50 to-white px-8 pt-9 pb-6 border-b border-gray-100">
          <div className="flex justify-center mb-5">
            <img src={pcxLogo} alt="PCX" className="h-12 w-auto object-contain" />
          </div>
          <div
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium tracking-wider uppercase"
            style={{ color: SECONDARY }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure SSO · Batman</span>
          </div>
        </div>

        <div className="px-8 pt-7 pb-8">
          <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: PRIMARY }}>
            Sign in to continue
          </h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Authorize Batman to bind your PCX account.
          </p>

          {generalError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{generalError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
                EMAIL
              </label>
              <div className="relative">
                <Mail className={iconClass("email")} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  onFocus={(e) => {
                    if (!errors.email) e.currentTarget.style.borderColor = PRIMARY;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "";
                  }}
                  placeholder="name@example.com"
                  className={inputClass("email")}
                  style={inputStyle("email")}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <KeyRound className={iconClass("password")} />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  onFocus={(e) => {
                    if (!errors.password) e.currentTarget.style.borderColor = PRIMARY;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "";
                  }}
                  placeholder="••••••••"
                  className={`${inputClass("password")} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: PRIMARY }}
            >
              {loading ? "SIGNING IN..." : "LOGIN WITH PCX"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-gray-400 tracking-wide">
            Protected by Batman SSO · End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
