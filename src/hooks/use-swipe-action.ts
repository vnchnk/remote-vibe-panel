import { useRef, useState, useCallback, useEffect } from 'react';

interface SwipeResult {
  ref: React.RefObject<HTMLDivElement | null>;
  offsetX: number;
  swiping: boolean;
}

export function useSwipeAction(onSwipeRight?: () => void, onSwipeLeft?: () => void): SwipeResult {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'horizontal' | 'vertical' | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
    setSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!locked.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        locked.current = 'horizontal';
      } else if (Math.abs(dy) > 10) {
        locked.current = 'vertical';
        return;
      } else {
        return;
      }
    }

    if (locked.current === 'vertical') return;

    e.preventDefault();
    setSwiping(true);
    const clamped = Math.max(-100, Math.min(100, dx));
    setOffsetX(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (offsetX > 60 && onSwipeRight) {
      onSwipeRight();
    } else if (offsetX < -60 && onSwipeLeft) {
      onSwipeLeft();
    }
    setSwiping(false);
    setOffsetX(0);
    locked.current = null;
  }, [offsetX, onSwipeRight, onSwipeLeft]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { ref, offsetX, swiping };
}
