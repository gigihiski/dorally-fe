import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { clearAuthSession } from "@/lib/auth-token";

export function SessionExpiredModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      // Already on login (e.g. expired token while user is signing in
      // for a different account) — no need for a modal.
      if (pathname === "/login") return;
      setOpen(true);
    };
    window.addEventListener("batman:session-expired", onExpired);
    return () => window.removeEventListener("batman:session-expired", onExpired);
  }, [pathname]);

  if (!open) return null;

  const handleConfirm = () => {
    clearAuthSession();
    queryClient.clear();
    setOpen(false);
    navigate({ to: "/login" });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
          </div>
          <h3 id="session-expired-title" className="text-lg font-bold text-gray-900">
            Session expired
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Your login has expired or is no longer valid. Please sign in again to continue.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Sign in again
        </button>
      </div>
    </div>
  );
}
