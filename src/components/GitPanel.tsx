'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useGitStatus } from '@/hooks/use-git-status';
import { useToast } from './Toast';
import Spinner from './Spinner';
import PullIndicator from './PullIndicator';
import ChangesView from './git/ChangesView';
import CommitSheet from './git/CommitSheet';
import DiffBlock from './git/DiffBlock';
import TreeToolbar from './git/TreeToolbar';
import ContentSearch from './git/ContentSearch';
import { statusColor, statusBadgeBg } from './git/types';
import type { DirEntry, TreeNode, Commit, GitView } from './git/types';
import { filterTree } from '@/lib/filter-tree';
import { highlightText } from './highlight';
import { ChevronLeftIcon, ChevronRightIcon, FolderIcon } from './icons';
import FileIcon from './FileIcon';
import { useHighlighter } from '@/hooks/use-highlighter';
import { getLangFromFile, highlightCode } from '@/lib/highlighter';

/* ------------------------------------------------------------------ */
/*  CachedTreeNode — renders from in-memory tree, no fetch             */
/* ------------------------------------------------------------------ */

function CachedTreeNode({
  node,
  depth,
  onFileClick,
  filter,
  currentDir,
  revealPath,
  onRevealComplete,
  lastViewedFile,
}: {
  node: TreeNode;
  depth: number;
  onFileClick: (path: string) => void;
  filter: string;
  currentDir: string;
  revealPath?: string | null;
  onRevealComplete?: () => void;
  lastViewedFile?: string | null;
}) {
  const isRevealAncestor = !!(revealPath && node.type === 'dir' && revealPath.startsWith(node.path + '/'));
  const isRevealTarget = !!(revealPath && node.type === 'file' && node.path === revealPath);
  const isLastViewed = !!(lastViewedFile && node.type === 'file' && node.path === lastViewedFile);
  const [open, setOpen] = useState(filter ? true : isRevealAncestor);
  const revealRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isRevealTarget && revealRef.current) {
      revealRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const timer = setTimeout(() => onRevealComplete?.(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isRevealTarget, onRevealComplete]);

  // Re-expand when revealPath changes and this node is an ancestor
  useEffect(() => {
    if (isRevealAncestor) setOpen(true);
  }, [isRevealAncestor]);

  if (node.type === 'file') {
    const color = node.gitStatus ? (statusColor[node.gitStatus] ?? 'text-slate-400') : 'text-slate-400';
    const highlight = isRevealTarget || isLastViewed;
    return (
      <button
        ref={isRevealTarget ? revealRef : undefined}
        onClick={() => onFileClick(`${currentDir}/${node.path}`)}
        className={`w-full flex items-center gap-1.5 py-1.5 pr-3 transition-colors active:bg-slate-800/50 ${highlight ? 'reveal-highlight' : ''}`}
        style={{ paddingLeft: depth * 16 + 12 + 16 }}
      >
        {node.gitStatus ? (
          <span className={`flex-none w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${statusBadgeBg[node.gitStatus] ?? 'bg-slate-600'}`}>
            {node.gitStatus}
          </span>
        ) : (
          <FileIcon filename={node.name} />
        )}
        <span className={`text-sm font-mono truncate ${color}`}>
          {highlightText(node.name, filter)}
        </span>
      </button>
    );
  }

  // Directory
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1.5 pr-3 active:bg-slate-800/50 transition-colors"
        style={{ paddingLeft: depth * 16 + 12 }}
      >
        <ChevronRightIcon className={`w-3 h-3 text-slate-600 flex-none transition-transform ${open ? 'rotate-90' : ''}`} />
        <FolderIcon className={`w-4 h-4 flex-none ${node.hasChanges ? 'text-blue-400' : 'text-slate-600'}`} />
        <span className={`text-sm font-mono truncate ${node.hasChanges ? 'text-blue-300' : 'text-slate-300'}`}>
          {highlightText(node.name, filter)}
        </span>
      </button>
      {open && node.children?.map((child) => (
        <CachedTreeNode
          key={child.name}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
          filter={filter}
          currentDir={currentDir}
          revealPath={revealPath}
          onRevealComplete={onRevealComplete}
          lastViewedFile={lastViewedFile}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Folder row (lazy-loads children on expand)                         */
/* ------------------------------------------------------------------ */

function FolderRow({
  name,
  fullPath,
  depth,
  hasChanges,
  onFileClick,
  filter,
  expandAll,
  collapseAll,
  lastViewedFile,
}: {
  name: string;
  fullPath: string;
  depth: number;
  hasChanges: boolean;
  onFileClick: (path: string) => void;
  filter: string;
  expandAll: number;
  collapseAll: number;
  lastViewedFile?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchChildren = useCallback(async () => {
    if (children) return children;
    setLoading(true);
    try {
      const res = await fetch(`/api/files?dir=${encodeURIComponent(fullPath)}`);
      if (res.ok) {
        const data = await res.json();
        const entries = data.entries ?? [];
        setChildren(entries);
        return entries;
      }
    } catch { /* ignore */ }
    setLoading(false);
    return null;
  }, [fullPath, children]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    await fetchChildren();
    setLoading(false);
    setOpen(true);
  };

  // Expand all
  useEffect(() => {
    if (expandAll > 0) {
      fetchChildren().then(() => {
        setLoading(false);
        setOpen(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAll]);

  // Collapse all
  useEffect(() => {
    if (collapseAll > 0) {
      setOpen(false);
    }
  }, [collapseAll]);

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1.5 py-1.5 pr-3 active:bg-slate-800/50 transition-colors"
        style={{ paddingLeft: depth * 16 + 12 }}
      >
        <ChevronRightIcon className={`w-3 h-3 text-slate-600 flex-none transition-transform ${open ? 'rotate-90' : ''}`} />
        <FolderIcon className={`w-4 h-4 flex-none ${hasChanges ? 'text-blue-400' : 'text-slate-600'}`} />
        <span className={`text-sm font-mono truncate ${hasChanges ? 'text-blue-300' : 'text-slate-300'}`}>
          {highlightText(name, filter)}
        </span>
        {loading && (
          <Spinner size="sm" inline className="text-slate-600 ml-auto flex-none" />
        )}
      </button>
      {open && children && children.map((entry) => (
        entry.type === 'dir' ? (
          <FolderRow
            key={entry.name}
            name={entry.name}
            fullPath={`${fullPath}/${entry.name}`}
            depth={depth + 1}
            hasChanges={entry.hasChanges}
            onFileClick={onFileClick}
            filter={filter}
            expandAll={expandAll}
            collapseAll={collapseAll}
            lastViewedFile={lastViewedFile}
          />
        ) : (
          <FileRow
            key={entry.name}
            name={entry.name}
            fullPath={`${fullPath}/${entry.name}`}
            depth={depth + 1}
            gitStatus={entry.gitStatus}
            onFileClick={onFileClick}
            filter={filter}
            lastViewedFile={lastViewedFile}
          />
        )
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  File row                                                           */
/* ------------------------------------------------------------------ */

function FileRow({
  name,
  fullPath,
  depth,
  gitStatus,
  onFileClick,
  filter = '',
  lastViewedFile,
}: {
  name: string;
  fullPath: string;
  depth: number;
  gitStatus: string | null;
  onFileClick: (path: string) => void;
  filter?: string;
  lastViewedFile?: string | null;
}) {
  const color = gitStatus ? (statusColor[gitStatus] ?? 'text-slate-400') : 'text-slate-400';
  const isLastViewed = !!(lastViewedFile && fullPath.endsWith('/' + lastViewedFile));

  return (
    <button
      onClick={() => onFileClick(fullPath)}
      className={`w-full flex items-center gap-1.5 py-1.5 pr-3 transition-colors active:bg-slate-800/50 ${isLastViewed ? 'reveal-highlight' : ''}`}
      style={{ paddingLeft: depth * 16 + 12 + 16 }}
    >
      {gitStatus ? (
        <span className={`flex-none w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${statusBadgeBg[gitStatus] ?? 'bg-slate-600'}`}>
          {gitStatus}
        </span>
      ) : (
        <FileIcon filename={name} />
      )}
      <span className={`text-sm font-mono truncate ${color}`}>
        {highlightText(name, filter)}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function GitPanel() {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [currentDir, setCurrentDir] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [diffStaged, setDiffStaged] = useState(false);
  const [fromChangesView, setFromChangesView] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<GitView>('changes');
  const [prevListView, setPrevListView] = useState<'changes' | 'tree'>('changes');
  const [error, setError] = useState<string | null>(null);
  const [showCommitSheet, setShowCommitSheet] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [treeFilter, setTreeFilter] = useState('');
  const [expandAllCounter, setExpandAllCounter] = useState(0);
  const [collapseAllCounter, setCollapseAllCounter] = useState(0);
  const [contentSearchOpen, setContentSearchOpen] = useState(false);
  const [revealPath, setRevealPath] = useState<string | null>(null);

  // Cached full tree for filtered/expand-all mode
  const [fullTree, setFullTree] = useState<TreeNode[] | null>(null);
  const [fullTreeLoading, setFullTreeLoading] = useState(false);
  const fullTreePromiseRef = useRef<Promise<TreeNode[] | null> | null>(null);

  const { staged, refresh: refreshStatus } = useGitStatus();
  const { toast } = useToast();
  const hl = useHighlighter();

  /* ---- fetch full tree (one request, cached) ---- */

  const fetchFullTree = useCallback(async (): Promise<TreeNode[] | null> => {
    if (fullTree) return fullTree;
    // Deduplicate concurrent calls
    if (fullTreePromiseRef.current) return fullTreePromiseRef.current;

    const promise = (async () => {
      setFullTreeLoading(true);
      try {
        const res = await fetch('/api/files/tree');
        if (!res.ok) return null;
        const data = await res.json();
        const tree = data.tree ?? [];
        setFullTree(tree);
        if (!currentDir && data.currentDir) setCurrentDir(data.currentDir);
        return tree;
      } catch {
        return null;
      } finally {
        setFullTreeLoading(false);
        fullTreePromiseRef.current = null;
      }
    })();

    fullTreePromiseRef.current = promise;
    return promise;
  }, [fullTree, currentDir]);

  const invalidateFullTree = useCallback(() => {
    setFullTree(null);
    fullTreePromiseRef.current = null;
  }, []);

  /* ---- fetch directory listing (lazy-load root) ---- */

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    invalidateFullTree();
    try {
      const res = await fetch('/api/files');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to list files');
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setCurrentDir(data.currentDir ?? '');
    } catch (err: any) {
      setError(err.message || 'Failed to list files');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [invalidateFullTree]);

  useEffect(() => {
    fetchTree();
    refreshStatus();
  }, [fetchTree, refreshStatus]);

  /* ---- fetch full tree when filter becomes non-empty ---- */

  useEffect(() => {
    if (treeFilter && !fullTree && !fullTreeLoading) {
      fetchFullTree();
    }
  }, [treeFilter, fullTree, fullTreeLoading, fetchFullTree]);

  /* ---- fetch diff for a file ---- */

  const handleTreeFileClick = async (fullPath: string) => {
    setLoading(true);
    try {
      const rel = currentDir ? fullPath.replace(currentDir + '/', '') : fullPath;
      // Try diff first
      const diffRes = await fetch(`/api/git/diff?file=${encodeURIComponent(rel)}`);
      if (!diffRes.ok) throw new Error('Failed to fetch diff');
      const diffData = await diffRes.json();
      const diffText = diffData.diff ?? '';

      if (diffText) {
        setDiff(diffText);
        setFileContent(null);
      } else {
        // No diff — fetch file content
        setDiff(null);
        const contentRes = await fetch(`/api/files/read?file=${encodeURIComponent(rel)}`);
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setFileContent(contentData.content ?? '');
        } else {
          setFileContent(null);
        }
      }
      setSelectedFile(rel);
      setDiffStaged(false);
      setFromChangesView(false);
      setPrevListView('tree');
      setView('diff');
    } catch {
      setDiff('Error loading diff');
      setFileContent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChangesFileClick = async (file: string, isStaged: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/git/diff?file=${encodeURIComponent(file)}&staged=${isStaged}`);
      if (!res.ok) throw new Error('Failed to fetch diff');
      const data = await res.json();
      setDiff(data.diff ?? '');
      setSelectedFile(file);
      setDiffStaged(isStaged);
      setFromChangesView(true);
      setPrevListView('changes');
      setView('diff');
    } catch {
      setDiff('Error loading diff');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaged = async (newStaged: boolean) => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/git/diff?file=${encodeURIComponent(selectedFile)}&staged=${newStaged}`);
      if (!res.ok) throw new Error('Failed to fetch diff');
      const data = await res.json();
      setDiff(data.diff ?? '');
      setDiffStaged(newStaged);
    } catch {
      setDiff('Error loading diff');
    } finally {
      setLoading(false);
    }
  };

  /* ---- fetch log ---- */

  const fetchLog = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/git/log');
      if (!res.ok) throw new Error('Failed to fetch log');
      const data = await res.json();
      setCommits(Array.isArray(data) ? data : data.commits ?? []);
      setView('log');
    } catch {
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---- git actions ---- */

  const handlePush = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/git/push', { method: 'POST' });
      if (!res.ok) throw new Error('Push failed');
      toast('Pushed successfully', 'success');
    } catch {
      toast('Push failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommitSuccess = () => {
    invalidateFullTree();
    fetchTree();
    refreshStatus();
  };

  /* ---- expand all (uses cached tree if available) ---- */

  const handleExpandAll = async () => {
    if (fullTree) {
      // Already cached — just bump counter for lazy-load folders too
      setExpandAllCounter((c) => c + 1);
    } else {
      // Fetch full tree, then expand
      const tree = await fetchFullTree();
      if (tree) {
        setExpandAllCounter((c) => c + 1);
      }
    }
  };

  /* ---- reveal in tree ---- */

  const handleRevealInTree = async () => {
    if (!selectedFile) return;
    setTreeFilter('');
    setRevealPath(selectedFile);
    if (!fullTree) await fetchFullTree();
    setView('tree');
  };

  /* ---- pull to refresh ---- */

  const { containerRef, pullDistance } = usePullToRefresh(() => {
    setRevealPath(null);
    return fetchTree();
  }, view === 'tree');

  /* ---- back navigation ---- */

  const [lastViewedFile, setLastViewedFile] = useState<string | null>(null);

  const goBack = () => {
    setLastViewedFile(selectedFile);
    setView(prevListView);
    setDiff(null);
    setFileContent(null);
    setSelectedFile(null);
    // Clear highlight after animation
    setTimeout(() => setLastViewedFile(null), 1500);
  };

  /* ---- sub-header ---- */

  const renderSubHeader = () => {
    if (view === 'changes' || view === 'tree') {
      return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
          {/* Segmented toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setView('changes')}
              className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                view === 'changes' ? 'bg-slate-700 text-slate-200' : 'text-slate-500'
              }`}
            >
              Changes
            </button>
            <button
              onClick={() => { setView('tree'); if (entries.length === 0) fetchTree(); }}
              className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                view === 'tree' ? 'bg-slate-700 text-slate-200' : 'text-slate-500'
              }`}
            >
              Tree
            </button>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <button
              onClick={() => { refreshStatus(); setShowCommitSheet(true); }}
              disabled={actionLoading}
              className="text-xs font-medium text-emerald-400 active:text-emerald-300 px-2 py-1 rounded disabled:opacity-50"
            >
              Commit
            </button>
            <button
              onClick={handlePush}
              disabled={actionLoading}
              className="text-xs font-medium text-amber-400 active:text-amber-300 px-2 py-1 rounded disabled:opacity-50"
            >
              Push
            </button>
            <button
              onClick={fetchLog}
              className="text-xs font-medium text-blue-400 active:text-blue-300 px-2 py-1 rounded"
            >
              Log
            </button>
          </div>
        </div>
      );
    }

    if (view === 'diff') {
      return (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50">
          <button onClick={goBack} className="text-blue-400 active:text-blue-300 flex-none">
            <ChevronLeftIcon />
          </button>
          <span className="text-sm text-slate-200 truncate font-mono">{selectedFile}</span>
          <button
            onClick={handleRevealInTree}
            className="ml-auto flex-none text-slate-400 active:text-blue-400 p-1 rounded transition-colors"
            title="Reveal in Tree"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50">
        <button onClick={() => setView(prevListView)} className="text-blue-400 active:text-blue-300">
          <ChevronLeftIcon />
        </button>
        <span className="text-sm text-slate-200 font-medium">Commit Log</span>
      </div>
    );
  };

  /* ---- tree view ---- */

  const renderTree = () => {
    if (loading && entries.length === 0) return <Spinner />;
    if (error) {
      return (
        <div className="text-center py-16 px-4">
          <p className="text-sm text-red-400">{error}</p>
          <p className="text-xs text-slate-600 mt-2">Check PROJECT_DIR or set it via the header</p>
        </div>
      );
    }
    if (entries.length === 0) {
      return (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">Empty directory</p>
        </div>
      );
    }

    // Filtered mode: render from cached full tree
    if (treeFilter && fullTree) {
      const filtered = filterTree(fullTree, treeFilter);
      if (filtered.length === 0) {
        return (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No matching files</p>
          </div>
        );
      }
      return (
        <div className="py-1">
          {filtered.map((node) => (
            <CachedTreeNode
              key={node.name}
              node={node}
              depth={0}
              onFileClick={handleTreeFileClick}
              filter={treeFilter}
              currentDir={currentDir}
              lastViewedFile={lastViewedFile}
            />
          ))}
        </div>
      );
    }

    // Loading full tree for filter
    if (treeFilter && fullTreeLoading) {
      return <Spinner />;
    }

    // Reveal mode: render full tree with only ancestor folders expanded
    if (revealPath && fullTree) {
      return (
        <div className="py-1">
          {fullTree.map((node) => (
            <CachedTreeNode
              key={node.name}
              node={node}
              depth={0}
              onFileClick={handleTreeFileClick}
              filter=""
              currentDir={currentDir}
              revealPath={revealPath}
              onRevealComplete={() => setRevealPath(null)}
              lastViewedFile={lastViewedFile}
            />
          ))}
        </div>
      );
    }
    if (revealPath && fullTreeLoading) {
      return <Spinner />;
    }

    // No filter: lazy-load mode (unchanged behaviour)
    return (
      <div className="py-1">
        {entries.map((entry) => (
          entry.type === 'dir' ? (
            <FolderRow
              key={entry.name}
              name={entry.name}
              fullPath={`${currentDir}/${entry.name}`}
              depth={0}
              hasChanges={entry.hasChanges}
              onFileClick={handleTreeFileClick}
              filter={treeFilter}
              expandAll={expandAllCounter}
              collapseAll={collapseAllCounter}
              lastViewedFile={lastViewedFile}
            />
          ) : (
            <FileRow
              key={entry.name}
              name={entry.name}
              fullPath={`${currentDir}/${entry.name}`}
              depth={0}
              gitStatus={entry.gitStatus}
              onFileClick={handleTreeFileClick}
              filter={treeFilter}
              lastViewedFile={lastViewedFile}
            />
          )
        ))}
      </div>
    );
  };

  /* ---- diff view ---- */

  const renderDiff = () => {
    if (loading) return <Spinner />;
    if (diff) {
      return (
        <DiffBlock
          diff={diff}
          filename={selectedFile ?? undefined}
          staged={diffStaged}
          onToggleStaged={fromChangesView ? handleToggleStaged : undefined}
        />
      );
    }
    if (fileContent != null) {
      const lang = selectedFile ? getLangFromFile(selectedFile) : null;
      const tokens = lang && hl ? highlightCode(fileContent, lang, hl) : null;
      const lines = tokens ?? fileContent.split('\n').map((l) => [{ content: l }]);
      return (
        <pre className="text-xs leading-relaxed font-mono overflow-x-auto">
          {lines.map((line, i) => (
            <div key={i} className="flex text-slate-400">
              <span className="flex-none w-12 text-right text-[10px] text-slate-600 select-none pr-2 opacity-60">
                {i + 1}
              </span>
              <span className="flex-1 px-2">
                {(line as { content: string; color?: string }[]).map((token, j) => (
                  token.color
                    ? <span key={j} style={{ color: token.color }}>{token.content}</span>
                    : <span key={j}>{token.content}</span>
                ))}
                {line.length === 0 && '\u00A0'}
              </span>
            </div>
          ))}
        </pre>
      );
    }
    return <p className="text-center text-slate-500 py-8 text-sm">No content available</p>;
  };

  /* ---- log view ---- */

  const renderLog = () => {
    if (loading) return <Spinner />;
    if (commits.length === 0) {
      return <p className="text-center text-slate-500 py-8 text-sm">No commits found</p>;
    }
    return (
      <div className="divide-y divide-slate-800">
        {commits.map((c) => (
          <div key={c.hash} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                {c.short}
              </span>
              <span className="text-xs text-slate-500 truncate">{c.author}</span>
            </div>
            <p className="text-sm text-slate-200 leading-snug">{c.message}</p>
            <p className="text-[10px] text-slate-600 mt-1">{c.date}</p>
          </div>
        ))}
      </div>
    );
  };

  /* ---- render ---- */

  const isTree = view === 'tree';
  const isChanges = view === 'changes';

  return (
    <div className="h-full flex flex-col">
      {renderSubHeader()}

      {/* Changes — hidden instead of unmounted so scroll/section state persists */}
      <div className={isChanges ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
        <ChangesView onFileClick={handleChangesFileClick} lastViewedFile={lastViewedFile} />
      </div>

      {/* Tree — hidden instead of unmounted so open folders & search persist */}
      <div className={isTree ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
        <PullIndicator pullDistance={pullDistance} />
        <TreeToolbar
          filter={treeFilter}
          onFilterChange={(v) => { setTreeFilter(v); setRevealPath(null); }}
          contentSearchOpen={contentSearchOpen}
          onToggleContentSearch={() => setContentSearchOpen((v) => !v)}
          onExpandAll={handleExpandAll}
          onCollapseAll={() => { setCollapseAllCounter((c) => c + 1); setRevealPath(null); }}
        />
        {contentSearchOpen && (
          <ContentSearch
            onFileClick={(file) => {
              const fullPath = currentDir ? `${currentDir}/${file}` : file;
              handleTreeFileClick(fullPath);
            }}
            onClose={() => setContentSearchOpen(false)}
          />
        )}
        <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain">
          {renderTree()}
        </div>
      </div>

      {view === 'diff' && (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {renderDiff()}
        </div>
      )}

      {view === 'log' && (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {renderLog()}
        </div>
      )}

      <CommitSheet
        isOpen={showCommitSheet}
        onClose={() => setShowCommitSheet(false)}
        staged={staged}
        onSuccess={handleCommitSuccess}
      />
    </div>
  );
}
