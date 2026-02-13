'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Spinner from './Spinner';
import { ChevronLeftIcon } from './icons';

interface TableInfo {
  name: string;
  rows: number;
}

interface QueryResult {
  columns: string[];
  rows: any[][];
}

type View = 'tables' | 'query';

export default function DbPanel() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('tables');
  const [notConfigured, setNotConfigured] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/tables');
      if (res.status === 501) {
        setNotConfigured(true);
        setTables([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch tables');
      const data = await res.json();
      setTables(data.tables ?? []);
      setNotConfigured(false);
    } catch {
      setError('Failed to load tables');
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeQuery = async (query?: string) => {
    const q = query ?? sql;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setQueryResult(null);

    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: q }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Query failed');
      }
      const data = await res.json();
      setQueryResult({ columns: data.columns ?? [], rows: data.rows ?? [] });
    } catch (err: any) {
      setError(err.message ?? 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const selectTable = (name: string) => {
    const query = `SELECT * FROM "${name}" LIMIT 100`;
    setSelectedTable(name);
    setSql(query);
    setView('query');
    executeQuery(query);
  };

  useEffect(() => { fetchTables(); }, [fetchTables]);

  if (notConfigured) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 text-slate-600 mb-3">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
        <p className="text-sm text-slate-500 text-center">Database not configured</p>
        <p className="text-xs text-slate-600 mt-1 text-center">
          Set DATABASE_URL environment variable to enable
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {view === 'tables' ? (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
          <span className="text-sm text-slate-400">
            {tables.length} table{tables.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { setView('query'); setSql(''); setQueryResult(null); setError(null); setSelectedTable(null); }}
            className="text-xs font-medium text-blue-400 active:text-blue-300 px-2 py-1 rounded"
          >
            Query
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50">
          <button
            onClick={() => { setView('tables'); setQueryResult(null); setError(null); setSelectedTable(null); }}
            className="text-blue-400 active:text-blue-300"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-sm text-slate-200 font-medium truncate flex-1">
            {selectedTable ?? 'Query'}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {view === 'tables' && (
          <>
            {loading && tables.length === 0 && <Spinner />}
            {!loading && tables.length === 0 && !error && (
              <p className="text-center text-slate-500 py-16 text-sm">No tables found</p>
            )}
            {error && (
              <p className="text-center text-red-400 py-8 text-sm">{error}</p>
            )}
            <div className="divide-y divide-slate-800">
              {tables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => selectTable(t.name)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between active:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-mono text-slate-200 truncate">{t.name}</span>
                  <span className="text-xs text-slate-500 flex-none ml-2">
                    {t.rows.toLocaleString()} row{t.rows !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'query' && (
          <div className="flex flex-col">
            <div className="p-3 border-b border-slate-700/50">
              <textarea
                ref={textareaRef}
                value={sql}
                onChange={(e) => {
                  setSql(e.target.value);
                  adjustTextarea();
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    executeQuery();
                  }
                }}
                placeholder="SELECT * FROM ..."
                rows={2}
                className="w-full bg-slate-800 text-slate-200 text-sm font-mono rounded-lg p-3 border border-slate-700 focus:border-blue-500 focus:outline-none resize-none placeholder-slate-600"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-600">Cmd+Enter to run</span>
                <button
                  onClick={() => executeQuery()}
                  disabled={loading || !sql.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Running...' : 'Run'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-3 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-400 font-mono">{error}</p>
              </div>
            )}

            {loading && !queryResult && <Spinner />}
            {queryResult && (
              <div className="overflow-x-auto">
                <div className="px-3 py-2 text-[10px] text-slate-500">
                  {queryResult.rows.length} row{queryResult.rows.length !== 1 ? 's' : ''}
                  {queryResult.columns.length > 0 && ` / ${queryResult.columns.length} column${queryResult.columns.length !== 1 ? 's' : ''}`}
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {queryResult.columns.map((col) => (
                        <th
                          key={col}
                          className="text-left px-3 py-2 font-semibold text-slate-300 bg-slate-800/50 whitespace-nowrap sticky top-0"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-800/50 ${
                          i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/20'
                        }`}
                      >
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="px-3 py-1.5 text-slate-400 whitespace-nowrap font-mono max-w-[200px] truncate"
                          >
                            {cell === null ? (
                              <span className="text-slate-600 italic">NULL</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {queryResult.rows.length === 0 && (
                  <p className="text-center text-slate-500 py-8 text-sm">No rows returned</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
