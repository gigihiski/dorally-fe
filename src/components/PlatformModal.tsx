import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  X,
  ArrowRight,
  Loader2,
  Mail,
  IdCard,
  AlertCircle,
} from "lucide-react";
import pcxLogo from "@/assets/pcx-logo.png";
import { getBrokerages, type Brokerage } from "@/services/brokerages";
import { getPcxProfile, linkPcxAccount } from "@/services/integrations";
import { ApiError, apiRequest } from "@/lib/api";
import { USE_MOCKS } from "@/mocks/config";

const PCX_LINK_CREDENTIALS_KEY = "pcx_link_credentials";
const PCX_LINK_ERROR_KEY = "pcx_link_error";
const PCX_LINK_LAST_EMAIL_KEY = "pcx_link_last_email";

function readPendingPcxCredentials(): { email: string; password: string } | null {
  try {
    const raw = sessionStorage.getItem(PCX_LINK_CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; password?: string };
    if (!parsed?.email || !parsed?.password) return null;
    return { email: parsed.email, password: parsed.password };
  } catch {
    return null;
  }
}

function clearPendingPcxCredentials() {
  try {
    sessionStorage.removeItem(PCX_LINK_CREDENTIALS_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

function setPcxLinkError(message: string, email?: string) {
  try {
    sessionStorage.setItem(PCX_LINK_ERROR_KEY, message);
    if (email) sessionStorage.setItem(PCX_LINK_LAST_EMAIL_KEY, email);
  } catch {
    /* sessionStorage unavailable */
  }
}

type ModalView =
  | "select"
  | "create"
  | "creating"
  | "created"
  | "bindingPermissions"
  | "bindingLoading"
  | "bindingSuccess"
  | "bindingFailed"
  | "verifyingDocument";

interface Platform {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

function isPcxPlatform(p: Pick<Platform, "id" | "name">): boolean {
  const id = p.id.toLowerCase();
  const name = p.name.toLowerCase();
  return id === "pcx" || id === "primecodex" || name === "pcx" || name.includes("primecodex");
}

function brokerageToPlatform(b: Brokerage): Platform {
  return {
    id: b.id,
    name: b.name,
    icon: b.logo || b.name.charAt(0).toUpperCase(),
    description: b.description || b.server || "",
    available: (b.status ?? "").toLowerCase() === "active",
  };
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (isPcxPlatform(platform)) {
    return <img src={pcxLogo} alt="PCX" className={`object-contain ${className || ""}`} />;
  }
  if (platform.icon.startsWith("http") || platform.icon.startsWith("/")) {
    return (
      <img
        src={platform.icon}
        alt={platform.name}
        className={`object-contain ${className || ""}`}
      />
    );
  }
  return <span className={className}>{platform.icon}</span>;
}

interface PlatformModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: (platform: string) => void;
  onViewChange?: (view: string) => void;
  currentView?: string;
  userName?: string;
  userEmail?: string;
}

function Stepper({ step, pending = false }: { step: number; pending?: boolean }) {
  const steps = [
    { num: 1, label: "PLATFORM" },
    { num: 2, label: "BINDING" },
    { num: 3, label: "VERFICATION" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const completed = pending ? s.num < step : step > s.num;
        const active = !pending && step === s.num;
        return (
          <div key={s.num} className="flex items-center">
            <div className="flex items-center gap-2">
              {completed ? (
                <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
              ) : (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    active ? "bg-[#2563EB] text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s.num}
                </div>
              )}
              <span
                className={`text-sm font-semibold tracking-wider ${
                  active ? "text-gray-800" : completed ? "text-gray-800" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 ${completed ? "bg-gray-800" : active ? "bg-[#2563EB]" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center my-8">
      <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#2563EB] animate-spin" />
    </div>
  );
}

export function PlatformModal({
  open,
  onClose,
  onContinue,
  onViewChange,
  currentView,
  userName,
  userEmail,
}: PlatformModalProps) {
  const [internalView, setInternalView] = useState<ModalView>("select");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    data: brokeragesData,
    isLoading: brokeragesLoading,
    isError: brokeragesError,
  } = useQuery({
    queryKey: ["brokerages", { status: "active" }],
    queryFn: () => getBrokerages({ status: "active" }),
    enabled: open,
  });

  const platforms = useMemo<Platform[]>(
    () => (brokeragesData?.data ?? []).map(brokerageToPlatform),
    [brokeragesData],
  );

  const view: ModalView = (currentView as ModalView) || internalView;

  const isVerifyView = view === "verifyingDocument";
  const profileQuery = useQuery({
    queryKey: ["pcx-profile"],
    queryFn: getPcxProfile,
    enabled: isVerifyView,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const emailConfirmed = profileQuery.data?.email_confirmed === true;
  const kycApproved = profileQuery.data?.kyc_approved === true;
  const allVerified = emailConfirmed && kycApproved;

  const navigate = useNavigate();
  const isBindingLoading = view === "bindingLoading";
  const [pendingCreds, setPendingCreds] = useState<{ email: string; password: string } | null>(
    null,
  );
  const linkMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) => linkPcxAccount(creds),
    onSuccess: () => {
      clearPendingPcxCredentials();
      navigate({ to: "/dashboard/strategies" });
    },
  });
  const linkError = linkMutation.error;

  useEffect(() => {
    if (!isBindingLoading) return;
    if (pendingCreds) return;
    const creds = readPendingPcxCredentials();
    if (creds) {
      clearPendingPcxCredentials();
      setPendingCreds(creds);
    }
  }, [isBindingLoading, pendingCreds]);

  useEffect(() => {
    if (!isBindingLoading) return;
    if (!pendingCreds) return;
    if (linkMutation.isPending || linkMutation.isSuccess || linkMutation.isError) return;
    linkMutation.mutate(pendingCreds);
  }, [isBindingLoading, pendingCreds, linkMutation]);

  useEffect(() => {
    if (!isBindingLoading && (linkMutation.isError || linkMutation.isSuccess)) {
      linkMutation.reset();
      setPendingCreds(null);
    }
  }, [isBindingLoading, linkMutation]);

  // On link error, surface the message back on the form page that submitted
  // the credentials (/pcxfx/login or /pcxfx/registration) instead of leaving
  // the user stranded on /onboarding/binding-loading.
  useEffect(() => {
    if (!isBindingLoading) return;
    if (!linkError) return;
    const apiErr = linkError instanceof ApiError ? linkError : null;
    const isAnotherUser =
      apiErr?.status === 409 && (apiErr.message || "").toLowerCase().includes("another user");
    const message = isAnotherUser
      ? "This PCX account is already linked to a different Batman user. Please use a different PCX account or contact support."
      : apiErr?.status === 422
        ? "Invalid PCX credentials. Please try again."
        : apiErr?.status === 401
          ? "Your Batman session expired. Please log in again."
          : apiErr?.status === 400
            ? "Unknown provider. Please contact support."
            : linkError instanceof Error
              ? linkError.message
              : "Failed to link PCX account.";
    setPcxLinkError(message, pendingCreds?.email);
    clearPendingPcxCredentials();
    let flow = "";
    try {
      flow = sessionStorage.getItem("pcx_flow") || "";
    } catch {
      /* sessionStorage unavailable */
    }
    linkMutation.reset();
    setPendingCreds(null);
    navigate({ to: flow === "register" ? "/pcxfx/registration" : "/pcxfx/login" });
  }, [isBindingLoading, linkError, pendingCreds, linkMutation, navigate]);

  const retryLink = () => {
    if (pendingCreds) {
      linkMutation.reset();
      linkMutation.mutate(pendingCreds);
    }
  };

  const setView = (newView: ModalView) => {
    setInternalView(newView);
    if (onViewChange) {
      onViewChange(newView);
    }
  };

  useEffect(() => {
    if (!open) {
      setInternalView("select");
      setSelectedPlatform("");
      setDropdownOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (view === "creating") {
      const timer = setTimeout(() => setView("created"), 3000);
      return () => clearTimeout(timer);
    }
    if (view === "bindingSuccess") {
      const timer = setTimeout(() => setView("verifyingDocument"), 2000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  if (!open) return null;

  const selected = platforms.find((p) => p.id === selectedPlatform);
  const platformName = selected?.name || "PCX";
  const hasPlatforms = platforms.length > 0;

  const handleContinue = () => {
    if (!selectedPlatform) return;
    if (view === "select") {
      setView("bindingPermissions");
    } else if (view === "create") {
      setView("creating");
    }
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail
      ? userEmail.slice(0, 2).toUpperCase()
      : "U";

  const displayName = userName || userEmail || "User";

  const footer = (
    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
      <span className="text-xs text-gray-400">© 2026 Batman Institutional Infrastructure</span>
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-gray-300" />
      </div>
    </div>
  );

  const dropdown = (
    <div className="relative mb-6">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-colors text-left ${
          selectedPlatform ? "border-[#2563EB]" : "border-gray-200"
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
              <PlatformIcon platform={selected} className="w-6 h-6" />
            </div>
            <span className="font-semibold text-gray-900">{selected.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-lg">
            {brokeragesLoading
              ? "Loading platforms..."
              : brokeragesError
                ? "Failed to load platforms"
                : "Select your platform"}
          </span>
        )}
        {dropdownOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-y-auto max-h-64">
          {brokeragesLoading && (
            <div className="px-5 py-4 text-sm text-gray-500">Loading platforms...</div>
          )}
          {brokeragesError && !brokeragesLoading && (
            <div className="px-5 py-4 text-sm text-red-500">Failed to load platforms</div>
          )}
          {!brokeragesLoading && !brokeragesError && !hasPlatforms && (
            <div className="px-5 py-4 text-sm text-gray-500">No platforms available</div>
          )}
          {platforms.map((platform, i) => (
            <div key={platform.id}>
              <button
                disabled={!platform.available}
                onClick={() => {
                  if (platform.available) {
                    setSelectedPlatform(platform.id);
                    setDropdownOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                  platform.available
                    ? selectedPlatform === platform.id
                      ? "bg-[#F0F4FF]"
                      : "hover:bg-gray-50"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden ${
                      platform.available ? "bg-gray-100" : "bg-gray-50"
                    }`}
                  >
                    <PlatformIcon
                      platform={platform}
                      className={`w-6 h-6 ${platform.available ? "text-gray-600" : "text-gray-300"}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${platform.available ? "text-gray-900" : "text-gray-400"}`}
                      >
                        {platform.name}
                      </span>
                      {platform.available ? (
                        <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded">
                          AVAILABLE
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          COMING SOON
                        </span>
                      )}
                    </div>
                    {platform.description && (
                      <span className="text-sm text-gray-500">{platform.description}</span>
                    )}
                  </div>
                </div>
                {selectedPlatform === platform.id && platform.available && (
                  <div className="w-6 h-6 rounded-full border-2 border-[#2563EB] bg-white flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#2563EB]" />
                  </div>
                )}
              </button>
              {i < platforms.length - 1 && <div className="mx-5 h-px bg-gray-100" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case "select":
        return (
          <>
            <Stepper step={1} />
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Select your platform
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Choose the platform that will be linked to your account.
            </p>
            {dropdown}
            <button
              onClick={handleContinue}
              disabled={!selectedPlatform}
              className="w-full py-4 rounded-xl text-sm font-semibold tracking-wider transition-colors mb-6"
              style={{
                backgroundColor: selectedPlatform ? "#2563EB" : "#E2E0EA",
                color: selectedPlatform ? "white" : "#9994A8",
              }}
            >
              Continue
            </button>
            <p className="text-center text-sm text-gray-500 mb-3">
              Don't have account yet?{" "}
              <button
                onClick={() => {
                  setView("create");
                  setSelectedPlatform("");
                  setDropdownOpen(false);
                }}
                className="font-semibold text-gray-700 underline hover:text-gray-900"
              >
                Create New
              </button>
            </p>
            <p className="text-center text-sm">
              <button onClick={onClose} className="text-gray-500 underline hover:text-gray-700">
                Or Skip For Now
              </button>
            </p>
          </>
        );

      case "create":
        return (
          <>
            <Stepper step={1} />
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Create your Platform Account
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Select the platform where your want your account is registered.
            </p>
            {dropdown}
            <button
              onClick={handleContinue}
              disabled={!selectedPlatform}
              className="w-full py-4 rounded-xl text-sm font-semibold tracking-wider transition-colors mb-6"
              style={{
                backgroundColor: selectedPlatform ? "#2563EB" : "#E2E0EA",
                color: selectedPlatform ? "white" : "#9994A8",
              }}
            >
              Continue
            </button>
            <p className="text-center text-sm text-gray-500 mb-3">
              Have Account?{" "}
              <button
                onClick={() => {
                  setView("select");
                  setSelectedPlatform("");
                  setDropdownOpen(false);
                }}
                className="font-semibold text-gray-700 underline hover:text-gray-900"
              >
                Login
              </button>
            </p>
            <p className="text-center text-sm">
              <button onClick={onClose} className="text-gray-500 underline hover:text-gray-700">
                Or Skip For Now
              </button>
            </p>
          </>
        );

      case "creating":
        return (
          <>
            <Stepper step={1} />
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Create your Account
            </h2>
            <p className="text-gray-500 text-center mb-8">
              You'll be redirected to {platformName} to continue this action.
            </p>
            <LoadingSpinner />
            <p className="text-lg font-semibold text-gray-900 text-center mb-4">
              Waiting for confirmation from {platformName}...
            </p>
            <p className="text-center mb-8">
              <button className="text-[#2563EB] font-semibold inline-flex items-center gap-1 hover:underline">
                Didn't see the window? Open again <ExternalLink className="w-4 h-4" />
              </button>
            </p>
            <p className="text-center text-sm">
              <button onClick={onClose} className="text-gray-500 underline hover:text-gray-700">
                Or Skip For Now
              </button>
            </p>
          </>
        );

      case "created":
        return (
          <>
            <Stepper step={2} />
            <div className="border-t border-gray-100 pt-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[#10B981] flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                {platformName} account successfully created!
              </h2>
              <p className="text-gray-500 text-center mb-8 max-w-sm mx-auto">
                The next step is to connect your {platformName} account to Batman so you can start
                following strategies.
              </p>

              {/* User card */}
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#E0E7FF] flex items-center justify-center text-sm font-bold text-[#6366F1]">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{displayName}</p>
                    <p className="text-sm text-gray-500">{userEmail}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  PCX
                </span>
              </div>

              {/* Info box */}
              <div className="bg-gray-50 rounded-xl p-4 flex gap-3 mb-8">
                <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  The binding process is required for Batman to connect your account with the
                  selected strategy. This is a separate step from registration.
                </p>
              </div>

              {/* Continue to Binding button */}
              <button
                onClick={() => setView("bindingPermissions")}
                className="w-full py-4 rounded-xl text-white font-semibold tracking-wider flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                style={{ backgroundColor: "#2563EB" }}
              >
                Continue to Binding
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        );

      case "bindingPermissions":
        return (
          <>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <Stepper step={2} />
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Connect your Platform account
            </h2>
            <p className="text-gray-500 text-center mb-8">
              You'll be redirected to {platformName} to securely confirm the connection.
            </p>

            <div className="mb-6">
              <p className="text-xs font-bold text-gray-500 tracking-wider mb-4">
                BATMAN WILL BE ABLE TO:
              </p>
              <div className="space-y-4">
                {[
                  "Read your account balance, equity, and transaction history",
                  "Process strategy allocation requests based on your instructions",
                  "Display Money Manager performance data on your dashboard",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#2563EB] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold text-gray-500 tracking-wider mb-4">
                BATMAN WILL NEVER:
              </p>
              <div className="space-y-4">
                {[
                  "Store your broker account password or login credentials",
                  "Withdraw or transfer your funds without your explicit instruction",
                  "Execute trades or make investment decisions on your behalf",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600">
                You can revoke this access at any time from your account settings. By continuing,
                you agree to our{" "}
                <a href="#" className="text-[#2563EB] underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-[#2563EB] underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setView("created")}
                className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  let flow: string | null = null;
                  try {
                    flow = sessionStorage.getItem("pcx_flow");
                  } catch {
                    /* sessionStorage unavailable */
                  }
                  if (flow === "register") {
                    setView("verifyingDocument");
                  } else {
                    setView("bindingLoading");
                  }
                }}
                className="flex-1 py-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                style={{ backgroundColor: "#2563EB" }}
              >
                Connect account <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </>
        );

      case "bindingLoading": {
        const linkApiError = linkError instanceof ApiError ? linkError : null;
        const isLinkedToAnotherUser =
          linkApiError?.status === 409 &&
          (linkApiError.message || "").toLowerCase().includes("another user");
        const linkErrorMessage = isLinkedToAnotherUser
          ? "This PCX account is already linked to a different Batman user. Please use a different PCX account or contact support."
          : linkApiError?.status === 422
            ? "Invalid PCX credentials. Please try again."
            : linkApiError?.status === 401
              ? "Your Batman session expired. Please log in again."
              : linkApiError?.status === 400
                ? "Unknown provider. Please contact support."
                : linkError instanceof Error
                  ? linkError.message
                  : null;
        const allowRetry = !isLinkedToAnotherUser;
        const credentialsMissing = !pendingCreds && !linkMutation.isPending;
        return (
          <>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <Stepper step={2} />
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Connect your Platform account
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Linking your {platformName} account to Batman...
            </p>

            {linkErrorMessage ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                </div>
                <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-sm text-center">
                  {linkErrorMessage}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {allowRetry ? "Skip for now" : "Back to strategies"}
                  </button>
                  {allowRetry && (
                    <button
                      onClick={retryLink}
                      disabled={!pendingCreds || linkMutation.isPending}
                      className="flex-1 py-4 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: "#2563EB" }}
                    >
                      {linkMutation.isPending ? "Retrying..." : "Retry"}
                    </button>
                  )}
                </div>
              </>
            ) : credentialsMissing ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-yellow-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center mb-6">
                  No pending PCX credentials found. Please go back and log in to {platformName}.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to strategies
                </button>
              </>
            ) : (
              <>
                <LoadingSpinner />
                <p className="text-lg font-semibold text-gray-900 text-center mb-4">
                  Connecting to {platformName}...
                </p>
                <p className="text-sm text-gray-500 text-center">Do not close this window.</p>
              </>
            )}
          </>
        );
      }

      case "bindingSuccess":
        return (
          <>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <Stepper step={3} pending />
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Successed Binding</h2>
            <p className="text-gray-500 text-center mb-8">
              Please Wait, the window automatically redirected to the next step
            </p>
            <div className="flex justify-center my-8">
              <div className="w-16 h-16 rounded-full bg-[#10B981] flex items-center justify-center">
                <Check className="w-9 h-9 text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="text-center mb-8">
              <button className="text-[#2563EB] font-semibold inline-flex items-center gap-1 hover:underline">
                The Window didn't changed? Click this <ExternalLink className="w-4 h-4" />
              </button>
            </p>
          </>
        );

      case "bindingFailed":
        return (
          <>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <Stepper step={2} />
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Connect your Platform account
            </h2>
            <p className="text-gray-500 text-center mb-8">
              You will be redirected to PCX to log in and confirm this connection.
            </p>
            <div className="flex justify-center my-8">
              <div className="w-24 h-24 rounded-full border-4 border-gray-300 flex items-center justify-center">
                <X className="w-12 h-12 text-gray-400" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-center text-gray-500 mb-8">Failed to connect with {platformName}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={() => setView("bindingPermissions")}
                className="flex-1 py-4 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: "#2563EB" }}
              >
                Try Again
              </button>
            </div>
          </>
        );

      case "verifyingDocument": {
        const items = [
          {
            Icon: Mail,
            title: "Email verification",
            desc: "Required for account-related updates",
            done: emailConfirmed,
          },
          {
            Icon: IdCard,
            title: "Document Verification",
            desc: "Some documents may be required for additional account access",
            done: kycApproved,
          },
        ];
        const pcxVerificationUrl =
          import.meta.env.VITE_PCX_VERIFICATION_URL ?? "https://my.pcxfx.com";
        const openVerifyOnBroker = async () => {
          if (USE_MOCKS) {
            // Demo: verification happens locally instead of redirecting to the broker.
            await apiRequest("/integrations/pcx/verify-now", { method: "POST" });
            await profileQuery.refetch();
            return;
          }
          window.open(pcxVerificationUrl, "_blank", "noopener,noreferrer");
        };
        return (
          <>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <Stepper step={allVerified ? 4 : 3} />

            {profileQuery.isLoading ? (
              <>
                <div className="flex justify-center mt-6 mb-4">
                  <LoadingSpinner />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 text-center">
                  Checking verification status...
                </h2>
                <p className="text-gray-500 text-center mb-8 max-w-md mx-auto">
                  Please wait while we fetch your verification status from {platformName}.
                </p>
              </>
            ) : profileQuery.isError ? (
              <>
                <div className="flex justify-center mt-6 mb-4">
                  <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 text-center">
                  Failed to load verification status
                </h2>
                <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-sm text-center">
                  {profileQuery.error instanceof Error
                    ? profileQuery.error.message
                    : "Could not reach verification service. Please try again."}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => profileQuery.refetch()}
                    disabled={profileQuery.isFetching}
                    className="flex-1 py-4 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: "#2563EB" }}
                  >
                    {profileQuery.isFetching ? "Retrying..." : "Retry"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center mt-6 mb-4">
                  {allVerified ? (
                    <div className="w-20 h-20 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center">
                        <Check className="w-8 h-8 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  ) : (
                    <LoadingSpinner />
                  )}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 text-center">
                  {allVerified ? "Account connected successfully" : "Verification status"}
                </h2>
                <p className="text-gray-500 text-center mb-8 max-w-md mx-auto">
                  {allVerified
                    ? "You can now explore available strategies and platform features."
                    : "Some features on Batman may depend on the verification status of your connected broker account."}
                </p>

                <div className="space-y-3 mb-6">
                  {items.map(({ Icon, title, desc, done }) => (
                    <div
                      key={title}
                      className="border border-gray-200 rounded-xl p-4 flex items-center gap-4"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          done ? "bg-[#D1FAE5]" : "bg-[#EEF2FF]"
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${done ? "text-[#10B981]" : "text-[#2563EB]"}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{title}</p>
                        <p className="text-sm text-gray-500">{desc}</p>
                      </div>
                      {done ? (
                        <div className="flex items-center gap-1 text-[#10B981] font-semibold text-sm">
                          <Check className="w-4 h-4" strokeWidth={3} />
                          Completed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500 font-medium text-sm">
                          <AlertCircle className="w-4 h-4" />
                          Incomplete
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {allVerified ? (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/dashboard" })}
                    className="w-full block text-center py-4 rounded-xl text-white font-semibold tracking-wider transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#2563EB" }}
                  >
                    Explore Strategies
                  </button>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <button
                        onClick={() => profileQuery.refetch()}
                        disabled={profileQuery.isFetching}
                        className="flex-1 py-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        {profileQuery.isFetching ? "Checking..." : "Refresh"}
                      </button>
                      <button
                        onClick={openVerifyOnBroker}
                        className="flex-1 py-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                        style={{ backgroundColor: "#2563EB" }}
                      >
                        {USE_MOCKS ? "Verify now (demo)" : "Verify on Broker"}{" "}
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-center mt-4">
                      <button
                        onClick={onClose}
                        className="text-sm text-gray-500 underline hover:text-gray-700"
                      >
                        Skip for now
                      </button>
                    </p>
                  </>
                )}
              </>
            )}
          </>
        );
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(251, 248, 255, 0.5)" }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 px-12 py-10 pb-8 relative max-h-[95vh] min-h-[640px] overflow-y-auto flex flex-col">
        <div className="flex-1 flex flex-col">{renderContent()}</div>
        {footer}
      </div>
    </div>
  );
}
