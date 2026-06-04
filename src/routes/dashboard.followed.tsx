import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "./dashboard";

export const Route = createFileRoute("/dashboard/followed")({
  component: () => <DashboardView state="followed" />,
  head: () => ({
    meta: [{ title: "Dashboard · Followed Strategies — Batman" }],
  }),
});
