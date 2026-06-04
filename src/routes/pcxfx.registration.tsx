import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Globe,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import pcxLogo from "@/assets/pcx-logo.png";
import { registerDemoPcx, registerLivePcx } from "@/services/integrations";
import { ApiError } from "@/lib/api";
import { ISO_COUNTRIES } from "@/data/countries";

const PRIMARY = "#0A0547";
const SECONDARY = "#CBA030";

const ACCOUNT_MODE: "demo" | "live" =
  (import.meta.env.VITE_PCX_ACCOUNT_MODE ?? "live").toLowerCase() === "demo" ? "demo" : "live";
const IS_DEMO = ACCOUNT_MODE === "demo";
const registerPcx = IS_DEMO ? registerDemoPcx : registerLivePcx;

export const Route = createFileRoute("/pcxfx/registration")({
  head: () => ({
    meta: [{ title: "PCX Registration" }],
  }),
  component: PcxRegistration,
});

interface Errors {
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

function PcxRegistration() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    if (!showSuccessPopup) return;
    const t = setTimeout(() => navigate({ to: "/pcxfx/login" }), 5000);
    return () => clearTimeout(t);
  }, [showSuccessPopup, navigate]);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!country) e.country = "Country is required";
    if (!phone.trim()) e.phone = "Phone is required";
    else if (!/^[+\d][\d\s\-()]{5,}$/.test(phone.trim())) e.phone = "Invalid phone format";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Min 8 characters";
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGeneralError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await registerPcx({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        country,
        password,
        phone: phone.trim(),
      });
      setShowSuccessPopup(true);
    } catch (err) {
      console.error(`[pcxfx/registration] ${ACCOUNT_MODE} registration failed:`, err);
      if (err instanceof ApiError) {
        if (err.status === 422) {
          setGeneralError(err.message || "Registration was rejected by PCX. Please try again.");
        } else if (err.status === 400) {
          setGeneralError(err.message || "Invalid input. Please check your details and try again.");
        } else if (err.status === 502) {
          setGeneralError("PCX is temporarily unreachable. Please try again in a moment.");
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (k: keyof Errors) =>
    `w-full pl-12 pr-4 py-3 rounded-lg border text-sm outline-none transition-colors ${
      errors[k] ? "border-red-500 focus:border-red-500" : "border-gray-200"
    }`;
  const iconClass = (k: keyof Errors) =>
    `absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors[k] ? "text-red-500" : "text-gray-400"}`;

  const focusOn = (k: keyof Errors) => (e: React.FocusEvent<HTMLInputElement>) => {
    if (!errors[k]) e.currentTarget.style.borderColor = PRIMARY;
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #1a0f6b 50%, ${PRIMARY} 100%)` }}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1 w-full" style={{ background: SECONDARY }} />
        <button
          onClick={() => navigate({ to: "/onboarding/$step", params: { step: "create" } })}
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
          <div className="flex justify-center mt-3">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                IS_DEMO ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#D1FAE5] text-[#065F46]"
              }`}
            >
              {IS_DEMO ? "Demo Account" : "Live Account"}
            </span>
          </div>
        </div>

        <div className="px-8 pt-7 pb-8">
          <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: PRIMARY }}>
            {IS_DEMO ? "Create your demo account" : "Create your account"}
          </h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            {IS_DEMO
              ? "Register a PCX demo account via Batman SSO. Practice with virtual funds."
              : "Register to PCX via Batman SSO."}
          </p>

          {generalError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{generalError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
                  FIRST NAME
                </label>
                <div className="relative">
                  <User className={iconClass("firstName")} />
                  <input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setErrors((p) => ({ ...p, firstName: undefined }));
                    }}
                    onFocus={focusOn("firstName")}
                    onBlur={focusOff}
                    placeholder="John"
                    className={inputClass("firstName")}
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
                  LAST NAME
                </label>
                <div className="relative">
                  <User className={iconClass("lastName")} />
                  <input
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setErrors((p) => ({ ...p, lastName: undefined }));
                    }}
                    onFocus={focusOn("lastName")}
                    onBlur={focusOff}
                    placeholder="Doe"
                    className={inputClass("lastName")}
                  />
                </div>
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

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
                  onFocus={focusOn("email")}
                  onBlur={focusOff}
                  placeholder="name@example.com"
                  className={inputClass("email")}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
                COUNTRY
              </label>
              <div className="relative">
                <Globe className={iconClass("country")} />
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setErrors((p) => ({ ...p, country: undefined }));
                  }}
                  className={`${inputClass("country")} pr-10 appearance-none bg-white ${country ? "text-gray-900" : "text-gray-400"}`}
                >
                  <option value="">Select country…</option>
                  {ISO_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="text-gray-900">
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
                PHONE
              </label>
              <div className="relative">
                <Phone className={iconClass("phone")} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  onFocus={focusOn("phone")}
                  onBlur={focusOff}
                  placeholder="+62 812 3456 7890"
                  className={inputClass("phone")}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    onFocus={focusOn("password")}
                    onBlur={focusOff}
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
              <div>
                <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
                  CONFIRM
                </label>
                <div className="relative">
                  <KeyRound className={iconClass("confirmPassword")} />
                  <input
                    type={showCPwd ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((p) => ({ ...p, confirmPassword: undefined }));
                    }}
                    onFocus={focusOn("confirmPassword")}
                    onBlur={focusOff}
                    placeholder="••••••••"
                    className={`${inputClass("confirmPassword")} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCPwd((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: PRIMARY }}
            >
              {loading ? "REGISTERING..." : "REGISTER WITH PCX"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-gray-400 tracking-wide">
            Protected by Batman SSO · End-to-end encrypted
          </p>
        </div>
      </div>

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#D1FAE5] flex items-center justify-center">
              <Mail className="w-7 h-7 text-[#10B981]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Registration successful</h3>
            <p className="text-sm text-gray-500 mb-4">
              We sent a verification link to{" "}
              <span className="font-semibold text-gray-700">{email}</span>. Open it from your inbox
              to activate your PCX account.
            </p>
            <p className="text-xs text-gray-400">Redirecting to PCX login in a few seconds…</p>
          </div>
        </div>
      )}
    </div>
  );
}
