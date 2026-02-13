import { useState, useCallback, useRef } from 'react';

interface DragHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useBottomSheet(): { dragHandlers: DragHandlers; dragOffset: number } {
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setDragOffset(dy);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    setDragOffset(0);
  }, []);

  return {
    dragHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    dragOffset,
  };
}
