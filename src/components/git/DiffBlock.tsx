'use client';

import { useMemo } from 'react';
import { useHighlighter } from '@/hooks/use-highlighter';
import { getLangFromFile, highlightCode, type HighlightedToken } from '@/lib/highlighter';

interface Props {
  diff: string;
  filename?: string;
  staged?: boolean;
  onToggleStaged?: (staged: boolean) => void;
}

interface HunkLine {
  type: 'header' | 'add' | 'remove' | 'context' | 'meta';
  content: string;
  /** Line content without the diff prefix (+/-/space) */
  code: string;
  oldNum: number | null;
  newNum: number | null;
}

function parseDiff(diff: string): HunkLine[] {
  const lines = diff.split('\n');
  const result: HunkLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'header', content: line, code: line, oldNum: null, newNum: null });
    } else if (line.startsWith('+++') || line.startsWith('---')) {
      result.push({ type: 'meta', content: line, code: line, oldNum: null, newNum: null });
    } else if (line.startsWith('+')) {
      result.push({ type: 'add', content: line, code: line.slice(1), oldNum: null, newNum: newLine });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({ type: 'remove', content: line, code: line.slice(1), oldNum: oldLine, newNum: null });
      oldLine++;
    } else {
      // Context line — strip leading space
      result.push({ type: 'context', content: line, code: line.startsWith(' ') ? line.slice(1) : line, oldNum: oldLine, newNum: newLine });
      oldLine++;
      newLine++;
    }
  }

  return result;
}

const lineStyles: Record<string, string> = {
  header: 'bg-indigo-500/15 text-indigo-300',
  meta: 'text-slate-500',
  add: 'bg-emerald-500/15',
  remove: 'bg-red-500/15',
  context: '',
};

/**
 * Build a map from code-only line content → highlighted tokens.
 * We concatenate all code lines, highlight once, then map back by index.
 */
function buildHighlightMap(
  parsed: HunkLine[],
  lang: string,
  hl: NonNullable<ReturnType<typeof useHighlighter>>,
): Map<number, HighlightedToken[]> {
  const codeLines = parsed
    .filter((l) => l.type === 'add' || l.type === 'remove' || l.type === 'context')
    .map((l) => l.code);

  if (codeLines.length === 0) return new Map();

  const tokens = highlightCode(codeLines.join('\n'), lang, hl);
  const map = new Map<number, HighlightedToken[]>();
  let tokenIdx = 0;

  for (let i = 0; i < parsed.length; i++) {
    const line = parsed[i];
    if (line.type === 'add' || line.type === 'remove' || line.type === 'context') {
      if (tokenIdx < tokens.length) {
        map.set(i, tokens[tokenIdx]);
      }
      tokenIdx++;
    }
  }

  return map;
}

export default function DiffBlock({ diff, filename, staged, onToggleStaged }: Props) {
  const parsed = parseDiff(diff);
  const hl = useHighlighter();
  const lang = filename ? getLangFromFile(filename) : null;

  const highlightMap = useMemo(() => {
    if (!hl || !lang) return null;
    return buildHighlightMap(parsed, lang, hl);
  }, [diff, hl, lang]);

  const renderContent = (line: HunkLine, idx: number) => {
    if (line.type === 'header' || line.type === 'meta') {
      return <span className="flex-1 px-2">{line.content || '\u00A0'}</span>;
    }

    const tokens = highlightMap?.get(idx);
    if (!tokens || tokens.length === 0) {
      return <span className="flex-1 px-2 text-slate-400">{line.content || '\u00A0'}</span>;
    }

    return (
      <span className="flex-1 px-2">
        {tokens.map((token, j) => (
          token.color
            ? <span key={j} style={{ color: token.color }}>{token.content}</span>
            : <span key={j}>{token.content}</span>
        ))}
      </span>
    );
  };

  return (
    <div>
      {onToggleStaged && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
          <button
            onClick={() => onToggleStaged(false)}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
              !staged ? 'bg-slate-700 text-slate-200' : 'text-slate-500 active:text-slate-300'
            }`}
          >
            Unstaged
          </button>
          <button
            onClick={() => onToggleStaged(true)}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
              staged ? 'bg-slate-700 text-slate-200' : 'text-slate-500 active:text-slate-300'
            }`}
          >
            Staged
          </button>
        </div>
      )}

      <pre className="text-xs leading-relaxed font-mono overflow-x-auto">
        {parsed.map((line, i) => {
          const isHunkBoundary = line.type === 'header' && i > 0;
          return (
            <div
              key={i}
              className={`flex ${lineStyles[line.type]} ${isHunkBoundary ? 'mt-2 border-t border-slate-700/50 pt-0.5' : ''}`}
            >
              <span className="flex-none w-9 text-right text-[10px] text-slate-600 select-none pr-1 opacity-60">
                {line.oldNum ?? ''}
              </span>
              <span className="flex-none w-9 text-right text-[10px] text-slate-600 select-none pr-2 opacity-60">
                {line.newNum ?? ''}
              </span>
              {renderContent(line, i)}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
