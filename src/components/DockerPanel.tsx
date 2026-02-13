'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Spinner from './Spinner';
import { ChevronLeftIcon } from './icons';

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string[];
}

type View = 'list' | 'logs';

function stateDot(state: string) {
  if (state === 'running') return 'bg-emerald-400';
  if (state === 'exited' || state === 'dead') return 'bg-red-400';
  return 'bg-amber-400';
}

export default function DockerPanel() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [view, setView] = useState<View>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/docker/containers');
      if (res.status === 500) {
        setError('Docker not available');
        setContainers([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch containers');
      const data = await res.json();
      setContainers(data.containers ?? []);
    } catch {
      setError('Docker not available');
      setContainers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = async (containerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/docker/containers/${containerId}/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs ?? '');
      setSelectedContainer(containerId);
      setView('logs');
    } catch {
      setLogs('Error loading logs');
    } finally {
      setLoading(false);
    }
  };

  const restartContainer = async () => {
    if (!selectedContainer) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/docker/containers/${selectedContainer}/restart`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to restart');
      await fetchLogs(selectedContainer);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  useEffect(() => {
    if (view === 'logs') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, view]);

  const selected = containers.find((c) => c.id === selectedContainer);

  return (
    <div className="h-full flex flex-col">
      {view === 'list' ? (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
          <span className="text-sm text-slate-400">
            {containers.length} container{containers.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchContainers}
            className="text-xs font-medium text-blue-400 active:text-blue-300 px-2 py-1 rounded"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50">
          <button
            onClick={() => { setView('list'); setLogs(''); setSelectedContainer(null); }}
            className="text-blue-400 active:text-blue-300"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-sm text-slate-200 truncate font-medium flex-1">
            {selected?.name ?? selectedContainer}
          </span>
          <button
            onClick={restartContainer}
            disabled={loading}
            className="text-xs font-medium text-amber-400 active:text-amber-300 px-2 py-1 rounded disabled:opacity-50"
          >
            Restart
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {error && view === 'list' && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 text-slate-600 mb-3">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <path d="M7 8h2m2 0h2m2 0h2" />
              <path d="M7 11h2m2 0h2" />
            </svg>
            <p className="text-sm text-slate-500 text-center">{error}</p>
          </div>
        )}

        {view === 'list' && !error && (
          <>
            {loading && containers.length === 0 && <Spinner />}
            {!loading && containers.length === 0 && (
              <p className="text-center text-slate-500 py-16 text-sm">No containers found</p>
            )}
            <div className="p-3 space-y-2">
              {containers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => fetchLogs(c.id)}
                  className="w-full text-left bg-slate-800/50 rounded-lg p-3 active:bg-slate-800 transition-colors border border-slate-700/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full flex-none ${stateDot(c.state)}`} />
                    <span className="text-sm font-semibold text-slate-200 truncate">{c.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-1.5">{c.image}</p>
                  <p className="text-xs text-slate-400">{c.status}</p>
                  {c.ports.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.ports.map((p, i) => (
                        <span key={i} className="text-[10px] bg-slate-700/70 text-slate-300 px-1.5 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'logs' && (
          <>
            {loading && <Spinner />}
            {!loading && (
              <pre className="text-xs font-mono text-slate-300 p-3 whitespace-pre-wrap break-words leading-relaxed">
                {logs || 'No logs available'}
                <div ref={logsEndRef} />
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
