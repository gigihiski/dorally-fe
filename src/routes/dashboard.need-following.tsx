import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "./dashboard";

export const Route = createFileRoute("/dashboard/need-following")({
  component: () => <DashboardView state="need-following" />,
  head: () => ({
    meta: [{ title: "Dashboard · Need Following — Batman" }],
  }),
});
