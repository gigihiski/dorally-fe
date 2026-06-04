import { useEffect } from "react";
import { X } from "lucide-react";

export type Callout =
  | { tone: "example"; body: string }
  | { tone: "tip"; body: string }
  | { tone: "warning"; body: string }
  | { tone: "info"; label: string; body: string };
export type Definition = { term: string; desc: string };
export type Section = {
  heading: string;
  paragraphs?: string[];
  definitions?: Definition[];
  bullets?: string[];
  callout?: Callout;
};
export type GuideContent = { emoji: string; title: string; sections: Section[] };

interface GuideModalProps {
  open: boolean;
  guide: GuideContent | null;
  positionLabel: string; // e.g. "1 of 6 guides"
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}

export function GuideModal({
  open,
  guide,
  positionLabel,
  onClose,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  nextLabel = "Next guide →",
}: GuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !guide) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="guide-modal-title" className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span aria-hidden="true">{guide.emoji}</span>
            <span>{guide.title}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-7">
          {guide.sections.map((s, i) => (
            <section key={i}>
              <h3 className="text-base font-bold text-gray-900 mb-3">{s.heading}</h3>
              {s.paragraphs && s.paragraphs.length > 0 && (
                <div className="space-y-3">
                  {s.paragraphs.map((p, j) => (
                    <p key={j} className="text-sm text-gray-700 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              )}
              {s.definitions && s.definitions.length > 0 && (
                <dl className="mt-3 space-y-1.5">
                  {s.definitions.map((d, j) => (
                    <p key={j} className="text-sm text-gray-700 leading-relaxed">
                      <span className="font-semibold text-gray-900">{d.term}</span>
                      <span className="text-gray-500"> — </span>
                      <span>{d.desc}</span>
                    </p>
                  ))}
                </dl>
              )}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5 list-disc pl-5">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="text-sm text-gray-700 leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {s.callout && <CalloutBox callout={s.callout} />}
            </section>
          ))}
        </div>

        <footer className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap bg-gray-50">
          <p className="text-sm text-gray-500">{positionLabel}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={prevDisabled || !onPrev}
              className="text-sm font-semibold text-gray-700 border border-gray-300 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled || !onNext}
              className="text-sm font-semibold text-white bg-[#0F1B3D] px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nextLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function CalloutBox({ callout }: { callout: Callout }) {
  if (callout.tone === "example") {
    return (
      <div className="mt-4 bg-gray-100 border-l-4 border-gray-300 rounded-r-lg px-4 py-3">
        <p className="text-[11px] font-bold tracking-wider text-gray-500 mb-1">EXAMPLE</p>
        <p className="text-sm text-gray-700 italic leading-relaxed">{callout.body}</p>
      </div>
    );
  }
  if (callout.tone === "info") {
    return (
      <div className="mt-4 bg-gray-100 border-l-4 border-gray-300 rounded-r-lg px-4 py-3">
        <p className="text-[11px] font-bold tracking-wider text-gray-500 mb-1">{callout.label}</p>
        <p className="text-sm text-gray-700 leading-relaxed">{callout.body}</p>
      </div>
    );
  }
  if (callout.tone === "warning") {
    return (
      <div className="mt-4 bg-[#FFFBEB] border border-[#F59E0B] rounded-lg px-4 py-3 flex items-start gap-2">
        <span aria-hidden="true">⚠️</span>
        <p className="text-sm text-[#B91C1C] font-semibold leading-relaxed">{callout.body}</p>
      </div>
    );
  }
  // tip
  return (
    <div className="mt-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-4 py-3 flex items-start gap-2">
      <span aria-hidden="true">💡</span>
      <p className="text-sm text-[#065F46] font-semibold leading-relaxed">{callout.body}</p>
    </div>
  );
}
