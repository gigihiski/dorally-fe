import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { GuideModal } from "@/components/GuideModal";
import { GUIDES, GUIDE_SLUGS } from "@/components/learn/guides";

type LearnGuideContextValue = {
  /** Open a guide popup by its slug (e.g. "risk-basics"). No-op for unknown slugs. */
  openGuideBySlug: (slug: string) => void;
  /** Open a guide popup by its index in GUIDES. */
  openGuideByIndex: (idx: number) => void;
  /** Close the popup (stays on the current page). */
  closeGuide: () => void;
};

const LearnGuideContext = createContext<LearnGuideContextValue | null>(null);

/**
 * Provides an in-place Learn guide popup to every page beneath it. Mounted at the
 * /dashboard layout so any /dashboard/* page can open a guide without navigating away.
 */
export function LearnGuideProvider({ children }: { children: React.ReactNode }) {
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  const openGuideByIndex = useCallback((idx: number) => {
    if (idx >= 0 && idx < GUIDES.length && GUIDES[idx].popup) setOpenGuide(idx);
  }, []);

  const openGuideBySlug = useCallback(
    (slug: string) => {
      const idx = GUIDE_SLUGS[slug];
      if (typeof idx === "number") openGuideByIndex(idx);
    },
    [openGuideByIndex],
  );

  const closeGuide = useCallback(() => setOpenGuide(null), []);

  const value = useMemo<LearnGuideContextValue>(
    () => ({ openGuideBySlug, openGuideByIndex, closeGuide }),
    [openGuideBySlug, openGuideByIndex, closeGuide],
  );

  const activeGuide = openGuide !== null ? GUIDES[openGuide] : null;
  const totalGuides = GUIDES.length;

  const findNeighborIdx = (from: number, dir: -1 | 1): number | null => {
    for (let i = from + dir; i >= 0 && i < GUIDES.length; i += dir) {
      if (GUIDES[i].popup) return i;
    }
    return null;
  };
  const prevIdx = openGuide !== null ? findNeighborIdx(openGuide, -1) : null;
  const nextIdx = openGuide !== null ? findNeighborIdx(openGuide, 1) : null;

  return (
    <LearnGuideContext.Provider value={value}>
      {children}
      <GuideModal
        open={openGuide !== null}
        guide={activeGuide?.popup ?? null}
        positionLabel={openGuide !== null ? `${openGuide + 1} of ${totalGuides} guides` : ""}
        onClose={closeGuide}
        onPrev={prevIdx !== null ? () => setOpenGuide(prevIdx) : undefined}
        onNext={nextIdx !== null ? () => setOpenGuide(nextIdx) : closeGuide}
        prevDisabled={prevIdx === null}
        nextDisabled={false}
        nextLabel={nextIdx !== null ? "Next guide →" : "Close guide"}
      />
    </LearnGuideContext.Provider>
  );
}

/** Access the in-place Learn guide popup. Must be used under a LearnGuideProvider. */
export function useLearnGuide(): LearnGuideContextValue {
  const ctx = useContext(LearnGuideContext);
  if (!ctx) throw new Error("useLearnGuide must be used within a LearnGuideProvider");
  return ctx;
}
