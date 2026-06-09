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
  /** Demo account value. */
  accountValue: number;
  /** Demo change today (currency). */
  todaysChange: number;
  /** Demo last settled strategy fee (currency). */
  lastFee: number;
  /** Demo next fee settlement date label. */
  nextFeeCheck: string;
};

const DEMO_ACCOUNT_ID = "123456";
// Fixed demo figures so the dashboard/portfolio totals line up with the design
// (account 5,842.40 + available 5,000 = 10,842.40; +84.20 today).
const DEMO_ACCOUNT_VALUE = 5842.4;
const DEMO_TODAYS_CHANGE = 84.2;
const DEMO_LAST_FEE = 8.4;
const DEMO_NEXT_FEE_CHECK = "Feb 21, 2026";

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
        accountValue: DEMO_ACCOUNT_VALUE,
        todaysChange: DEMO_TODAYS_CHANGE,
        lastFee: DEMO_LAST_FEE,
        nextFeeCheck: DEMO_NEXT_FEE_CHECK,
      };
    })
    .filter((x): x is FollowedStrategy => x !== null);

  return { strategies, ...query };
}
