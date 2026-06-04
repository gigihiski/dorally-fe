import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPcxLinkStatus } from "@/services/integrations";
import { listMyFollowees } from "@/services/follows";
import { isAuthenticated } from "@/lib/auth-token";
import { DashboardView, type DashboardState } from "./dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
  head: () => ({
    meta: [
      { title: "Dashboard — Batman" },
      {
        name: "description",
        content:
          "Your Batman dashboard: setup progress, popular strategies, and portfolio overview.",
      },
    ],
  }),
});

function useDashboardState(): DashboardState {
  const enabled = typeof window !== "undefined" && isAuthenticated();
  const { data: status } = useQuery({
    queryKey: ["pcx-link-status"],
    queryFn: getPcxLinkStatus,
    enabled,
    retry: false,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    // Poll only while we expect a change: linked but KYC not approved.
    refetchInterval: (q) => {
      const d = q.state.data;
      return d?.linked && !d.kyc_approved ? 15_000 : false;
    },
  });
  const { data: followees } = useQuery({
    queryKey: ["followees-me", "active"],
    queryFn: () => listMyFollowees({ status: "active", limit: 1 }),
    enabled,
    retry: false,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  if (!status?.linked) return "not-connected";
  if (!status.kyc_approved) return "need-verify";
  if (!followees || followees.length === 0) return "need-following";
  return "followed";
}

function DashboardIndex() {
  const state = useDashboardState();
  return <DashboardView state={state} />;
}
