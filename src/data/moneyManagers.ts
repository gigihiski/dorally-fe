export interface MoneyManager {
  id: string;
  name: string;
  description: string;
  followers: number;
  averageGrowth: number;
  category: string;
  avatarBg: string;
  initials: string;
}

export const moneyManagers: MoneyManager[] = [
  {
    id: "langit-timur",
    name: "Langit Timur",
    description: "A trend-following strategy that focuses on capturing strong market momentum across multiple asset classes.",
    followers: 1245,
    averageGrowth: 21,
    category: "Trend Following",
    avatarBg: "#1F2937",
    initials: "LT",
  },
  {
    id: "samudra-biru",
    name: "Samudra Biru",
    description: "A balanced strategy combining low-volatility instruments with steady long-term growth opportunities.",
    followers: 982,
    averageGrowth: 17,
    category: "Balanced",
    avatarBg: "#1D4ED8",
    initials: "SB",
  },
  {
    id: "gunung-merapi",
    name: "Gunung Merapi",
    description: "An aggressive momentum strategy that targets high-volatility breakouts in global indices.",
    followers: 2104,
    averageGrowth: 34,
    category: "Aggressive",
    avatarBg: "#DC2626",
    initials: "GM",
  },
  {
    id: "bumi-hijau",
    name: "Bumi Hijau",
    description: "Sustainable allocation across green-economy assets, ETFs, and ESG-aligned instruments.",
    followers: 614,
    averageGrowth: 12,
    category: "ESG",
    avatarBg: "#059669",
    initials: "BH",
  },
  {
    id: "fajar-pagi",
    name: "Fajar Pagi",
    description: "A conservative income strategy focused on dividend-paying assets and stable returns.",
    followers: 1532,
    averageGrowth: 9,
    category: "Conservative",
    avatarBg: "#D97706",
    initials: "FP",
  },
  {
    id: "bintang-utara",
    name: "Bintang Utara",
    description: "Quantitative multi-asset rotation strategy using rules-based market signals.",
    followers: 781,
    averageGrowth: 24,
    category: "Quant",
    avatarBg: "#7C3AED",
    initials: "BU",
  },
];

export function getMoneyManager(id: string): MoneyManager | undefined {
  return moneyManagers.find((m) => m.id === id);
}
