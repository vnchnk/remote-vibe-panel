import http from 'http';
import { parse as parseUrl } from 'url';
import crypto from 'crypto';

const SOH = '\x01';
const STX = '\x02'; // Session ID response
const ETX = '\x03'; // Agent type message
const MAX_BUFFER_LINES = 1000;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

type AgentType = 'claude' | 'gemini' | 'codex' | 'bash';

interface TerminalSession {
  shell: any;
  buffer: string[];
  lastActivity: number;
  projectDir: string;
  agentType: AgentType;
}

export function setupTerminalWs(server: http.Server): void {
  let pty: typeof import('node-pty') | null = null;

  try {
    pty = require('node-pty');
  } catch {
    console.warn('node-pty not available — terminal disabled');
    return;
  }

  const WS = require('ws');
  const wss = new WS.Server({ noServer: true });

  // Store active terminal sessions
  const sessions = new Map<string, TerminalSession>();

  // Cleanup abandoned sessions periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        console.log(`[terminal] cleaning up inactive session ${sessionId}`);
        try {
          session.shell.kill();
        } catch (e) {
          // ignore
        }
        sessions.delete(sessionId);
      }
    }
  }, 60000); // Check every minute

  server.on('close', () => {
    clearInterval(cleanupInterval);
    for (const session of sessions.values()) {
      try {
        session.shell.kill();
      } catch (e) {
        // ignore
      }
    }
    sessions.clear();
  });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parseUrl(req.url || '/', true);
    if (pathname !== '/ws/terminal') {
      return; // Let Next.js handle HMR and other WebSockets
    }
    wss.handleUpgrade(req, socket, head, (ws: any) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: any, req: http.IncomingMessage) => {
    // Parse project dir from cookies
    const cookieHeader = req.headers.cookie || '';
    const projectDirMatch = cookieHeader.match(/project_dir=([^;]+)/);
    const projectDir = projectDirMatch
      ? decodeURIComponent(projectDirMatch[1])
      : process.env.PROJECT_DIR || process.cwd();

    let session: TerminalSession | undefined;
    let sessionId: string | null = null;

    const initializeSession = (agentType: AgentType, tabId: string) => {
      // Check for existing session cookie for this specific tab
      const sessionIdMatch = cookieHeader.match(new RegExp(`terminal_session_${tabId}=([^;]+)`));
      sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

      let isReconnect = false;

      // Try to reconnect to existing session
      if (sessionId && sessions.has(sessionId)) {
        session = sessions.get(sessionId)!;
        // Verify project directory and agent type match
        if (session.projectDir === projectDir && session.agentType === agentType) {
          isReconnect = true;
          console.log(`[terminal] reconnecting to ${agentType} tab ${tabId} session ${sessionId}`);

          // Send buffered output
          const buffered = session.buffer.join('');
          if (buffered.length > 0) {
            ws.send(buffered);
          }
        } else {
          // Project dir or agent changed, create new session
          console.log(`[terminal] context changed, creating new ${agentType} tab ${tabId} session`);
          sessionId = null;
        }
      }

      // Create new session if not reconnecting
      if (!isReconnect) {
        sessionId = crypto.randomBytes(16).toString('hex');
        console.log(`[terminal] creating new ${agentType} tab ${tabId} session ${sessionId}`);

        let shell: any;
        const spawnShell = (cmd: string, args: string[] = []) => {
          // Strip CLAUDE* env vars for AI agents to avoid "nested session" error
          const cleanEnv = { ...process.env };
          if (agentType !== 'bash') {
            for (const key of Object.keys(cleanEnv)) {
              if (key.startsWith('CLAUDE')) delete cleanEnv[key];
            }
          }

          return pty!.spawn(cmd, args, {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: projectDir,
            env: agentType !== 'bash' ? cleanEnv : undefined,
          });
        };

        try {
          switch (agentType) {
            case 'claude':
              console.log(`[terminal] spawning claude, cwd: ${projectDir}`);
              shell = spawnShell('claude');
              break;
            case 'gemini':
              console.log(`[terminal] spawning gemini, cwd: ${projectDir}`);
              // Try to spawn gemini CLI if available
              try {
                shell = spawnShell('gemini');
              } catch {
                ws.send('\r\n\x1b[33mGemini CLI not found. Install it first.\x1b[0m\r\n');
                ws.close();
                return;
              }
              break;
            case 'codex':
              console.log(`[terminal] spawning codex, cwd: ${projectDir}`);
              // Try to spawn codex CLI if available
              try {
                shell = spawnShell('codex');
              } catch {
                ws.send('\r\n\x1b[33mCodex CLI not found. Install it first.\x1b[0m\r\n');
                ws.close();
                return;
              }
              break;
            case 'bash':
              console.log(`[terminal] spawning bash, cwd: ${projectDir}`);
              const fallbackCmd = process.env.SHELL || '/bin/bash';
              shell = spawnShell(fallbackCmd);
              break;
          }
          console.log(`[terminal] spawned ${agentType}, pid: ${shell.pid}`);
        } catch (err) {
          console.error(`[terminal] spawn failed for ${agentType}:`, err);
          ws.send(`\r\n\x1b[31mFailed to spawn ${agentType}: ${String(err)}\x1b[0m\r\n`);
          ws.close();
          return;
        }

        session = {
          shell,
          buffer: [],
          lastActivity: Date.now(),
          projectDir,
          agentType,
        };
        sessions.set(sessionId, session);

        // Buffer output for reconnection
        shell.onData((data: string) => {
          const currentSession = sessions.get(sessionId!);
          if (!currentSession) return;
          currentSession.buffer.push(data);
          // Keep only last N lines worth of data
          const totalLength = currentSession.buffer.join('').length;
          if (totalLength > MAX_BUFFER_LINES * 200) { // ~200 chars per line average
            const excess = totalLength - MAX_BUFFER_LINES * 100;
            let removed = 0;
            while (removed < excess && currentSession.buffer.length > 0) {
              removed += currentSession.buffer.shift()!.length;
            }
          }
          // Forward to websocket
          if (ws.readyState === WS.OPEN) {
            ws.send(data);
          }
        });

        shell.onExit(() => {
          console.log(`[terminal] ${agentType} shell exited for session ${sessionId}`);
          sessions.delete(sessionId!);
          if (ws.readyState === WS.OPEN || ws.readyState === WS.CONNECTING) {
            ws.close();
          }
        });
      } else {
        // For reconnection, set up data forwarding
        session!.shell.onData((data: string) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(data);
          }
        });
      }

      // Send session ID to client
      ws.send(STX + sessionId);

      if (session) {
        session.lastActivity = Date.now();
      }
    };

    ws.on('message', (message: Buffer | string) => {
      const msg = typeof message === 'string' ? message : message.toString('utf-8');

      // Handle agent type initialization
      if (msg.startsWith(ETX)) {
        try {
          const { agentType, tabId } = JSON.parse(msg.slice(1));
          console.log(`[terminal] received agent type: ${agentType}, tab ID: ${tabId}`);
          initializeSession(agentType, tabId);
        } catch (e) {
          console.error('[terminal] failed to parse agent info:', e);
        }
        return;
      }

      // Session must be initialized before handling other messages
      if (!session) {
        console.warn('[terminal] message received before session initialized');
        return;
      }

      session.lastActivity = Date.now();

      // Handle resize
      if (msg.startsWith(SOH)) {
        try {
          const { cols, rows } = JSON.parse(msg.slice(1));
          console.log(`[terminal] resize: ${cols}x${rows}`);
          if (typeof cols === 'number' && typeof rows === 'number' && cols > 0 && rows > 0) {
            session.shell.resize(cols, rows);
          }
        } catch {
          // Ignore malformed resize messages
        }
        return;
      }

      // Forward input to shell
      session.shell.write(msg);
    });

    ws.on('close', () => {
      console.log(`[terminal] websocket closed for session ${sessionId}`);
      // Don't kill the shell - keep it alive for reconnection
      // Just update last activity time
      const currentSession = sessionId ? sessions.get(sessionId) : undefined;
      if (currentSession) {
        currentSession.lastActivity = Date.now();
      }
    });
  });
}
