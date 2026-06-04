import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FileText } from "lucide-react";
import { DashboardHeader } from "./dashboard";
import {
  listSavedMoneyManagers,
  unsaveMoneyManager,
  type SavedCard,
} from "@/services/saved-money-managers";

export const Route = createFileRoute("/dashboard/saved-strategies")({
  component: SavedStrategiesPage,
  head: () => ({
    meta: [
      { title: "Saved Strategies — Batman" },
      { name: "description", content: "Strategies you saved to review later." },
    ],
  }),
});

const DASH = "—";
const AVATAR_PALETTE = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#0EA5E9"];

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return (
    trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function getAvatarBg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatCount(n?: number): string {
  if (typeof n !== "number") return DASH;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

function SavedStrategiesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["saved-money-managers", { page: 1, limit: 50 }],
    queryFn: () => listSavedMoneyManagers({ page: 1, limit: 50 }),
  });
  const cards = data?.data ?? [];

  const queryClient = useQueryClient();
  const unsaveMutation = useMutation({
    mutationFn: (accountId: string) => unsaveMoneyManager(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-money-managers"] });
      queryClient.invalidateQueries({ queryKey: ["money-manager"] });
    },
  });

  const pendingId =
    unsaveMutation.isPending ? (unsaveMutation.variables as string | undefined) : undefined;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Saved Strategies</h1>
            <p className="text-sm text-gray-500">
              Explore available strategies before you start following.
            </p>
          </div>
          <Link
            to="/dashboard/strategies"
            className="text-sm font-semibold text-[#2563EB] hover:underline flex items-center gap-1 mt-1"
          >
            Explore Strategies <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" />
          </div>
        ) : isError ? (
          <div className="max-w-md mx-auto bg-white border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-600 mb-4">
              Failed to load saved strategies. {error instanceof Error ? error.message : ""}
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold disabled:opacity-60"
            >
              {isFetching ? "Retrying..." : "Try again"}
            </button>
          </div>
        ) : cards.length === 0 ? (
          <section className="bg-white border border-gray-200 rounded-2xl py-16 px-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-5">
              <FileText className="w-8 h-8 text-[#2563EB]" />
            </div>
            <p className="text-lg font-bold text-gray-900 mb-2">No Saved Strategies Yet</p>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Save Strategies from Explore or Strategy Detail to review them here later.
            </p>
            <Link
              to="/dashboard/strategies"
              className="bg-[#2563EB] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90"
            >
              Explore Strategies
            </Link>
          </section>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <SavedStrategyRow
                key={card.id}
                card={card}
                isRemoving={pendingId === card.money_manager_account_id}
                onRemove={() => unsaveMutation.mutate(card.money_manager_account_id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SavedStrategyRow({
  card,
  isRemoving,
  onRemove,
}: {
  card: SavedCard;
  isRemoving: boolean;
  onRemove: () => void;
}) {
  const username = card.owner?.username;
  const displayName = card.owner?.name || username || "Money Manager";
  const managerLabel = card.owner?.name && username ? `@${username}` : card.owner?.name || DASH;
  const initials = getInitials(displayName);
  const avatarBg = getAvatarBg(username || card.money_manager_account_id);

  // SavedCard doesn't carry performance metrics — display em-dash until BE adds.
  const thisMonth = DASH;
  const thisMonthClass = "text-gray-400";
  const largestDrop = DASH;
  const largestDropClass = "text-gray-400";

  const followers = formatCount(card.investors_count);
  const minStart =
    typeof card.profile?.minimum_start === "number" ? `$${card.profile.minimum_start}` : DASH;

  return (
    <article className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-5 hover:border-[#2563EB] transition-colors flex-wrap lg:flex-nowrap">
      {/* Left: avatar + name */}
      <div className="flex items-center gap-3 min-w-0 flex-1 lg:max-w-[280px]">
        {card.owner?.avatar ? (
          <img
            src={card.owner.avatar}
            alt={displayName}
            className="w-11 h-11 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full font-semibold flex items-center justify-center text-white text-sm shrink-0"
            style={{ background: avatarBg }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{displayName}</p>
          <p className="text-xs text-gray-500 truncate">{managerLabel}</p>
        </div>
      </div>

      {/* Middle: 4-stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 flex-1 lg:flex-none lg:w-auto">
        <StatColumn label="THIS MONTH" value={thisMonth} valueClass={thisMonthClass} />
        <StatColumn label="LARGEST DROP" value={largestDrop} valueClass={largestDropClass} />
        <StatColumn label="PEOPLE FOLLOWING" value={followers} valueClass="text-gray-900" />
        <StatColumn label="START FROM" value={minStart} valueClass="text-gray-900" />
      </div>

      {/* Right: stacked actions */}
      <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[120px]">
        {username ? (
          <Link
            to="/strategies/$username"
            params={{ username }}
            className="text-center text-sm font-semibold text-[#2563EB] border border-[#2563EB] rounded-lg px-4 py-2 hover:bg-[#EEF4FF] transition-colors"
          >
            View Details
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="text-center text-sm font-semibold text-gray-400 border border-gray-200 rounded-lg px-4 py-2 cursor-not-allowed"
          >
            View Details
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          className="text-center text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRemoving ? "Removing..." : "Remove"}
        </button>
      </div>
    </article>
  );
}

function StatColumn({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-0.5 truncate">
        {label}
      </p>
      <p className={`text-base font-bold truncate ${valueClass}`}>{value}</p>
    </div>
  );
}
