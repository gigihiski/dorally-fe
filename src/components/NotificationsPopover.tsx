import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";

// Mock notifications until the BE adds /notifications endpoints.
// Shape and component API are designed so swapping to useQuery later is one-liner.
type Variant = "success" | "info" | "warning" | "danger";
type Tone = "primary" | "outline-blue" | "outline-red" | "outline-gray";

interface NotifAction {
  label: string;
  tone: Tone;
  to?: "/dashboard/portfolio" | "/dashboard/strategies" | "/onboarding/$step";
  params?: { step: "binding" | "select" };
  onClick?: () => void;
}

interface Notification {
  id: string;
  variant: Variant;
  title: string;
  description: string;
  timeAgo: string;
  unread: boolean;
  actionNeeded: boolean;
  actions?: NotifAction[];
}

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    variant: "warning",
    title: "Document verification needed",
    description:
      "Complete your document verification with your broker before you can follow strategies.",
    timeAgo: "Today",
    unread: true,
    actionNeeded: true,
    actions: [
      {
        label: "Continue with Broker",
        tone: "primary",
        to: "/onboarding/$step",
        params: { step: "binding" },
      },
    ],
  },
  {
    id: "n2",
    variant: "warning",
    title: "Add funds needed",
    description: "This strategy starts from $10. Add funds to your account before following.",
    timeAgo: "Today",
    unread: true,
    actionNeeded: true,
    actions: [
      { label: "Add Funds", tone: "primary", to: "/dashboard/portfolio" },
    ],
  },
  {
    id: "n3",
    variant: "success",
    title: "Strategy followed",
    description: "Your account is now following Consistent Strategy.",
    timeAgo: "2h ago",
    unread: false,
    actionNeeded: false,
    actions: [{ label: "View Portfolio", tone: "outline-gray", to: "/dashboard/portfolio" }],
  },
  {
    id: "n4",
    variant: "info",
    title: "Strategy fee updated",
    description: "A strategy fee was applied to new profit from Consistent Strategy.",
    timeAgo: "Yesterday",
    unread: false,
    actionNeeded: false,
    actions: [{ label: "View Details", tone: "outline-blue", to: "/dashboard/portfolio" }],
  },
];

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "action">("all");
  const [items, setItems] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allUnread = items.filter((n) => n.unread).length;
  const actionNeeded = items.filter((n) => n.actionNeeded);
  const actionUnread = actionNeeded.filter((n) => n.unread).length;

  const visible = useMemo(() => (tab === "all" ? items : actionNeeded), [tab, items, actionNeeded]);

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => (n.unread ? { ...n, unread: false } : n)));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Notifications"
        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 relative"
      >
        <Bell className="w-5 h-5" />
        {allUnread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[440px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            <button
              type="button"
              onClick={markAllRead}
              disabled={allUnread === 0}
              className="text-sm font-semibold text-[#2563EB] hover:underline disabled:text-gray-300 disabled:cursor-not-allowed disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 flex items-center gap-6 border-b border-gray-100">
            <TabBtn
              label="All"
              count={items.length > 0 ? allUnread : null}
              active={tab === "all"}
              tone="blue"
              onClick={() => setTab("all")}
            />
            <TabBtn
              label="Action Needed"
              count={actionNeeded.length > 0 ? actionUnread : null}
              active={tab === "action"}
              tone="red"
              onClick={() => setTab("action")}
            />
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto">
            {visible.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-gray-100">
                {visible.map((n) => (
                  <NotifRow
                    key={n.id}
                    item={n}
                    onAction={() => {
                      setItems((prev) =>
                        prev.map((it) => (it.id === n.id ? { ...it, unread: false } : it)),
                      );
                      setOpen(false);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-3 text-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-[#2563EB] hover:underline"
            >
              View all updates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number | null;
  active: boolean;
  tone: "blue" | "red";
  onClick: () => void;
}) {
  const badgeBg = tone === "red" ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-gray-100 text-gray-600";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 -mb-px text-sm font-semibold inline-flex items-center gap-2 border-b-2 ${
        active ? "text-gray-900 border-[#2563EB]" : "text-gray-500 border-transparent"
      }`}
    >
      {label}
      {count !== null && count > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            active && tone === "red" ? badgeBg : badgeBg
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function NotifRow({ item, onAction }: { item: Notification; onAction: () => void }) {
  const v = VARIANT_STYLES[item.variant];
  const rowBg = item.actionNeeded ? "bg-[#FFFBEB]/40" : "bg-white";
  return (
    <li className={`relative px-6 py-4 ${rowBg}`}>
      {item.unread && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
      )}
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${v.iconBg}`}
        >
          {v.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{item.title}</p>
          <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
          <p className="text-xs text-gray-400 mt-1.5">{item.timeAgo}</p>
          {item.actions && item.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.actions.map((a) => (
                <ActionButton key={a.label} action={a} onClick={onAction} />
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ActionButton({ action, onClick }: { action: NotifAction; onClick: () => void }) {
  const cls = TONE_STYLES[action.tone];
  const handleClick = () => {
    onClick();
    action.onClick?.();
  };
  if (action.to && action.params) {
    // Only "/onboarding/$step" uses params in our seed.
    return (
      <Link
        to={action.to}
        params={action.params}
        onClick={handleClick}
        className={`inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${cls}`}
      >
        {action.label}
      </Link>
    );
  }
  if (action.to) {
    return (
      <Link
        to={action.to}
        onClick={handleClick}
        className={`inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${cls}`}
      >
        {action.label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${cls}`}
    >
      {action.label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-12 flex flex-col items-center text-center">
      <div className="relative mb-5">
        <Sparkles className="absolute -top-1 -left-3 w-3 h-3 text-[#93C5FD]" />
        <Sparkles className="absolute -top-2 right-0 w-3 h-3 text-[#93C5FD]" />
        <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center">
          <Bell className="w-8 h-8 text-[#3B82F6]" />
        </div>
      </div>
      <p className="text-base font-bold text-gray-900 mb-1">You're all caught up</p>
      <p className="text-sm text-gray-500 max-w-[260px]">
        New account and strategy updates will appear here.
      </p>
    </div>
  );
}

const VARIANT_STYLES: Record<
  Variant,
  { icon: React.ReactNode; iconBg: string }
> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-[#059669]" />,
    iconBg: "bg-[#ECFDF5]",
  },
  info: {
    icon: <Info className="w-5 h-5 text-[#2563EB]" />,
    iconBg: "bg-[#EFF6FF]",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-[#EA580C]" />,
    iconBg: "bg-[#FFF7ED] border border-[#FED7AA]",
  },
  danger: {
    icon: <AlertOctagon className="w-5 h-5 text-[#DC2626]" />,
    iconBg: "bg-[#FEE2E2]",
  },
};

const TONE_STYLES: Record<Tone, string> = {
  primary: "bg-[#2563EB] text-white hover:opacity-90",
  "outline-blue": "border border-[#2563EB] text-[#2563EB] bg-white hover:bg-[#EFF6FF]",
  "outline-red": "border border-[#DC2626] text-[#DC2626] bg-white hover:bg-[#FEF2F2]",
  "outline-gray": "border border-gray-300 text-gray-800 bg-white hover:bg-gray-50",
};
