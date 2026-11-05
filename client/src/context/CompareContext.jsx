import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { creatorKey } from '../utils/format.js';

const CompareContext = createContext(null);
export const useCompare = () => useContext(CompareContext);

const MAX_COMPARE = 4;

/**
 * Compare tray state (approved Variant D): creators picked anywhere in discovery
 * can be stacked into a floating tray and compared side by side.
 */
export function CompareProvider({ children }) {
  const [items, setItems] = useState([]);

  const toggle = useCallback((creator) => {
    const id = creatorKey(creator);
    setItems((prev) => {
      if (prev.some((c) => creatorKey(c) === id)) {
        return prev.filter((c) => creatorKey(c) !== id);
      }
      if (prev.length >= MAX_COMPARE) return prev; // silently cap; UI shows max reached
      return [...prev, creator];
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const has = useCallback(
    (creator) => items.some((c) => creatorKey(c) === creatorKey(creator)),
    [items]
  );
  const isFull = useCallback(() => items.length >= MAX_COMPARE, [items]);

  const value = useMemo(() => ({ items, toggle, clear, has, isFull, max: MAX_COMPARE }), [items, toggle, clear, has, isFull]);
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}
