import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "./dashboard";

export const Route = createFileRoute("/dashboard/not-connected")({
  component: () => <DashboardView state="not-connected" />,
  head: () => ({
    meta: [{ title: "Dashboard · Not Connected — Batman" }],
  }),
});
