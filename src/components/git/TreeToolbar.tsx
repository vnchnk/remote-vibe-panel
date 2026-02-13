'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  filter: string;
  onFilterChange: (value: string) => void;
  contentSearchOpen: boolean;
  onToggleContentSearch: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export default function TreeToolbar({
  filter,
  onFilterChange,
  contentSearchOpen,
  onToggleContentSearch,
  onExpandAll,
  onCollapseAll,
}: Props) {
  const [localValue, setLocalValue] = useState(filter);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when filter is cleared externally
  useEffect(() => {
    if (filter === '' && localValue !== '') {
      setLocalValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleChange = (value: string) => {
    setLocalValue(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onFilterChange(value);
    }, 250);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-700/50 bg-slate-900/50">
      {/* Filter input */}
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Filter files..."
        className="flex-1 min-w-0 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-blue-500 focus:outline-none placeholder-slate-600"
      />

      {/* Search icon button */}
      <button
        onClick={onToggleContentSearch}
        title="Search in files"
        className={`flex-none w-8 h-8 flex items-center justify-center rounded transition-colors ${
          contentSearchOpen ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 active:text-slate-300'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>

      {/* Expand All */}
      <button
        onClick={onExpandAll}
        title="Expand all"
        className="flex-none w-8 h-8 flex items-center justify-center rounded text-slate-500 active:text-slate-300 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <polyline points="7 8 12 13 17 8" />
          <polyline points="7 14 12 19 17 14" />
        </svg>
      </button>

      {/* Collapse All */}
      <button
        onClick={onCollapseAll}
        title="Collapse all"
        className="flex-none w-8 h-8 flex items-center justify-center rounded text-slate-500 active:text-slate-300 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <polyline points="7 16 12 11 17 16" />
          <polyline points="7 10 12 5 17 10" />
        </svg>
      </button>
    </div>
  );
}
