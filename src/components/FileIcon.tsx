'use client';

const ICON_MAP: Record<string, { color: string; label: string }> = {
  ts: { color: '#3178c6', label: 'TS' },
  tsx: { color: '#3178c6', label: 'TX' },
  js: { color: '#f7df1e', label: 'JS' },
  jsx: { color: '#f7df1e', label: 'JX' },
  mjs: { color: '#f7df1e', label: 'JS' },
  mts: { color: '#3178c6', label: 'TS' },
  json: { color: '#a8b1c2', label: '{}' },
  html: { color: '#e44d26', label: '<>' },
  css: { color: '#563d7c', label: '#' },
  md: { color: '#519aba', label: 'M' },
  mdx: { color: '#519aba', label: 'M' },
  yaml: { color: '#cb171e', label: 'Y' },
  yml: { color: '#cb171e', label: 'Y' },
  toml: { color: '#9c4121', label: 'T' },
  sh: { color: '#89e051', label: '$' },
  bash: { color: '#89e051', label: '$' },
  py: { color: '#3572a5', label: 'Py' },
  go: { color: '#00add8', label: 'Go' },
  rs: { color: '#dea584', label: 'Rs' },
  java: { color: '#b07219', label: 'Jv' },
  c: { color: '#555555', label: 'C' },
  cpp: { color: '#f34b7d', label: 'C+' },
  h: { color: '#555555', label: 'H' },
  sql: { color: '#e38c00', label: 'Q' },
  dockerfile: { color: '#384d54', label: 'D' },
  svg: { color: '#ffb13b', label: 'Sv' },
  png: { color: '#a074c4', label: 'Ig' },
  jpg: { color: '#a074c4', label: 'Ig' },
  gif: { color: '#a074c4', label: 'Ig' },
  env: { color: '#ecd53f', label: '.e' },
  lock: { color: '#6a737d', label: 'Lk' },
};

function getFileInfo(filename: string): { color: string; label: string } | null {
  const name = filename.toLowerCase();
  const basename = name.split('/').pop() ?? name;
  if (basename === 'dockerfile' || basename.startsWith('dockerfile.')) return ICON_MAP.dockerfile;
  if (basename.endsWith('.env') || basename.startsWith('.env')) return ICON_MAP.env;
  if (basename.endsWith('-lock.json') || basename === 'package-lock.json' || basename === 'yarn.lock') return ICON_MAP.lock;
  const ext = basename.split('.').pop() ?? '';
  return ICON_MAP[ext] ?? null;
}

export default function FileIcon({ filename, className }: { filename: string; className?: string }) {
  const info = getFileInfo(filename);
  if (!info) return null;

  return (
    <span
      className={`flex-none inline-flex items-center justify-center w-4 h-4 rounded text-[7px] font-bold leading-none ${className ?? ''}`}
      style={{ backgroundColor: info.color + '30', color: info.color }}
    >
      {info.label}
    </span>
  );
}
