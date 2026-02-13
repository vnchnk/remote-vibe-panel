'use client';

import { useState, useEffect } from 'react';
import { useBottomSheet } from '@/hooks/use-bottom-sheet';
import { useToast } from '@/components/Toast';
import { useGitBranch } from '@/hooks/use-git-branch';
import type { FileStatus } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staged: FileStatus[];
  onSuccess: () => void;
}

export default function CommitSheet({ isOpen, onClose, staged, onSuccess }: Props) {
  const [commitMsg, setCommitMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { dragHandlers, dragOffset } = useBottomSheet();
  const { branch, refresh: refreshBranch } = useGitBranch();

  useEffect(() => {
    if (isOpen) refreshBranch();
  }, [isOpen, refreshBranch]);

  const handleDragEnd = () => {
    dragHandlers.onTouchEnd();
    if (dragOffset > 100) {
      onClose();
    }
  };

  const handleCommit = async (andPush: boolean) => {
    if (!commitMsg.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMsg }),
      });
      if (!res.ok) throw new Error('Commit failed');
      toast('Committed successfully', 'success');

      if (andPush) {
        const pushRes = await fetch('/api/git/push', { method: 'POST' });
        if (!pushRes.ok) throw new Error('Push failed');
        toast('Pushed successfully', 'success');
      }

      setCommitMsg('');
      onClose();
      onSuccess();
    } catch (err: any) {
      toast(err.message || 'Commit failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl border-t border-slate-700 max-h-[80vh] flex flex-col"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragOffset > 0 ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={dragHandlers.onTouchStart}
        onTouchMove={dragHandlers.onTouchMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Branch header */}
        <div className="px-4 pb-3 border-b border-slate-800">
          <span className="text-sm text-slate-400">
            Commit to <code className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded text-xs">{branch || '...'}</code>
          </span>
        </div>

        {/* Staged files preview */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {staged.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-amber-400">No staged files</p>
              <p className="text-xs text-slate-500 mt-1">Stage files first to commit</p>
            </div>
          ) : (
            <div className="px-4 py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                {staged.length} file{staged.length !== 1 ? 's' : ''} to commit
              </p>
              <div className="space-y-1">
                {staged.map((f) => (
                  <div key={f.file} className="flex items-center gap-2 py-1">
                    <span className="text-[10px] font-bold text-emerald-400">{f.status}</span>
                    <span className="text-xs font-mono text-slate-300 truncate">{f.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Commit input */}
        <div className="p-4 border-t border-slate-800">
          <textarea
            autoFocus
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Commit message..."
            rows={2}
            className="w-full bg-slate-800 text-slate-200 text-sm font-mono rounded-lg p-3 border border-slate-700 focus:border-blue-500 focus:outline-none resize-none placeholder-slate-600"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-slate-400 active:text-slate-300"
            >
              Cancel
            </button>
            <div className="flex-1" />
            <button
              onClick={() => handleCommit(false)}
              disabled={loading || !commitMsg.trim() || staged.length === 0}
              className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg active:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Committing...' : 'Commit'}
            </button>
            <button
              onClick={() => handleCommit(true)}
              disabled={loading || !commitMsg.trim() || staged.length === 0}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg active:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Commit & Push'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
