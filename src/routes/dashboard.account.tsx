import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, AlertCircle, Clock } from "lucide-react";
import { DashboardHeader } from "./dashboard";
import { getMyProfile } from "@/services/users";
import { getPcxLinkStatus } from "@/services/integrations";
import { clearAuthSession } from "@/lib/auth-token";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/dashboard/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Account — Batman" },
      {
        name: "description",
        content: "Manage your profile, broker connection, and account status.",
      },
    ],
  }),
});

const DASH = "—";

type DocState = "needed" | "in_progress" | "complete";

function deriveDocState(linked?: boolean, kycApproved?: boolean): DocState {
  if (linked && kycApproved) return "complete";
  if (linked && !kycApproved) return "in_progress";
  return "needed";
}

function formatRole(userType?: string): string {
  if (!userType) return DASH;
  const map: Record<string, string> = {
    investor: "Copier",
    money_manager: "Money Manager",
  };
  return map[userType] ?? userType;
}

function formatDate(iso?: string): string {
  if (!iso) return DASH;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return DASH;
  return new Date(t).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPasswordAge(iso?: string): string {
  if (!iso) return "Set a password to keep your account secure";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Set a password to keep your account secure";
  const days = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
  if (days < 1) return "Last changed today";
  if (days < 30) return `Last changed ${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 90) return `Last changed ${Math.floor(days / 30)} month${days < 60 ? "" : "s"} ago`;
  return "Last changed more than 90 days ago";
}

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: me, isLoading: meLoading, isError: meError } = useQuery({
    queryKey: ["me"],
    queryFn: getMyProfile,
    staleTime: 30_000,
  });

  const { data: pcx, isLoading: pcxLoading } = useQuery({
    queryKey: ["pcx-link-status"],
    queryFn: getPcxLinkStatus,
    retry: false,
    staleTime: 30_000,
  });

  const docState = deriveDocState(pcx?.linked, pcx?.kyc_approved);
  const linked = Boolean(pcx?.linked);
  const brokerName = pcx?.provider === "pcx" ? "PrimeCodex" : pcx?.provider || DASH;

  const handleSessionPurge = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — supabase session may not exist for Batman-API-only users
    }
    clearAuthSession();
    queryClient.clear();
    navigate({ to: "/login" });
  };

  if (meLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <DashboardHeader />
        <div className="flex justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" />
        </div>
      </div>
    );
  }

  if (meError || !me) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <DashboardHeader />
        <main className="max-w-md mx-auto px-6 py-20">
          <div className="bg-white border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-600 mb-4">
              Failed to load your account profile. Please try again.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Account</h1>
          <p className="text-sm text-gray-500">
            Manage your profile, broker connection, and account status.
          </p>
        </header>

        {/* Profile Information */}
        <Card>
          <CardHeader title="Profile Information">
            <button
              disabled
              title="Coming soon"
              className="text-sm font-semibold text-gray-400 cursor-not-allowed"
            >
              Edit
            </button>
          </CardHeader>
          <Row label="Name" value={me.name || DASH} />
          <Row label="Email" value={me.email || DASH} />
          <Row label="Username" value={me.username ? `@${me.username}` : DASH} />
          <Row label="Phone" value={me.phone || DASH} />
          <Row label="Role" value={formatRole(me.user_type)} last />
        </Card>

        {/* Broker Connection */}
        <Card>
          <CardHeader title="Broker Connection" />
          <Row label="Connected broker" value={pcxLoading ? "…" : brokerName} />
          <Row
            label="Connection status"
            value={
              pcxLoading ? (
                <span className="text-gray-400">…</span>
              ) : linked ? (
                <Pill tone="green">Connected</Pill>
              ) : (
                <Pill tone="orange">Not connected</Pill>
              )
            }
          />
          <Row label="Connected since" value={formatDate(pcx?.linked_at)} last />
          <div className="m-6 mt-2 bg-gray-50 border border-gray-100 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-600 max-w-md">
              {linked
                ? "To manage your broker account, deposit, or withdraw funds, continue with PrimeCodex."
                : "Link your broker to start following strategies on Batman."}
            </p>
            {linked ? (
              <a
                href="https://my.pcxfx.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[#2563EB] border border-[#2563EB] px-4 py-2 rounded-lg hover:bg-[#EFF6FF]"
              >
                Continue with Broker
              </a>
            ) : (
              <Link
                to="/onboarding/$step"
                params={{ step: "select" }}
                className="text-sm font-semibold text-white bg-[#2563EB] px-4 py-2 rounded-lg hover:opacity-90"
              >
                Link Broker
              </Link>
            )}
          </div>
        </Card>

        {/* Document Verification */}
        <Card>
          <CardHeader title="Document Verification" />
          <Row label="Broker" value={linked ? brokerName : DASH} />
          <Row
            label="Status"
            value={
              pcxLoading ? (
                <span className="text-gray-400">…</span>
              ) : docState === "complete" ? (
                <Pill tone="green">Verified</Pill>
              ) : docState === "in_progress" ? (
                <Pill tone="grey">In Progress</Pill>
              ) : (
                <Pill tone="orange">Verification needed</Pill>
              )
            }
            last
          />
          {!pcxLoading && (
            <div className="px-6 pb-6">
              <DocAlert state={docState} />
            </div>
          )}
        </Card>

        {/* Security */}
        <Card>
          <CardHeader title="Security" />
          <div className="px-6 pb-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-bold text-gray-900">Password</p>
              <p className="text-xs text-gray-500">
                {formatPasswordAge(me.last_password_changed_at)}
              </p>
            </div>
            <Link
              to="/change-password"
              className="text-sm font-semibold text-[#2563EB] border border-[#2563EB] px-4 py-2 rounded-lg hover:bg-[#EFF6FF]"
            >
              Change Password
            </Link>
          </div>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader title="Support" />
          <SupportRow
            title="Help Center"
            body="Browse guides and frequently asked questions."
            to="/dashboard/learn"
          />
          <SupportRow
            title="Contact Support"
            body="Get help from the Batman support team."
            last
          />
        </Card>

        {/* Delete Account */}
        <section className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-[#DC2626] mb-1">Sign out from this device</p>
            <p className="text-sm text-gray-600">
              Permanent account deletion is not yet available — please contact support to request
              it. You can sign out below.
            </p>
          </div>
          <button
            onClick={() => setDeleteOpen(true)}
            className="text-sm font-semibold text-[#DC2626] border border-[#DC2626] px-4 py-2 rounded-lg hover:bg-white"
          >
            Sign Out
          </button>
        </section>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out from Batman?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your strategies and portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSessionPurge}
              disabled={deleting}
              className="bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            >
              {deleting ? "Signing out..." : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="bg-white border border-gray-200 rounded-2xl">{children}</section>;
}

function CardHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`px-6 py-4 flex items-center justify-between gap-4 ${
        last ? "" : "border-b border-gray-100"
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <div className="text-sm font-semibold text-gray-900 text-right break-all">{value}</div>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "green" | "orange" | "grey";
  children: React.ReactNode;
}) {
  const styles = {
    green: "bg-[#ECFDF5] text-[#059669]",
    orange: "bg-[#FFF7ED] text-[#EA580C]",
    grey: "bg-gray-100 text-gray-600",
  }[tone];
  const dot = {
    green: "bg-[#10B981]",
    orange: "bg-[#F97316]",
    grey: "bg-gray-400",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

function DocAlert({ state }: { state: DocState }) {
  if (state === "complete") {
    return (
      <div className="bg-[#ECFDF5] rounded-xl p-4 flex items-start gap-3 flex-wrap">
        <div className="w-8 h-8 rounded-full bg-[#F5F5F4] flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-[#EA580C]" />
        </div>
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm font-bold text-gray-900 mb-0.5">Verification complete</p>
          <p className="text-sm text-gray-600">
            Your document verification is complete. You can now follow strategies on Batman.
          </p>
        </div>
        <Link
          to="/dashboard/strategies"
          className="text-sm font-semibold text-gray-900 border border-gray-300 bg-white px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          Explore Strategies
        </Link>
      </div>
    );
  }
  if (state === "in_progress") {
    return (
      <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-start gap-3 flex-wrap">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm font-bold text-gray-900 mb-0.5">Verification in progress</p>
          <p className="text-sm text-gray-600">
            Your document verification is being processed by your broker. This may take some time.
            You can check the latest status by continuing with your broker.
          </p>
        </div>
        <a
          href="https://my.pcxfx.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-900 border border-gray-300 bg-white px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          Check Status with Broker
        </a>
      </div>
    );
  }
  return (
    <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-4 flex items-start gap-3 flex-wrap">
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
        <AlertCircle className="w-4 h-4 text-[#EA580C]" />
      </div>
      <div className="flex-1 min-w-[240px]">
        <p className="text-sm font-bold text-gray-900 mb-0.5">Document verification needed</p>
        <p className="text-sm text-gray-600">
          Complete your document verification with your broker before you can follow strategies.
        </p>
      </div>
      <Link
        to="/onboarding/$step"
        params={{ step: "binding" }}
        className="text-sm font-semibold text-white bg-[#2563EB] px-4 py-2 rounded-lg hover:opacity-90"
      >
        Continue with Broker
      </Link>
    </div>
  );
}

function SupportRow({
  title,
  body,
  to,
  last,
}: {
  title: string;
  body: string;
  to?: "/dashboard/learn";
  last?: boolean;
}) {
  const content = (
    <div
      className={`px-6 py-4 flex items-center justify-between gap-4 ${
        last ? "" : "border-b border-gray-100"
      } hover:bg-gray-50`}
    >
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{body}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return (
    <button type="button" className="w-full text-left">
      {content}
    </button>
  );
}
