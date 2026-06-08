// Learn guide content + slug map, extracted from dashboard.learn.tsx so any
// /dashboard/* page can open a guide popup in place via LearnGuideProvider.
import type React from "react";
import {
  FileText,
  DollarSign,
  AlertTriangle,
  Target,
  TrendingUp,
  StopCircle as StopIcon,
} from "lucide-react";
import type { GuideContent } from "@/components/GuideModal";

export const GUIDE_SLUGS: Record<string, number> = {
  "how-following-works": 0,
  "understanding-fees": 1,
  "risk-basics": 2,
  "how-to-choose": 3,
  "portfolio-tracking": 4,
  "stopping-a-strategy": 5,
};

const STRATEGY_FOLLOWING_GUIDE: GuideContent = {
  emoji: "📖",
  title: "How strategy following works",
  sections: [
    {
      heading: "What about stop loss and take profit?",
      paragraphs: [
        "Batman copies stop loss and take profit levels from the Money Manager's trade to your account. This is an important part of following — your trade will close at the same conditions as the original trade.",
      ],
    },
    {
      heading: "When does following start?",
      paragraphs: [
        "Following starts immediately after you confirm. Batman begins copying new trades from that moment. Trades that were already open before you followed are not copied.",
      ],
      callout: {
        tone: "tip",
        body: "You will not inherit any open positions from the Money Manager. Only new trades after your follow date are copied to your account.",
      },
    },
    {
      heading: "One account, one strategy",
      paragraphs: [
        "Each trading account can follow one strategy at a time. If you have more than one account, each can follow a different strategy. This keeps performance tracking and fee calculation clean and accurate.",
      ],
    },
    {
      heading: "What is strategy following?",
      paragraphs: [
        "Strategy following means your account automatically copies the trades of an experienced trader, called a Money Manager. When they open a trade, the same trade is opened on your account. When they close it, yours closes too.",
        "You do not need to make any trading decisions yourself. Batman handles the copying automatically once you start following.",
      ],
    },
    {
      heading: "How are trades copied?",
      paragraphs: [
        "Batman uses your account size to calculate a proportional lot size for each trade. This means if the Money Manager trades a larger amount than your account, your trade will be smaller — in proportion to your balance.",
      ],
      callout: {
        tone: "example",
        body: "If the Money Manager opens a 1.00 lot trade and your account is 1% of their account size, Batman will open a 0.01 lot trade on your account.",
      },
    },
    {
      heading: "What about stop loss and take profit?",
      paragraphs: [
        "Batman copies stop loss and take profit levels from the Money Manager's trade to your account. This is an important part of following — your trade will close at the same conditions as the original trade.",
      ],
    },
  ],
};

const UNDERSTANDING_FEES_GUIDE: GuideContent = {
  emoji: "💰",
  title: "Understanding fees",
  sections: [
    {
      heading: "Where does the fee go?",
      paragraphs: [
        "The strategy fee goes directly to the Money Manager's account. Batman does not take a cut from the performance fee. The fee rate is set per strategy and shown clearly on the Strategy Detail page before you follow.",
      ],
    },
    {
      heading: "What happens if my account drops?",
      paragraphs: [
        "If your account drops below the high water mark, no fee is charged until it recovers and reaches a new high. You only pay on genuinely new profit.",
      ],
      callout: {
        tone: "tip",
        body: "If your account goes from $10 → $10.42 → $10.10 → $10.50, you pay fee on $0.42 first, then on $0.08 (the new profit above $10.42).",
      },
    },
    {
      heading: "When is the fee charged?",
      paragraphs: [
        "Fees are settled weekly. Batman calculates the fee every Monday for the previous week. If there is new profit, the fee is deducted from your account and transferred directly to the Money Manager's account.",
        "If you stop following mid-week, a partial settlement is calculated at that point.",
      ],
    },
    {
      heading: 'What is "new profit"?',
      paragraphs: [
        "New profit means profit above your previous highest account value. Batman tracks this using a High Water Mark — the highest point your account has reached since you started following.",
      ],
      callout: {
        tone: "example",
        body: "If your account starts at $10 and reaches $10.42, the $0.42 is new profit. If it then drops to $10.20 and comes back to $10.38, no fee is charged because $10.38 is still below the previous high of $10.42.",
      },
    },
    {
      heading: "How fees work",
      paragraphs: [
        "Batman uses a performance fee model. You only pay a strategy fee when your account makes new profit. If there is no new profit, no fee is charged.",
        "The fee is a percentage of new profit only — not your total account value.",
      ],
    },
  ],
};

const RISK_BASICS_GUIDE: GuideContent = {
  emoji: "⚠️",
  title: "Risk basics",
  sections: [
    {
      heading: "Your account value can go up or down",
      paragraphs: [
        "Following a strategy involves risk. The Money Manager's trades may result in losses, which means your account value can decrease. Only follow with funds you are comfortable putting at risk.",
      ],
      callout: {
        tone: "warning",
        body: "Following a strategy does not guarantee profit. Past performance does not predict future results.",
      },
    },
    {
      heading: "Past results are not guarantees",
      paragraphs: [
        "Strategy history shows you how a strategy has moved in the past — its returns, largest drop, and movement level. This helps you understand what to expect, but it cannot tell you what will happen next.",
        "Markets change, and a strategy that performed well in the past may not continue to do so.",
      ],
    },
    {
      heading: "Your result may differ from the strategy",
      paragraphs: [
        "Small differences can happen between your result and the strategy's result. This is because of timing, trade execution speed, your account size, and fractional lot sizing.",
      ],
      callout: {
        tone: "info",
        label: "WHY THIS HAPPENS",
        body: "If the strategy opens a trade and your account is very small, the proportional lot may be rounded to the nearest minimum lot. This can cause slight differences in the final result.",
      },
    },
    {
      heading: "The 30% risk limit",
      paragraphs: [
        "Batman includes a platform-wide safety mechanism: if your account drops 30% from its high water mark, Batman will automatically stop following the strategy. Open positions will be closed at market price.",
        "This applies to all strategies on Batman and cannot be changed.",
      ],
      callout: {
        tone: "warning",
        body: "The auto-stop does not guarantee your loss will be exactly 30%. Market conditions and trade execution at the time of closing may affect the final result.",
      },
    },
    {
      heading: "You are in control",
      paragraphs: [
        "You can stop following a strategy at any time from your Portfolio. There is no lock-in period. If you want to stop before the risk limit is reached, you can do so whenever you choose.",
      ],
      callout: {
        tone: "tip",
        body: "Checking your Portfolio regularly helps you stay aware of your account value and strategy performance.",
      },
    },
  ],
};

const HOW_TO_CHOOSE_STRATEGY_GUIDE: GuideContent = {
  emoji: "🎯",
  title: "How to choose a strategy",
  sections: [
    {
      heading: "What to look at on a strategy card",
      paragraphs: [
        "Each strategy card on the Explore page shows you key information to help you compare strategies quickly:",
      ],
      definitions: [
        { term: "This Month Return", desc: "how the strategy has moved in the current month." },
        { term: "Total Result", desc: "how it has moved since it started on Batman." },
        { term: "Largest Drop", desc: "the biggest fall it has had from a peak." },
        { term: "People Following", desc: "how many users are currently following." },
        { term: "Start from", desc: "the minimum balance you need to follow." },
      ],
    },
    {
      heading: "Understanding movement level",
      paragraphs: ["Strategies are grouped into three types based on their historical movement:"],
      definitions: [
        {
          term: "More Stable",
          desc: "strategies with smaller historical drops. Steadier but may also have lower returns.",
        },
        {
          term: "Balanced Growth",
          desc: "moderate movement with a mix of risk and return.",
        },
        {
          term: "Higher Growth",
          desc: "larger ups and downs. Higher potential returns but also higher drops.",
        },
      ],
      callout: {
        tone: "tip",
        body: 'There is no "best" movement level. It depends on how much movement you are comfortable with.',
      },
    },
    {
      heading: "Largest Drop — what it means",
      paragraphs: [
        "The largest drop shows the biggest fall a strategy has had from its highest point to its lowest. A smaller largest drop means the strategy has historically been more stable.",
      ],
      callout: {
        tone: "example",
        body: "A largest drop of -1.8% means the strategy once fell 1.8% from a peak before recovering. A largest drop of -24% means it fell much more at some point.",
      },
    },
    {
      heading: "Reading the Strategy Detail page",
      paragraphs: [
        "Once you click View Details on a strategy card, you get the full picture: performance chart over time, risk and movement section, and the complete fee structure. Read these before following.",
        "The follow panel on the right shows you the start amount, fee, fee timing, risk limit, and control options — all in one place.",
      ],
    },
    {
      heading: "A simple checklist before following",
      paragraphs: ["Before you confirm following a strategy, ask yourself:"],
      bullets: [
        "Do I understand what the fee is and when it applies?",
        "Am I comfortable with the largest drop this strategy has had?",
        "Do I have at least the minimum starting amount?",
        "Do I understand that my account value can go up or down?",
      ],
    },
  ],
};

const PORTFOLIO_TRACKING_GUIDE: GuideContent = {
  emoji: "📈",
  title: "Portfolio tracking",
  sections: [
    {
      heading: "What your portfolio shows",
      paragraphs: [
        "Your Portfolio page is where you monitor everything after you start following a strategy. It shows your total account value, today's change, and the strategies you are currently following.",
      ],
    },
    {
      heading: "Total Account Value",
      paragraphs: [
        "This is the sum of all your connected trading accounts on Batman. It may change while trades are open because open positions affect your account equity in real time.",
      ],
      callout: {
        tone: "info",
        label: "NOTE",
        body: "The value shown reflects your current equity, which includes any floating profit or loss from open positions. It will settle once positions are closed.",
      },
    },
    {
      heading: "Today's Change",
      paragraphs: [
        "This shows how much your total account value has changed since the start of today. It only reflects accounts that are currently following a strategy.",
        "A positive number means your followed strategies have moved in your favour today. A negative number means they have moved against you.",
      ],
    },
    {
      heading: "Current Strategies section",
      paragraphs: [
        "This section shows each strategy you are following, which account is used, and key performance stats: This Month return, Largest Drop, and Account Value for that account.",
        "The Manage button takes you to the Strategy Detail page where you can see the full picture and stop following if needed.",
      ],
    },
    {
      heading: "Accounts for Following",
      paragraphs: [
        "This section shows all your connected trading accounts and their status: following a strategy, available, or limited. Each row shows the account value and available actions.",
        "Add Funds and Withdraw Funds are accessible from each account row. These will redirect you to your broker to complete the transaction.",
      ],
      callout: {
        tone: "tip",
        body: "Batman does not process funds directly. All deposits and withdrawals are handled by your broker.",
      },
    },
    {
      heading: "Recent Updates",
      paragraphs: [
        "This section shows the latest updates from your strategies and accounts — fee settlements, strategy status changes, and deposit confirmations. Trade-level details are grouped so the feed stays readable.",
      ],
    },
  ],
};

const STOPPING_A_STRATEGY_GUIDE: GuideContent = {
  emoji: "🛑",
  title: "Stopping a strategy",
  sections: [
    {
      heading: "You can stop anytime",
      paragraphs: [
        "You can stop following a strategy at any time from your Portfolio. There is no lock-in period, no approval needed, and no waiting period. The Manage button on your strategy card leads to the stop following option.",
      ],
    },
    {
      heading: "What happens when you stop",
      paragraphs: [
        "When you stop following, Batman closes all open positions that were copied from the strategy at market price. This means the positions are closed at whatever the current market price is at that moment — not a guaranteed price.",
      ],
    },
    {
      heading: "Fee settlement on stop",
      paragraphs: [
        "When you stop mid-week, Batman runs a final fee settlement at that point. If your account has new profit above the high water mark, the applicable fee is calculated and deducted before your account becomes available again.",
        "If there is no new profit, no fee is charged.",
      ],
      callout: {
        tone: "example",
        body: "If you stop on Wednesday and your account has made new profit since Monday, the fee for that partial week is calculated and settled immediately.",
      },
    },
    {
      heading: "After stopping",
      paragraphs: [
        "Once the process is complete, your account status changes to Available. You can then use that account to follow a different strategy. The stop is permanent — to follow the same strategy again, you start a new follow relationship and your high water mark resets.",
      ],
      callout: {
        tone: "tip",
        body: "Starting a new follow resets the high water mark to your current equity. You will not carry over any previous high water mark from a past follow.",
      },
    },
    {
      heading: "Auto-stop — when Batman stops automatically",
      paragraphs: [
        "If your account drops 30% from its high water mark, Batman will stop following the strategy automatically. The same process applies: positions are closed, fee is settled, account becomes available.",
        "You will receive a notification when auto-stop is triggered. You can also see the status in your Portfolio and notification panel.",
      ],
      callout: {
        tone: "warning",
        body: "Auto-stop closes positions at market price. The final account value may differ from exactly 30% below the high water mark due to market conditions at the time of closing.",
      },
    },
  ],
};

export type GuideCard = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  popup?: GuideContent;
};

export const GUIDES: GuideCard[] = [
  {
    icon: FileText,
    title: "How strategy following works",
    body: "Learn what happens when you follow a strategy, and how the copying applies to your account.",
    popup: STRATEGY_FOLLOWING_GUIDE,
  },
  {
    icon: DollarSign,
    title: "Understanding fees",
    body: "Learn when fees apply and how the profit-sharing fee is calculated.",
    popup: UNDERSTANDING_FEES_GUIDE,
  },
  {
    icon: AlertTriangle,
    title: "Risk basics",
    body: "Understand what to expect before you start following a strategy.",
    popup: RISK_BASICS_GUIDE,
  },
  {
    icon: Target,
    title: "How to choose a strategy",
    body: "Learn how to compare strategies by movement, performance, and starting amount.",
    popup: HOW_TO_CHOOSE_STRATEGY_GUIDE,
  },
  {
    icon: TrendingUp,
    title: "Portfolio tracking",
    body: "Understand what's in your portfolio today, and how to read what you see.",
    popup: PORTFOLIO_TRACKING_GUIDE,
  },
  {
    icon: StopIcon,
    title: "Stopping a strategy",
    body: "Learn what happens when you stop following — both open positions and account status.",
    popup: STOPPING_A_STRATEGY_GUIDE,
  },
];
