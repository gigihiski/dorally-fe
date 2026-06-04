import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/change-password")({
  head: () => ({
    meta: [
      { title: "Ubah Password — Batman" },
      { name: "description", content: "Ubah password akun Batman Anda." },
    ],
  }),
  component: ChangePasswordPage,
});

interface FieldError {
  password?: string;
  confirmPassword?: string;
}

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!password) {
      newErrors.password = "New password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = "Use at least one uppercase letter and one number";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
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
    setShowPopup(true);
  };

  useEffect(() => {
    if (!showPopup) return;
    const t = setTimeout(() => navigate({ to: "/login" }), 3000);
    return () => clearTimeout(t);
  }, [showPopup, navigate]);

  const inputClass = (field: keyof FieldError) =>
    `w-full pl-12 pr-12 py-3 rounded-lg border text-sm outline-none transition-colors ${
      errors[field] ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
    }`;
  const iconClass = (field: keyof FieldError) =>
    `absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors[field] ? "text-red-500" : "text-gray-400"}`;

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Ubah Password</h2>
      <p className="text-gray-500 mb-8">Pilih password baru untuk akun Anda.</p>

      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{generalError}</div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-400">Min. 6 karakter, 1 huruf besar, dan 1 angka.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 tracking-wider mb-2">
            CONFIRM NEW PASSWORD
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
              aria-label={showCPwd ? "Hide password" : "Show password"}
            >
              {showCPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg text-white text-sm font-semibold tracking-wider transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#2563EB" }}
        >
          {loading ? "MENYIMPAN..." : "UBAH PASSWORD"}
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Password Berhasil Diubah</h3>
            <p className="text-sm text-gray-500 mb-5">
              Password Anda telah berhasil diperbarui. Silakan login menggunakan password baru.
            </p>
            <p className="text-xs text-gray-400">Mengarahkan ke halaman login dalam 3 detik...</p>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
