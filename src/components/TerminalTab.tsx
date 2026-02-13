'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import '@xterm/xterm/css/xterm.css';
import type { Terminal as XTerminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import Spinner from './Spinner';

type Status = 'connecting' | 'connected' | 'disconnected';
type AgentType = 'claude' | 'gemini' | 'codex' | 'bash';

interface TerminalTabProps {
  tabId: string;
  agentType: AgentType;
  isActive: boolean;
  onClose?: () => void;
}

export default function TerminalTab({ tabId, agentType, isActive }: TerminalTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sentInitialSize = useRef(false);
  const [status, setStatus] = useState<Status>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    setErrorMessage(null); // Clear previous errors

    const { Terminal: XTerm } = await import('@xterm/xterm');
    const { FitAddon: Fit } = await import('@xterm/addon-fit');
    const { WebLinksAddon } = await import('@xterm/addon-web-links');

    if (termRef.current) {
      termRef.current.dispose();
    }

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Fira Code", "Cascadia Code", Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        cursor: '#60a5fa',
        selectionBackground: '#334155',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f8fafc',
      },
      allowProposedApi: true,
    });

    const fitAddon = new Fit();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(container);

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    sentInitialSize.current = false;

    /* ---- WebSocket ---- */
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/ws/terminal`);
    wsRef.current = ws;

    setStatus('connecting');
    ws.binaryType = 'arraybuffer';

    const sendSize = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      try { fitAddon.fit(); } catch { /* ignore */ }
      if (term.cols > 1 && term.rows > 1) {
        ws.send('\x01' + JSON.stringify({ cols: term.cols, rows: term.rows }));
        sentInitialSize.current = true;
      }
    };

    ws.onopen = () => {
      // Send agent type and tab ID
      ws.send('\x03' + JSON.stringify({ agentType, tabId }));
      setStatus('connected');
      sendSize();
    };

    ws.onmessage = (event) => {
      const data = event.data;

      // Check for session ID message (starts with \x02)
      if (typeof data === 'string' && data.startsWith('\x02')) {
        const sessionId = data.slice(1);
        // Store session ID in cookie (expires in 30 days) - use tabId for unique sessions
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `terminal_session_${tabId}=${sessionId}; path=/; expires=${expires}; SameSite=Strict`;
        console.log(`[terminal] session ID received for tab ${tabId}:`, sessionId);
        return;
      }

      // Check for error messages (contain ANSI red color codes)
      if (typeof data === 'string' && (data.includes('\x1b[31m') || data.includes('\x1b[33m'))) {
        // Extract error message (remove ANSI codes)
        const cleanMessage = data.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r?\n/g, '').trim();
        setErrorMessage(cleanMessage);
      }

      if (data instanceof ArrayBuffer) {
        term.write(new Uint8Array(data));
      } else {
        term.write(data);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      if (!errorMessage) {
        setErrorMessage('Connection closed');
      }
    };
    ws.onerror = () => {
      setStatus('disconnected');
      if (!errorMessage) {
        setErrorMessage('Connection error');
      }
    };

    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    const resizeDisposable = term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('\x01' + JSON.stringify({ cols, rows }));
      }
    });

    const handleWindowResize = () => {
      try { fitAddon.fit(); } catch { /* ignore */ }
    };
    window.addEventListener('resize', handleWindowResize);

    // ResizeObserver for tab switches and container size changes
    const observer = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* ignore */ }
      // If we haven't sent proper dimensions yet, try now
      if (!sentInitialSize.current) sendSize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      dataDisposable.dispose();
      resizeDisposable.dispose();
      window.removeEventListener('resize', handleWindowResize);
      ws.close();
      term.dispose();
      termRef.current = null;
      wsRef.current = null;
      fitAddonRef.current = null;
    };
  }, [agentType, tabId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    connect().then((c) => { cleanup = c; });
    return () => { cleanup?.(); };
  }, [connect]);

  return (
    <div className={`h-full flex flex-col bg-[#0f172a] relative ${isActive ? '' : 'hidden'}`}>
      {status !== 'connected' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          {status === 'connecting' && (
            <div className="flex flex-col items-center gap-3">
              <Spinner inline />
              <span className="text-sm text-slate-300">Connecting to {agentType}...</span>
            </div>
          )}
          {status === 'disconnected' && (
            <div className="flex flex-col items-center gap-3 max-w-md px-4">
              <span className="text-sm font-semibold text-red-400">
                {errorMessage || 'Disconnected'}
              </span>
              {errorMessage && errorMessage.includes('not found') && (
                <span className="text-xs text-slate-400 text-center">
                  Install the CLI tool to use this agent
                </span>
              )}
              <button
                onClick={() => {
                  setErrorMessage(null);
                  connect();
                }}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg active:bg-blue-700 transition-colors"
              >
                Reconnect
              </button>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}

export type { AgentType };
