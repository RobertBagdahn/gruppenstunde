import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';

/**
 * Keeps the view to one sticker (food-design-system: höchstens ein Sticker pro Ansicht).
 * The first sticker that registers gets the yellow sticker, the others fall back to flat tags.
 */
interface StickerRegistry {
  /** Id of the sticker that may render as sticker, or null before any registers. */
  owner: string | null;
  claim: (id: string) => void;
  release: (id: string) => void;
}

const StickerContext = createContext<StickerRegistry | null>(null);

export function StickerBoundary({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<string[]>([]);

  // Stable functions: a registration must not change the identity the effects depend on.
  const claim = useCallback((id: string) => setOrder((current) => (current.includes(id) ? current : [...current, id])), []);
  const release = useCallback((id: string) => setOrder((current) => current.filter((item) => item !== id)), []);

  const registry = useMemo<StickerRegistry>(
    () => ({ owner: order[0] ?? null, claim, release }),
    [order, claim, release],
  );

  return <StickerContext.Provider value={registry}>{children}</StickerContext.Provider>;
}

/** True for the single sticker of the view. Outside a boundary every sticker may render. */
export function useIsStickerOwner(): boolean {
  const registry = useContext(StickerContext);
  const id = useId();
  const claim = registry?.claim;
  const release = registry?.release;

  useEffect(() => {
    if (!claim || !release) return undefined;
    claim(id);
    return () => release(id);
  }, [claim, release, id]);

  if (!registry) return true;
  return registry.owner === id;
}
