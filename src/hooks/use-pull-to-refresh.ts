import { useEffect, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const refreshing = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing.current) return;
      if (el.scrollTop > 0) { setPullDistance(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPullDistance(Math.min(dy, 120));
        setPulling(dy > 60);
        if (dy > 10) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (pulling && !refreshing.current) {
        refreshing.current = true;
        try { await onRefresh(); } finally { refreshing.current = false; }
      }
      setPullDistance(0);
      setPulling(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, pulling, onRefresh]);

  return { containerRef, pullDistance, pulling };
}
