import { readdirSync, statSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { findGitRoot } from './git-utils';

interface DirEntry {
  name: string;
  type: 'file' | 'dir';
  gitStatus: string | null;
  hasChanges: boolean;
}

/** Check if a directory has any git changes (is itself a git root or inside one) */
function dirHasChanges(dir: string): boolean {
  try {
    const output = execFileSync('git', ['status', '--porcelain'], {
      cwd: dir,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/** Get git status map: relative path → status code */
function getGitStatusMap(gitRoot: string): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const output = execFileSync('git', ['status', '--porcelain'], {
      cwd: gitRoot,
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();
    if (!output) return map;
    for (const line of output.split('\n')) {
      if (line.length < 4) continue;
      const stagedCode = line[0];
      const unstagedCode = line[1];
      const file = line.slice(3);
      if (stagedCode !== ' ' && stagedCode !== '?') {
        map.set(file, stagedCode);
      } else if (unstagedCode !== ' ') {
        map.set(file, unstagedCode === '?' ? '?' : unstagedCode);
      }
    }
  } catch {
    // not a git repo or error
  }
  return map;
}

export function listDirectory(dir: string): { entries: DirEntry[]; gitRoot: string | null } {
  const gitRoot = findGitRoot(dir);
  const statusMap = gitRoot ? getGitStatusMap(gitRoot) : new Map<string, string>();

  const items = readdirSync(dir);
  const entries: DirEntry[] = [];

  for (const name of items) {
    if (name === '.git' || name === 'node_modules' || name === '.next') continue;
    if (name.startsWith('.')) continue; // hide dotfiles

    const fullPath = path.join(dir, name);
    let isDir = false;
    try {
      isDir = statSync(fullPath).isDirectory();
    } catch {
      continue;
    }

    const relPath = gitRoot ? path.relative(gitRoot, fullPath) : null;

    if (isDir) {
      let hasChanges = false;
      if (gitRoot) {
        // We're inside a git repo — check if any file under this dir changed
        const prefix = relPath + '/';
        for (const key of statusMap.keys()) {
          if (key.startsWith(prefix)) { hasChanges = true; break; }
        }
      } else {
        // Not in a git repo — this subdir might be its own repo
        hasChanges = dirHasChanges(fullPath);
      }
      entries.push({ name, type: 'dir', gitStatus: null, hasChanges });
    } else {
      const gitStatus = relPath ? (statusMap.get(relPath) ?? null) : null;
      entries.push({ name, type: 'file', gitStatus, hasChanges: false });
    }
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { entries, gitRoot };
}

/* ------------------------------------------------------------------ */
/*  Recursive tree listing                                             */
/* ------------------------------------------------------------------ */

interface TreeNode {
  name: string;
  type: 'file' | 'dir';
  path: string;
  gitStatus: string | null;
  hasChanges: boolean;
  children?: TreeNode[];
}

const SKIP_DIRS = new Set(['.git', 'node_modules', '.next']);
const MAX_DEPTH = 20;
const MAX_ENTRIES = 10000;

export function listDirectoryRecursive(
  dir: string,
): { tree: TreeNode[]; gitRoot: string | null; truncated: boolean } {
  const gitRoot = findGitRoot(dir);
  const statusMap = gitRoot ? getGitStatusMap(gitRoot) : new Map<string, string>();
  let entryCount = 0;
  let truncated = false;

  function walk(currentDir: string, depth: number): TreeNode[] {
    if (depth > MAX_DEPTH || truncated) return [];

    let items: string[];
    try {
      items = readdirSync(currentDir);
    } catch {
      return [];
    }

    const nodes: TreeNode[] = [];

    for (const name of items) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      if (truncated) break;

      const fullPath = path.join(currentDir, name);
      let isDir = false;
      try {
        isDir = statSync(fullPath).isDirectory();
      } catch {
        continue;
      }

      entryCount++;
      if (entryCount > MAX_ENTRIES) {
        truncated = true;
        break;
      }

      const relPath = gitRoot ? path.relative(gitRoot, fullPath) : path.relative(dir, fullPath);

      if (isDir) {
        const children = walk(fullPath, depth + 1);
        let hasChanges = false;
        if (gitRoot) {
          const prefix = (gitRoot ? path.relative(gitRoot, fullPath) : relPath) + '/';
          for (const key of statusMap.keys()) {
            if (key.startsWith(prefix)) { hasChanges = true; break; }
          }
        }
        nodes.push({ name, type: 'dir', path: relPath, gitStatus: null, hasChanges, children });
      } else {
        const gitStatus = gitRoot ? (statusMap.get(relPath) ?? null) : null;
        nodes.push({ name, type: 'file', path: relPath, gitStatus, hasChanges: false });
      }
    }

    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  const tree = walk(dir, 0);
  return { tree, gitRoot, truncated };
}

/* ------------------------------------------------------------------ */
/*  Content search (grep)                                              */
/* ------------------------------------------------------------------ */

interface SearchMatch {
  line: number;
  text: string;
}

interface SearchResult {
  file: string;
  matches: SearchMatch[];
}

const SEARCHABLE_EXTS = [
  '*.ts', '*.tsx', '*.js', '*.jsx', '*.json', '*.css', '*.md',
  '*.html', '*.yml', '*.yaml', '*.toml', '*.txt', '*.env.example',
];

export function searchFiles(
  dir: string,
  query: string,
): { results: SearchResult[] } {
  if (!query || query.length < 2) return { results: [] };

  let matchedFiles: string[];
  try {
    const args = [
      '-rnI', '-l',
      ...SEARCHABLE_EXTS.map((g) => `--include=${g}`),
      '--exclude-dir=node_modules', '--exclude-dir=.git', '--exclude-dir=.next',
      '--', query, '.',
    ];
    const out = execFileSync('grep', args, {
      cwd: dir, encoding: 'utf-8', timeout: 10000, maxBuffer: 1024 * 1024,
    }).trim();
    matchedFiles = out ? out.split('\n').slice(0, 50) : [];
  } catch {
    // grep returns exit code 1 when no matches
    return { results: [] };
  }

  const results: SearchResult[] = [];

  for (const relFile of matchedFiles) {
    const absPath = path.resolve(dir, relFile);
    try {
      const content = readFileSync(absPath, 'utf-8');
      const lines = content.split('\n');
      const matches: SearchMatch[] = [];
      const lowerQuery = query.toLowerCase();

      for (let i = 0; i < lines.length && matches.length < 3; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          matches.push({
            line: i + 1,
            text: lines[i].trim().slice(0, 200),
          });
        }
      }

      if (matches.length > 0) {
        // Normalise path: strip leading ./
        const clean = relFile.replace(/^\.\//, '');
        results.push({ file: clean, matches });
      }
    } catch {
      // skip unreadable files
    }
  }

  return { results };
}
