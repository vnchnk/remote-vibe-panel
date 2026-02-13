'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { highlightText } from '@/components/highlight';
import Spinner from '@/components/Spinner';

interface SearchMatch {
  line: number;
  text: string;
}

interface SearchResult {
  file: string;
  matches: SearchMatch[];
}

interface Props {
  onFileClick: (file: string) => void;
  onClose: () => void;
}

export default function ContentSearch({ onFileClick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/files/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="border-b border-slate-700/50 bg-slate-900/30">
      {/* Search input row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search in files..."
          className="flex-1 min-w-0 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-blue-500 focus:outline-none placeholder-slate-600"
        />
        {loading && (
          <Spinner size="md" inline className="text-slate-500 flex-none" />
        )}
        <button
          onClick={onClose}
          className="flex-none w-8 h-8 flex items-center justify-center rounded text-slate-500 active:text-slate-300 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.file}
              onClick={() => onFileClick(r.file)}
              className="w-full text-left px-3 py-2 active:bg-slate-800/50 transition-colors border-t border-slate-800/30"
            >
              <div className="text-xs font-mono text-blue-400 truncate">{r.file}</div>
              {r.matches.map((m) => (
                <div key={m.line} className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-600 flex-none">{m.line}</span>
                  <span className="text-[11px] text-slate-400 truncate">{highlightText(m.text, query)}</span>
                </div>
              ))}
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <div className="px-3 py-3 text-xs text-slate-600 text-center">No results</div>
      )}
    </div>
  );
}
