import { createFileRoute, redirect } from "@tanstack/react-router";

// `/strategies` has no standalone page — strategies live under the dashboard.
// Redirect any navigation here (e.g. the onboarding "Explore Strategies" CTA)
// to the canonical /dashboard/strategies route.
export const Route = createFileRoute("/strategies/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/strategies", replace: true });
  },
});
