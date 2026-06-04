import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "./dashboard";

export const Route = createFileRoute("/dashboard/need-verify")({
  component: () => <DashboardView state="need-verify" />,
  head: () => ({
    meta: [{ title: "Dashboard · Need Verify Documents — Batman" }],
  }),
});
