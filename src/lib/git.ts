import { execFileSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { findGitRoot } from './git-utils';

function runGit(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', timeout: 10000 }).trim();
}

function findGitRepos(dir: string): string[] {
  const repos: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name === 'node_modules') continue;
      const full = path.join(dir, name);
      try {
        if (statSync(full).isDirectory() && statSync(path.join(full, '.git')).isDirectory()) {
          repos.push(full);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return repos;
}

interface FileStatus {
  file: string;
  status: string;
}

interface GitStatus {
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: string[];
}

function parseStatus(output: string, prefix: string): GitStatus {
  const staged: FileStatus[] = [];
  const unstaged: FileStatus[] = [];
  const untracked: string[] = [];

  if (!output) return { staged, unstaged, untracked };

  for (const line of output.split('\n')) {
    if (line.length < 4) continue;

    const stagedCode = line[0];
    const unstagedCode = line[1];
    const file = prefix + line.slice(3);

    if (stagedCode === '?' && unstagedCode === '?') {
      untracked.push(file);
      continue;
    }

    if (stagedCode !== ' ' && stagedCode !== '?') {
      staged.push({ file, status: stagedCode });
    }

    if (unstagedCode !== ' ' && unstagedCode !== '?') {
      unstaged.push({ file, status: unstagedCode });
    }
  }

  return { staged, unstaged, untracked };
}

export function getStatus(cwd: string): GitStatus {
  const gitRoot = findGitRoot(cwd);
  if (gitRoot) {
    const output = runGit(['status', '--porcelain'], gitRoot);
    return parseStatus(output, '');
  }

  const repos = findGitRepos(cwd);
  const combined: GitStatus = { staged: [], unstaged: [], untracked: [] };

  for (const repo of repos) {
    const repoName = path.basename(repo);
    try {
      const output = runGit(['status', '--porcelain'], repo);
      const status = parseStatus(output, repoName + '/');
      combined.staged.push(...status.staged);
      combined.unstaged.push(...status.unstaged);
      combined.untracked.push(...status.untracked);
    } catch { /* skip broken repos */ }
  }

  return combined;
}

/**
 * Resolve the git repo root and relative file path.
 * If cwd is not a git repo, the file path may contain a repo prefix (e.g. "repo-name/src/file.ts").
 * This finds the correct repo and strips the prefix for the git command.
 */
function resolveRepo(cwd: string, file: string): { repoCwd: string; relFile: string } {
  const gitRoot = findGitRoot(cwd);
  if (gitRoot) {
    return { repoCwd: gitRoot, relFile: file };
  }
  const sep = file.indexOf('/');
  if (sep > 0) {
    const repoDir = path.join(cwd, file.slice(0, sep));
    const repoRoot = findGitRoot(repoDir);
    if (repoRoot) {
      return { repoCwd: repoRoot, relFile: file.slice(sep + 1) };
    }
  }
  return { repoCwd: cwd, relFile: file };
}

function resolveGitRoot(cwd: string): string {
  return findGitRoot(cwd) || cwd;
}

export function getDiff(cwd: string, file?: string, staged?: boolean): string {
  let repoCwd = cwd;
  let relFile = file;
  if (file) {
    const resolved = resolveRepo(cwd, file);
    repoCwd = resolved.repoCwd;
    relFile = resolved.relFile;
  } else {
    repoCwd = resolveGitRoot(cwd);
  }
  const args = ['diff'];
  if (staged) args.push('--cached');
  if (relFile) args.push('--', relFile);
  return runGit(args, repoCwd);
}

export function getLog(cwd: string, limit = 20) {
  const repoCwd = resolveGitRoot(cwd);
  const SEP = '§§§';
  const output = runGit(
    ['log', `--pretty=format:%H${SEP}%h${SEP}%an${SEP}%ai${SEP}%s`, '-n', String(limit)],
    repoCwd,
  );

  if (!output) return [];

  return output
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hash, short, author, date, ...messageParts] = line.split(SEP);
      return { hash, short, author, date, message: messageParts.join(SEP) };
    });
}

export function getBranch(cwd: string): string {
  const repoCwd = resolveGitRoot(cwd);
  return runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoCwd);
}

export function stageFile(cwd: string, file: string): void {
  const { repoCwd, relFile } = resolveRepo(cwd, file);
  runGit(['add', '--', relFile], repoCwd);
}

export function unstageFile(cwd: string, file: string): void {
  const { repoCwd, relFile } = resolveRepo(cwd, file);
  runGit(['reset', 'HEAD', '--', relFile], repoCwd);
}

export function commit(cwd: string, message: string): string {
  const repoCwd = resolveGitRoot(cwd);
  return runGit(['commit', '-m', message], repoCwd);
}

export function push(cwd: string): string {
  const repoCwd = resolveGitRoot(cwd);
  return runGit(['push'], repoCwd);
}

export function discardFile(cwd: string, file: string): void {
  const { repoCwd, relFile } = resolveRepo(cwd, file);
  runGit(['checkout', '--', relFile], repoCwd);
}

export function removeUntracked(cwd: string, file: string): void {
  const { repoCwd, relFile } = resolveRepo(cwd, file);
  runGit(['clean', '-f', '--', relFile], repoCwd);
}
