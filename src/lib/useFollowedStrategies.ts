import { useQuery } from "@tanstack/react-query";
import { listMyFollowees } from "@/services/follows";
import { popularStrategies, type PopularStrategy } from "@/data/popularStrategies";

export type FollowedStrategy = PopularStrategy & {
  /** Mock followee record id (used to stop following). */
  followeeId: string;
  /** Mock money-manager id, e.g. "mm-consistent-strategy". */
  moneyManagerId: string;
  /** Demo trading account the strategy is followed with. */
  accountId: string;
  /** Demo account value, derived from this-month performance. */
  accountValue: number;
};

const DEMO_ACCOUNT_ID = "123456";
const DEMO_BASE_VALUE = 5000;

/**
 * Resolves the user's ACTIVE followees (from the mock) into displayable strategy
 * cards by matching `money_manager_id` ("mm-{id}") back to src/data/popularStrategies.
 * Shared by the dashboard Portfolio Preview and the Portfolio page.
 */
export function useFollowedStrategies() {
  const query = useQuery({
    queryKey: ["followees-me", "active"],
    queryFn: () => listMyFollowees({ status: "active" }),
    retry: false,
    staleTime: 5_000,
  });

  const strategies: FollowedStrategy[] = (query.data ?? [])
    .map((f): FollowedStrategy | null => {
      const stratId = (f.money_manager_id ?? "").replace(/^mm-/, "");
      const s = popularStrategies.find((p) => p.id === stratId);
      if (!s || !f.id) return null;
      return {
        ...s,
        followeeId: f.id,
        moneyManagerId: f.money_manager_id ?? "",
        accountId: DEMO_ACCOUNT_ID,
        accountValue: Number((DEMO_BASE_VALUE * (1 + s.thisMonth / 100)).toFixed(2)),
      };
    })
    .filter((x): x is FollowedStrategy => x !== null);

  return { strategies, ...query };
}
