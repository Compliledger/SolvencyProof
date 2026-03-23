import { useState, useEffect } from 'react';

/**
 * Hook to track first visit to a page and trigger animations
 * Uses sessionStorage so animations replay on new sessions
 */
export function useFirstVisit(pageKey: string): {
  isFirstVisit: boolean;
  hasAnimated: boolean;
  markAsVisited: () => void;
} {
  const storageKey = `visited_${pageKey}`;
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const visited = sessionStorage.getItem(storageKey);
    if (visited) {
      setIsFirstVisit(false);
      setHasAnimated(true);
    }
  }, [storageKey]);

  const markAsVisited = () => {
    sessionStorage.setItem(storageKey, 'true');
    setHasAnimated(true);
  };

  return { isFirstVisit, hasAnimated, markAsVisited };
}
