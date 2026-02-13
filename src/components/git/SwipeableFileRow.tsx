'use client';

import React from 'react';
import { useSwipeAction } from '@/hooks/use-swipe-action';
import { highlightText } from '@/components/highlight';
import FileIcon from '@/components/FileIcon';
import { statusBadgeBg } from './types';
import type { FileSection } from './types';

interface Props {
  file: string;
  status: string;
  section: FileSection;
  filter?: string;
  lastViewedFile?: string | null;
  onStage: () => void;
  onUnstage: () => void;
  onDiscard: () => void;
  onTap: () => void;
}

export default function SwipeableFileRow({ file, status, section, filter = '', lastViewedFile, onStage, onUnstage, onDiscard, onTap }: Props) {
  const swipeRight = section === 'staged' ? onUnstage : onStage;
  const { ref, offsetX, swiping } = useSwipeAction(swipeRight, onDiscard);

  const rightLabel = section === 'staged' ? 'Unstage' : 'Stage';
  const rightBg = section === 'staged' ? 'bg-amber-600' : 'bg-emerald-600';

  return (
    <div ref={ref} className="relative overflow-hidden">
      {/* Left reveal (swipe right → stage/unstage) */}
      <div className={`absolute inset-y-0 left-0 ${rightBg} flex items-center px-4`} style={{ width: Math.max(0, offsetX) }}>
        {offsetX > 40 && <span className="text-white text-xs font-semibold whitespace-nowrap">{rightLabel}</span>}
      </div>

      {/* Right reveal (swipe left → discard) */}
      <div className="absolute inset-y-0 right-0 bg-red-600 flex items-center justify-end px-4" style={{ width: Math.max(0, -offsetX) }}>
        {offsetX < -40 && <span className="text-white text-xs font-semibold whitespace-nowrap">Discard</span>}
      </div>

      {/* Foreground row */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1 bg-slate-900 relative z-10 ${lastViewedFile === file ? 'reveal-highlight' : ''}`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <span className={`flex-none w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${statusBadgeBg[status] ?? 'bg-slate-600'}`}>
          {status}
        </span>
        <FileIcon filename={file} />

        <button onClick={onTap} className="flex-1 min-w-0 text-left truncate">
          <span className="text-xs font-mono text-slate-200">{highlightText(file, filter)}</span>
        </button>

        <button
          onClick={swipeRight}
          className="flex-none w-8 h-8 flex items-center justify-center rounded active:bg-slate-800"
          title={rightLabel}
        >
          {section === 'staged' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-amber-400">
              <polyline points="5 12 12 19 19 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-emerald-400">
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
