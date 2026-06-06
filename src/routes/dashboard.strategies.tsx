import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  TrendingUp,
  Shield,
  Rocket,
  Scale,
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Filter,
} from "lucide-react";
import { getMoneyManagers, type MoneyManager } from "@/services/money-managers";
import { DashboardHeader } from "./dashboard";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type StrategiesSearch = {
  sort?: SortKey;
  style?: StyleKey;
  drawdown?: DrawdownKey;
};

const SORT_KEYS = new Set<SortKey>([
  "popular",
  "highest_return",
  "smallest_drop",
  "most_followers",
  "newest",
  "min_lowest",
  "min_highest",
]);
const STYLE_KEYS = new Set<StyleKey>(["all", "stable", "balanced", "growth"]);
const DRAWDOWN_KEYS = new Set<DrawdownKey>(["all", "under2", "under5", "under10"]);

export const Route = createFileRoute("/dashboard/strategies")({
  component: DashboardStrategiesPage,
  validateSearch: (raw: Record<string, unknown>): StrategiesSearch => ({
    sort:
      typeof raw.sort === "string" && SORT_KEYS.has(raw.sort as SortKey)
        ? (raw.sort as SortKey)
        : undefined,
    style:
      typeof raw.style === "string" && STYLE_KEYS.has(raw.style as StyleKey)
        ? (raw.style as StyleKey)
        : undefined,
    drawdown:
      typeof raw.drawdown === "string" && DRAWDOWN_KEYS.has(raw.drawdown as DrawdownKey)
        ? (raw.drawdown as DrawdownKey)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explore Strategies — Batman" },
      { name: "description", content: "Choose a strategy based on performance, movement, and minimum start." },
    ],
  }),
});

type StyleKey = "all" | "stable" | "balanced" | "growth";

type SortKey =
  | "popular"
  | "highest_return"
  | "smallest_drop"
  | "most_followers"
  | "newest"
  | "min_lowest"
  | "min_highest";

const SORT_LABELS: Record<SortKey, string> = {
  popular: "Popular",
  highest_return: "Highest return this month",
  smallest_drop: "Smaller drop",
  most_followers: "Most followers",
  newest: "Newest",
  min_lowest: "Minimum start: lowest first",
  min_highest: "Minimum start: Highest first",
};

type DrawdownKey = "all" | "under2" | "under5" | "under10";
const DRAWDOWN_LABELS: Record<DrawdownKey, string> = {
  all: "All",
  under2: "Under 2%",
  under5: "Under 5%",
  under10: "Under 10%",
};

const AVATAR_PALETTE = ["#DBEAFE", "#DCFCE7", "#FEF3C7", "#FCE7F3", "#EDE9FE", "#FEE2E2"];
const AVATAR_FG_PALETTE = ["#2563EB", "#059669", "#D97706", "#DB2777", "#7C3AED", "#DC2626"];

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "MM"
  );
}

function getAvatarIdx(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % AVATAR_PALETTE.length;
}

type Row = {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  avatarBg: string;
  avatarFg: string;
  initials: string;
  owner: string | null;
  thisMonth: number | null;
  largestDrop: number | null;
  totalReturn: number | null;
  winRate: number | null;
  followers: number | null;
  minimumStart: number | null;
  category: string | null;
  createdAt?: string;
};

type DerivedStyle = "stable" | "balanced" | "growth" | null;
function deriveStyle(row: Row): DerivedStyle {
  if (row.largestDrop === null) return null;
  const dropAbs = Math.abs(row.largestDrop);
  if (dropAbs < 5) return "stable";
  if (dropAbs < 10) return "balanced";
  return "growth";
}

const SORT_COMPARATORS: Partial<Record<SortKey, (a: Row, b: Row) => number>> = {
  highest_return: (a, b) => (b.totalReturn ?? -Infinity) - (a.totalReturn ?? -Infinity),
  smallest_drop: (a, b) =>
    Math.abs(a.largestDrop ?? -Infinity) - Math.abs(b.largestDrop ?? -Infinity),
  most_followers: (a, b) => (b.followers ?? -Infinity) - (a.followers ?? -Infinity),
  newest: (a, b) =>
    (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0),
  min_lowest: (a, b) => (a.minimumStart ?? Infinity) - (b.minimumStart ?? Infinity),
  min_highest: (a, b) => (b.minimumStart ?? -Infinity) - (a.minimumStart ?? -Infinity),
};

function adaptMoneyManager(mm: MoneyManager): Row {
  const idForUrl = mm.username || mm.id;
  const displayName = mm.name || idForUrl;
  const idx = getAvatarIdx(idForUrl);
  return {
    id: idForUrl,
    name: displayName,
    username: mm.username,
    avatar: mm.avatar,
    avatarBg: AVATAR_PALETTE[idx],
    avatarFg: AVATAR_FG_PALETTE[idx],
    initials: getInitials(displayName),
    owner: mm.username ? `@${mm.username}` : null,
    thisMonth:
      typeof mm.performance?.this_month_return_pct === "number"
        ? Number(mm.performance.this_month_return_pct.toFixed(1))
        : null,
    largestDrop:
      typeof mm.performance?.biggest_drop_pct === "number"
        ? -Number(mm.performance.biggest_drop_pct.toFixed(1))
        : null,
    totalReturn:
      typeof mm.performance?.total_return_pct === "number"
        ? Number(mm.performance.total_return_pct.toFixed(1))
        : null,
    winRate:
      typeof mm.performance?.winning_rate_pct === "number"
        ? Number(mm.performance.winning_rate_pct.toFixed(1))
        : null,
    followers: typeof mm.followers_count === "number" ? mm.followers_count : null,
    minimumStart:
      typeof mm.profile?.minimum_start === "number" ? mm.profile.minimum_start : null,
    category: null,
    createdAt: mm.created_at,
  };
}

const DASH = "—";
const display = (v: number | string | null | undefined, suffix = ""): string =>
  v === null || v === undefined || v === "" ? DASH : `${v}${suffix}`;

const SORT_LABEL_FRAGMENTS: Record<SortKey, string> = {
  popular: "",
  highest_return: "Top Money Managers — sorted by highest return",
  smallest_drop: "Sorted by smallest drop",
  most_followers: "Sorted by most followers",
  newest: "Sorted by newest",
  min_lowest: "Sorted by lowest minimum start",
  min_highest: "Sorted by highest minimum start",
};
const STYLE_LABEL_FRAGMENTS: Record<StyleKey, string> = {
  all: "",
  stable: "More Stable strategies",
  balanced: "Balanced Growth strategies",
  growth: "Higher Growth strategies",
};
const DRAWDOWN_LABEL_FRAGMENTS: Record<DrawdownKey, string> = {
  all: "",
  under2: "Drawdown under 2%",
  under5: "Low Drawdown — under 5%",
  under10: "Drawdown under 10%",
};

function getActiveFilterLabel(
  sort: SortKey,
  style: StyleKey,
  drawdown: DrawdownKey,
): string | null {
  const fragments = [
    SORT_LABEL_FRAGMENTS[sort],
    STYLE_LABEL_FRAGMENTS[style],
    DRAWDOWN_LABEL_FRAGMENTS[drawdown],
  ].filter(Boolean);
  return fragments.length === 0 ? null : fragments.join(" · ");
}

function DashboardStrategiesPage() {
  const { sort: sortParam, style: styleParam, drawdown: drawdownParam } = Route.useSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState<StyleKey>(styleParam ?? "all");
  const [showAll, setShowAll] = useState(false);

  // Sheets
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [drawdownOpen, setDrawdownOpen] = useState(false);

  // Filter state (working / applied) — null = filter off
  const [filterStyle, setFilterStyle] = useState<"stable" | "balanced" | "growth" | null>(null);
  const [filterGrowth, setFilterGrowth] = useState<"2" | "5" | "10" | null>(null);
  const [filterMin, setFilterMin] = useState<"10" | "50" | "100" | null>(null);
  const [filterTrack, setFilterTrack] = useState<"new" | "6m" | "1y" | "2y" | null>(null);
  const [filterFollowers, setFilterFollowers] = useState<"100" | "200" | "500" | "750" | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Sort
  const [sort, setSort] = useState<SortKey>(sortParam ?? "popular");

  // Drawdown
  const [drawdown, setDrawdown] = useState<DrawdownKey>(drawdownParam ?? "all");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["money-managers", { page: 1, limit: 50 }],
    queryFn: () => getMoneyManagers({ page: 1, limit: 50 }),
  });

  const rows: Row[] = useMemo(
    () => (data?.data ?? []).map(adaptMoneyManager),
    [data],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((s) => {
      // Search
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inUser = s.username?.toLowerCase().includes(q) ?? false;
        if (!inName && !inUser) return false;
      }
      // Style picker (top of page) — null-permissive on rows with unknown drop
      if (style !== "all") {
        const ds = deriveStyle(s);
        if (ds && ds !== style) return false;
      }
      // Drawdown chip
      if (drawdown !== "all" && s.largestDrop !== null) {
        const dropAbs = Math.abs(s.largestDrop);
        const limit = drawdown === "under2" ? 2 : drawdown === "under5" ? 5 : 10;
        if (dropAbs >= limit) return false;
      }
      // Filter sheet — style override
      if (filterStyle) {
        const ds = deriveStyle(s);
        if (ds && ds !== filterStyle) return false;
      }
      // Filter sheet — growth threshold (this-month return ≥ X)
      if (filterGrowth && s.thisMonth !== null) {
        if (s.thisMonth < Number(filterGrowth)) return false;
      }
      // Filter sheet — minimum start ($10 = ≤10, $50+ = ≥50, $100+ = ≥100)
      if (filterMin && s.minimumStart !== null) {
        if (filterMin === "10" ? s.minimumStart > 10 : s.minimumStart < Number(filterMin)) {
          return false;
        }
      }
      // Filter sheet — track record (account age vs created_at)
      if (filterTrack && s.createdAt) {
        const ageDays = (Date.now() - Date.parse(s.createdAt)) / 86400000;
        if (filterTrack === "new") {
          if (ageDays > 30) return false;
        } else {
          const need = filterTrack === "6m" ? 180 : filterTrack === "1y" ? 365 : 730;
          if (ageDays < need) return false;
        }
      }
      // Filter sheet — followers
      if (filterFollowers && s.followers !== null) {
        if (s.followers < Number(filterFollowers)) return false;
      }
      return true;
    });
    const cmp = SORT_COMPARATORS[sort];
    if (cmp) list = [...list].sort(cmp);
    return list;
  }, [
    rows,
    query,
    style,
    drawdown,
    filterStyle,
    filterGrowth,
    filterMin,
    filterTrack,
    filterFollowers,
    sort,
  ]);

  const visible = showAll ? filtered : filtered.slice(0, 3);

  const resetFilters = () => {
    setFilterStyle(null);
    setFilterGrowth(null);
    setFilterMin(null);
    setFilterTrack(null);
    setFilterFollowers(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Explore Strategies</h1>
          <p className="text-sm text-gray-500">Choose a strategy based on performance, movement, and minimum start.</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search strategies or managers"
            className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        {/* Style picker */}
        <section>
          <p className="font-bold text-gray-900 text-sm mb-3">Choose your strategy style</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StyleCard
              active={style === "stable"}
              onClick={() => setStyle(style === "stable" ? "all" : "stable")}
              icon={<Shield className="w-7 h-7 text-[#2563EB]" />}
              title="More Stable"
              desc="Lower swings, steadier growth."
            />
            <StyleCard
              active={style === "balanced"}
              onClick={() => setStyle(style === "balanced" ? "all" : "balanced")}
              icon={<Scale className="w-7 h-7 text-[#2563EB]" />}
              title="Balanced Growth"
              desc="Balanced risk and reward."
            />
            <StyleCard
              active={style === "growth"}
              onClick={() => setStyle(style === "growth" ? "all" : "growth")}
              icon={<Rocket className="w-7 h-7 text-[#2563EB]" />}
              title="Higher Growth"
              desc="Aim higher with more movement."
            />
          </div>
        </section>

        {/* Filter / Sort */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFilterOpen(true)}
            className="bg-[#EEF4FF] text-[#2563EB] text-sm font-semibold py-3 rounded-xl inline-flex items-center justify-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filter
          </button>
          <button
            onClick={() => setSortOpen(true)}
            className="bg-[#EEF4FF] text-[#2563EB] text-sm font-semibold py-3 rounded-xl inline-flex items-center justify-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" /> Sort
          </button>
        </div>

        {/* Drawdown row */}
        <div className="flex items-center justify-end text-sm">
          <button
            onClick={() => setDrawdownOpen(true)}
            className="inline-flex items-center gap-1 text-gray-700 bg-white border border-gray-200 rounded-md px-3 py-1 font-semibold"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Drawdown{drawdown !== "all" ? ` - ${DRAWDOWN_LABELS[drawdown]}` : ""}
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Active filter banner */}
        {(() => {
          const activeLabel = getActiveFilterLabel(sort, style, drawdown);
          if (!activeLabel) return null;
          const handleClear = () => {
            setSort("popular");
            setStyle("all");
            setDrawdown("all");
            navigate({ to: "/dashboard/strategies", search: {}, replace: true });
          };
          return (
            <div className="flex items-center justify-between gap-3 bg-[#EEF4FF] border border-[#DBEAFE] rounded-xl px-4 py-3">
              <p className="text-sm text-[#1E3A8A] flex items-center gap-2 min-w-0">
                <Filter className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <span className="font-semibold">Active filter:</span> {activeLabel}
                </span>
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-[#2563EB] hover:underline shrink-0"
              >
                Clear
              </button>
            </div>
          );
        })()}

        {/* List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" />
            </div>
          ) : isError ? (
            <div className="max-w-md mx-auto bg-white border border-red-100 rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600 mb-4">
                Failed to load strategies. {error instanceof Error ? error.message : ""}
              </p>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold disabled:opacity-60"
              >
                {isFetching ? "Retrying..." : "Try again"}
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <p className="font-semibold text-gray-900 mb-1">No strategies available yet</p>
              <p className="text-sm text-gray-500">Check back soon for new money managers.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <p className="font-semibold text-gray-900 mb-1">No strategies match your search</p>
              <p className="text-sm text-gray-500">Try a different keyword or style.</p>
            </div>
          ) : (
            visible.map((s) => <StrategyRow key={s.id} s={s} />)
          )}
        </div>

        {filtered.length > 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full border-2 border-[#2563EB] text-[#2563EB] font-semibold py-3.5 rounded-xl hover:bg-[#EEF4FF] transition-colors"
          >
            {showAll ? "Show less" : "View all strategies"}
          </button>
        )}

        {/* Learn */}
        <section className="pt-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Learn</h2>
          <p className="text-sm text-gray-500 mb-4">New to strategy following? Start here.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LearnCard icon={<BookOpen className="w-5 h-5 text-[#2563EB]" />} title="How strategy following works" desc="Learn what it means to follow a strategy." slug="how-following-works" />
            <LearnCard icon={<HelpCircle className="w-5 h-5 text-[#2563EB]" />} title="Understanding fees" desc="How profit sharing and fee charging works." slug="understanding-fees" />
            <LearnCard icon={<AlertTriangle className="w-5 h-5 text-[#2563EB]" />} title="Risk basics before following" desc="What to expect before you start." slug="risk-basics" />
            <LearnCard icon={<Lightbulb className="w-5 h-5 text-[#2563EB]" />} title="How to choose a strategy" desc="Tips for picking the right strategy for you." slug="how-to-choose" />
          </div>
        </section>
      </main>

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="bottom"
          className="p-0 bg-[#F8FAFC] rounded-2xl flex flex-col sm:max-w-none w-[988px] max-w-[calc(100vw-2rem)] max-h-[90vh] !left-1/2 !right-auto -translate-x-1/2"
        >
          <SheetHeaderBar icon={<SlidersHorizontal className="w-5 h-5 text-[#0F1B3D]" />} title="Filter Strategies" subtitle="Batman Strategies Parameter" />
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
            <FilterGroup step={1} label="STRATEGY STYLE">
              <div className="grid grid-cols-2 gap-3">
                <PillOption active={filterStyle === "stable"} onClick={() => setFilterStyle("stable")}>More Stable</PillOption>
                <PillOption active={filterStyle === "balanced"} onClick={() => setFilterStyle("balanced")}>Balanced Growth</PillOption>
                <PillOption className="col-span-2" active={filterStyle === "growth"} onClick={() => setFilterStyle("growth")}>Higher Growth</PillOption>
              </div>
            </FilterGroup>

            <FilterGroup step={2} label="GROWTH">
              <div className="grid grid-cols-2 gap-3">
                <PillOption active={filterGrowth === "2"} onClick={() => setFilterGrowth("2")}>Above 2%</PillOption>
                <PillOption active={filterGrowth === "5"} onClick={() => setFilterGrowth("5")}>Above 5%</PillOption>
                <PillOption className="col-span-2" active={filterGrowth === "10"} onClick={() => setFilterGrowth("10")}>Above 10%</PillOption>
              </div>
            </FilterGroup>

            <FilterGroup step={3} label="MINIMUM START">
              <div className="grid grid-cols-3 gap-3">
                <PillOption active={filterMin === "10"} onClick={() => setFilterMin("10")}>$10</PillOption>
                <PillOption active={filterMin === "50"} onClick={() => setFilterMin("50")}>$50+</PillOption>
                <PillOption active={filterMin === "100"} onClick={() => setFilterMin("100")}>$100+</PillOption>
              </div>
            </FilterGroup>

            {/* Advanced Filters toggle */}
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center justify-between bg-[#EEF4FF]/60 hover:bg-[#EEF4FF] transition-colors rounded-xl px-5 py-4 font-bold text-gray-900"
            >
              <span>Advanced Filters</span>
              {advancedOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
            </button>

            {advancedOpen && (
              <div className="space-y-8">
                <FilterGroup step={4} label="TRACK RECORD">
                  <div className="grid grid-cols-2 gap-3">
                    <PillOption active={filterTrack === "new"} onClick={() => setFilterTrack("new")}>New</PillOption>
                    <PillOption active={filterTrack === "1y"} onClick={() => setFilterTrack("1y")}>1 Years+</PillOption>
                    <PillOption active={filterTrack === "6m"} onClick={() => setFilterTrack("6m")}>6 Month+</PillOption>
                    <PillOption active={filterTrack === "2y"} onClick={() => setFilterTrack("2y")}>2 Years+</PillOption>
                  </div>
                </FilterGroup>

                <FilterGroup step={5} label="FOLLOWERS">
                  <div className="grid grid-cols-4 gap-3">
                    <PillOption active={filterFollowers === "100"} onClick={() => setFilterFollowers("100")}>100+</PillOption>
                    <PillOption active={filterFollowers === "200"} onClick={() => setFilterFollowers("200")}>200+</PillOption>
                    <PillOption active={filterFollowers === "500"} onClick={() => setFilterFollowers("500")}>500+</PillOption>
                    <PillOption active={filterFollowers === "750"} onClick={() => setFilterFollowers("750")}>750+</PillOption>
                  </div>
                </FilterGroup>
              </div>
            )}
          </div>
          <SheetFooterBar
            onReset={resetFilters}
            primaryLabel={`Show ${filtered.length} Matching Strategies`}
            onPrimary={() => setFilterOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Sort Sheet */}
      <Sheet open={sortOpen} onOpenChange={setSortOpen}>
        <SheetContent
          side="bottom"
          className="p-0 bg-[#F8FAFC] rounded-2xl flex flex-col sm:max-w-none w-[988px] max-w-[calc(100vw-2rem)] max-h-[927px] !left-1/2 !right-auto -translate-x-1/2"
        >
          <SheetHeaderBar icon={<SlidersHorizontal className="w-5 h-5 text-[#0F1B3D]" />} title="Sort Strategies" subtitle="Batman Strategies Parameter" />
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className="w-full flex items-center gap-4 px-2 py-4 text-left"
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sort === key ? "border-[#2563EB] bg-[#2563EB]" : "border-gray-300 bg-white"
                    }`}
                >
                  {sort === key && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <span className="text-gray-900 text-base">{SORT_LABELS[key]}</span>
              </button>
            ))}
          </div>
          <SheetFooterBar
            onReset={() => setSort("popular")}
            primaryLabel="Apply"
            onPrimary={() => setSortOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Drawdown Sheet */}
      <Sheet open={drawdownOpen} onOpenChange={setDrawdownOpen}>
        <SheetContent
          side="bottom"
          className="p-0 bg-[#F8FAFC] rounded-2xl flex flex-col sm:max-w-none w-[988px] max-w-[calc(100vw-2rem)] max-h-[927px] !left-1/2 !right-auto -translate-x-1/2"
        >
          <SheetHeaderBar
            icon={<SlidersHorizontal className="w-5 h-5 text-[#0F1B3D]" />}
            title="Drawdown"
            subtitle="Show strategies with maximum drawdown (historical) of strategies"
          />
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="grid grid-cols-2 gap-3">
              <PillOption active={drawdown === "under2"} onClick={() => setDrawdown("under2")}>Under 2%</PillOption>
              <PillOption active={drawdown === "under5"} onClick={() => setDrawdown("under5")}>Under 5%</PillOption>
              <PillOption active={drawdown === "under10"} onClick={() => setDrawdown("under10")}>Under 10%</PillOption>
              <PillOption active={drawdown === "all"} onClick={() => setDrawdown("all")}>All</PillOption>
            </div>
          </div>
          <SheetFooterBar
            onReset={() => setDrawdown("all")}
            primaryLabel="Apply"
            onPrimary={() => setDrawdownOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SheetHeaderBar({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="bg-white px-8 py-6 border-b border-gray-200 flex items-start gap-3 rounded-t-2xl">
      <div className="mt-1">{icon}</div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-[#0F1B3D]">{title}</h2>
        <p className="text-base text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function SheetFooterBar({
  onReset, primaryLabel, onPrimary,
}: { onReset: () => void; primaryLabel: string; onPrimary: () => void }) {
  return (
    <div className="bg-[#EEF4FF] px-8 py-5 grid grid-cols-2 gap-4 border-t border-gray-200">
      <button
        onClick={onReset}
        className="bg-white border border-[#2563EB] text-[#2563EB] font-semibold text-base py-4 rounded-xl hover:bg-[#EEF4FF] transition-colors"
      >
        Reset
      </button>
      <button
        onClick={onPrimary}
        className="bg-[#2563EB] text-white font-semibold text-base py-4 rounded-xl hover:bg-[#1d4ed8] transition-colors"
      >
        {primaryLabel}
      </button>
    </div>
  );
}


function FilterGroup({ step, label, children }: { step: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-5">
        <span className="w-6 h-6 rounded-full border border-[#2563EB] text-[#2563EB] text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <span className="text-sm font-semibold tracking-wider text-gray-500">{label}</span>
      </div>
      {children}
    </div>
  );
}

function PillOption({
  active, onClick, children, className,
}: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-4 rounded-xl border text-base font-medium transition-all ${active
          ? "border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
        } ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function StyleCard({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white border rounded-2xl p-5 text-center transition-all ${active ? "border-[#2563EB] ring-2 ring-[#2563EB]/20" : "border-gray-200 hover:border-gray-300"
        }`}
    >
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </button>
  );
}

function StrategyRow({ s }: { s: Row }) {
  // Sparkline: only draws a real trend when we actually have a number. Flat otherwise.
  const sparkPath =
    s.thisMonth === null
      ? "M0,16 L120,16"
      : s.thisMonth >= 0
        ? "M0,28 L20,24 L40,26 L60,18 L80,20 L100,10 L120,8"
        : "M0,8 L20,12 L40,10 L60,18 L80,16 L100,24 L120,28";

  // Badge: only meaningful when we have at least one metric.
  let badgeLabel: string | null = null;
  let badgeStyle = "";
  if (s.thisMonth !== null && s.thisMonth > 8) {
    badgeLabel = "Strong this month";
    badgeStyle = "text-[#7C3AED] bg-[#EDE9FE]";
  } else if (s.largestDrop !== null && s.largestDrop > -2) {
    badgeLabel = "Smaller drops";
    badgeStyle = "text-[#0891B2] bg-[#CFFAFE]";
  } else if (s.thisMonth !== null || s.largestDrop !== null) {
    badgeLabel = "Popular";
    badgeStyle = "text-[#2563EB] bg-[#EEF4FF]";
  }

  const thisMonthDisplay =
    s.thisMonth === null
      ? DASH
      : `${s.thisMonth >= 0 ? "+" : ""}${s.thisMonth}%`;
  const largestDropDisplay = s.largestDrop === null ? DASH : `${s.largestDrop}%`;
  const minimumStartDisplay = s.minimumStart === null ? DASH : `$${s.minimumStart}`;

  return (
    <Link
      to="/strategies/$username"
      params={{ username: s.id }}
      className="block bg-white rounded-2xl border border-gray-200 hover:border-[#2563EB] hover:shadow-sm transition-all"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {s.avatar ? (
              <img
                src={s.avatar}
                alt={s.name}
                className="w-11 h-11 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full font-semibold flex items-center justify-center text-xs shrink-0"
                style={{ background: s.avatarBg, color: s.avatarFg }}
              >
                {s.initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{s.name}</p>
              <p className="text-xs text-gray-500 truncate">
                Managed by {display(s.owner)}
                {badgeLabel && (
                  <span className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeStyle}`}>
                    {badgeLabel}
                  </span>
                )}
              </p>
            </div>
          </div>
          <svg viewBox="0 0 120 32" className="w-28 h-8 shrink-0">
            <path d={sparkPath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-1">THIS MONTH RETURN</p>
            <p className="text-lg font-bold text-[#2563EB]">{thisMonthDisplay}</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-1">LARGEST DROP</p>
            <p className="text-lg font-bold text-[#EF4444]">{largestDropDisplay}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-wider text-gray-500 mb-1">MINIMUM START</p>
            <p className="text-lg font-bold text-gray-900">{minimumStartDisplay}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 bg-[#F8FAFC] rounded-b-2xl flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {display(s.followers)}
          </span>
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" /> {DASH}
          </span>
        </div>
        <span>Fee: New profit only</span>
      </div>
    </Link>
  );
}

function LearnCard({
  icon,
  title,
  desc,
  slug,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  slug: string;
}) {
  return (
    <Link
      to="/dashboard/learn"
      search={{ guide: slug }}
      className="bg-white border border-gray-200 rounded-xl p-4 text-left flex items-start gap-3 hover:border-[#2563EB] transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm mb-0.5">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
    </Link>
  );
}
