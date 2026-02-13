export interface DirEntry {
  name: string;
  type: 'file' | 'dir';
  gitStatus: string | null;
  hasChanges: boolean;
}

export interface TreeNode {
  name: string;
  type: 'file' | 'dir';
  path: string;            // relative path from project root
  gitStatus: string | null;
  hasChanges: boolean;
  children?: TreeNode[];
}

export interface Commit {
  hash: string;
  short: string;
  author: string;
  date: string;
  message: string;
}

export interface FileStatus {
  file: string;
  status: string;
}

export type FileSection = 'staged' | 'unstaged' | 'untracked';

export type GitView = 'changes' | 'tree' | 'diff' | 'log';

export const statusColor: Record<string, string> = {
  M: 'text-amber-400',
  A: 'text-emerald-400',
  D: 'text-red-400',
  R: 'text-blue-400',
  '?': 'text-slate-500',
};

export const statusBadgeBg: Record<string, string> = {
  M: 'bg-amber-600',
  A: 'bg-emerald-600',
  D: 'bg-red-600',
  R: 'bg-blue-600',
  '?': 'bg-slate-600',
};
