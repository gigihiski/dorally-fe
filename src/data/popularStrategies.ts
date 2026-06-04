export type PopularStrategy = {
  id: string;
  initials: string;
  name: string;
  owner: string;
  thisMonth: number; // percent
  largestDrop: number; // percent, negative
  avatarBg: string;
  avatarFg: string;
  category: "Stable" | "Growth" | "Low Drawdown" | "New";
};

const palettes: Array<{ bg: string; fg: string }> = [
  { bg: "#DBEAFE", fg: "#2563EB" },
  { bg: "#DCFCE7", fg: "#059669" },
  { bg: "#FEF3C7", fg: "#D97706" },
  { bg: "#FCE7F3", fg: "#DB2777" },
  { bg: "#EDE9FE", fg: "#7C3AED" },
  { bg: "#FEE2E2", fg: "#DC2626" },
];

const raw: Array<Omit<PopularStrategy, "avatarBg" | "avatarFg" | "initials">> = [
  { id: "consistent-strategy", name: "Consistent Strategy", owner: "Alex K.", thisMonth: 4.2, largestDrop: -1.8, category: "Stable" },
  { id: "gold-trend", name: "Gold Trend", owner: "Rico M.", thisMonth: 9.1, largestDrop: -4.2, category: "Growth" },
  { id: "crypto-steady", name: "Crypto Steady", owner: "Sara L.", thisMonth: 2.8, largestDrop: -1.1, category: "Low Drawdown" },
  { id: "fx-momentum", name: "FX Momentum", owner: "Daniel T.", thisMonth: 6.4, largestDrop: -3.2, category: "Growth" },
  { id: "blue-chip-core", name: "Blue Chip Core", owner: "Helena P.", thisMonth: 3.1, largestDrop: -1.4, category: "Stable" },
  { id: "swing-master", name: "Swing Master", owner: "Marcus J.", thisMonth: 7.8, largestDrop: -5.1, category: "Growth" },
  { id: "safe-harbor", name: "Safe Harbor", owner: "Nadia R.", thisMonth: 1.9, largestDrop: -0.8, category: "Low Drawdown" },
  { id: "alpha-edge", name: "Alpha Edge", owner: "Kenji S.", thisMonth: 11.4, largestDrop: -6.3, category: "Growth" },
  { id: "income-builder", name: "Income Builder", owner: "Priya N.", thisMonth: 3.6, largestDrop: -1.7, category: "Stable" },
  { id: "trend-rider", name: "Trend Rider", owner: "Omar B.", thisMonth: 5.7, largestDrop: -2.9, category: "Growth" },
  { id: "balanced-flow", name: "Balanced Flow", owner: "Lina V.", thisMonth: 2.4, largestDrop: -1.0, category: "Low Drawdown" },
  { id: "quant-pulse", name: "Quant Pulse", owner: "Yuki H.", thisMonth: 8.2, largestDrop: -3.8, category: "New" },
  { id: "global-macro", name: "Global Macro", owner: "Ethan W.", thisMonth: 4.9, largestDrop: -2.2, category: "Stable" },
  { id: "tech-leaders", name: "Tech Leaders", owner: "Sophia G.", thisMonth: 10.3, largestDrop: -5.7, category: "Growth" },
  { id: "defensive-mix", name: "Defensive Mix", owner: "Carlos D.", thisMonth: 1.5, largestDrop: -0.6, category: "Low Drawdown" },
  { id: "fast-scalper", name: "Fast Scalper", owner: "Mei C.", thisMonth: 6.9, largestDrop: -4.5, category: "New" },
  { id: "dividend-plus", name: "Dividend Plus", owner: "Anders L.", thisMonth: 2.7, largestDrop: -1.3, category: "Stable" },
  { id: "volatility-hunter", name: "Volatility Hunter", owner: "Ravi K.", thisMonth: 12.6, largestDrop: -7.1, category: "Growth" },
  { id: "steady-yield", name: "Steady Yield", owner: "Emma F.", thisMonth: 2.1, largestDrop: -0.9, category: "Low Drawdown" },
  { id: "ai-signals", name: "AI Signals", owner: "Noah B.", thisMonth: 7.3, largestDrop: -3.6, category: "New" },
  { id: "commodity-core", name: "Commodity Core", owner: "Isabel M.", thisMonth: 5.2, largestDrop: -2.6, category: "Stable" },
  { id: "breakout-pro", name: "Breakout Pro", owner: "Tomas R.", thisMonth: 8.8, largestDrop: -4.9, category: "Growth" },
  { id: "low-vol-anchor", name: "Low Vol Anchor", owner: "Hana O.", thisMonth: 1.7, largestDrop: -0.7, category: "Low Drawdown" },
  { id: "emerging-edge", name: "Emerging Edge", owner: "Pablo E.", thisMonth: 6.1, largestDrop: -3.4, category: "New" },
];

function initialsOf(owner: string) {
  return owner
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const popularStrategies: PopularStrategy[] = raw.map((s, i) => {
  const p = palettes[i % palettes.length];
  return { ...s, avatarBg: p.bg, avatarFg: p.fg, initials: initialsOf(s.owner) };
});
