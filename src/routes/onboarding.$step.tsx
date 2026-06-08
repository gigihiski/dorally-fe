import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformModal } from "@/components/PlatformModal";
import { getBatmanUser, isAuthenticated, type BatmanUserInfo } from "@/lib/auth-token";
import type { User } from "@supabase/supabase-js";

const stepToView: Record<string, string> = {
  select: "select",
  create: "create",
  creating: "creating",
  created: "created",
  binding: "bindingPermissions",
  "binding-loading": "bindingLoading",
  "binding-success": "bindingSuccess",
  "binding-failed": "bindingFailed",
  "verifying-document": "verifyingDocument",
};

const viewToStep: Record<string, string> = Object.fromEntries(
  Object.entries(stepToView).map(([k, v]) => [v, k]),
);

export const Route = createFileRoute("/onboarding/$step")({
  component: OnboardingStep,
  head: () => ({
    meta: [{ title: "Onboarding — Batman" }],
  }),
});

function OnboardingStep() {
  const { step } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [batmanUser, setBatmanUserState] = useState<BatmanUserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBatmanUserState(getBatmanUser());

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Redirect to PCX SSO popup pages for these steps
  useEffect(() => {
    if (step === "creating") {
      const t = setTimeout(() => navigate({ to: "/pcxfx/registration" }), 1200);
      return () => clearTimeout(t);
    }
    if (step === "binding-loading") {
      const t = setTimeout(() => navigate({ to: "/pcxfx/login" }), 1200);
      return () => clearTimeout(t);
    }
    if (step === "verifying-document") {
      try {
        sessionStorage.removeItem("pcx_flow");
      } catch {
        /* sessionStorage unavailable */
      }
    }
  }, [step, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: "#2563EB" }}
        />
      </div>
    );
  }

  const hasBatmanSession = isAuthenticated();
  if (!user && !hasBatmanSession) {
    return <Navigate to="/login" />;
  }

  const displayName = user?.user_metadata?.full_name || batmanUser?.name || "";
  const displayEmail = user?.email || batmanUser?.email || "";

  const currentView = stepToView[step];
  if (!currentView) {
    return <Navigate to="/onboarding/$step" params={{ step: "select" }} replace />;
  }

  const handleViewChange = (newView: string) => {
    const urlStep = viewToStep[newView];
    if (urlStep && urlStep !== step) {
      navigate({ to: "/onboarding/$step", params: { step: urlStep } });
    }
  };

  const handleClose = () => {
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-white">
      <PlatformModal
        open
        onClose={handleClose}
        onContinue={() => handleClose()}
        onViewChange={handleViewChange}
        currentView={currentView}
        userName={displayName}
        userEmail={displayEmail}
      />
    </div>
  );
}
