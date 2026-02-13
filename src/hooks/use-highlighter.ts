'use client';

import { useState, useEffect } from 'react';
import type { Highlighter } from '@/lib/highlighter';
import { getHighlighter } from '@/lib/highlighter';

export function useHighlighter(): Highlighter | null {
  const [hl, setHl] = useState<Highlighter | null>(null);

  useEffect(() => {
    getHighlighter().then(setHl);
  }, []);

  return hl;
}
