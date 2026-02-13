'use client';

import { useState } from 'react';
import { useGitStatus } from '@/hooks/use-git-status';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useToast } from '@/components/Toast';
import { apiPost } from '@/lib/api';
import SwipeableFileRow from './SwipeableFileRow';
import ConfirmDialog from './ConfirmDialog';
import Spinner from '@/components/Spinner';
import PullIndicator from '@/components/PullIndicator';
import { ChevronRightIcon } from '@/components/icons';

interface Props {
  onFileClick: (file: string, staged: boolean) => void;
  lastViewedFile?: string | null;
}

export default function ChangesView({ onFileClick, lastViewedFile }: Props) {
  const { staged, unstaged, untracked, loading, refresh } = useGitStatus();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [untrackedOpen, setUntrackedOpen] = useState(true);
  const [discardTarget, setDiscardTarget] = useState<{ file: string; isUntracked: boolean } | null>(null);

  const { containerRef, pullDistance } = usePullToRefresh(refresh, true);

  const gitAction = async (url: string, body: Record<string, unknown>, successMsg: string, errorMsg: string) => {
    try {
      await apiPost(url, body);
      toast(successMsg, 'success');
      await refresh();
    } catch {
      toast(errorMsg, 'error');
    }
  };

  const stageFile = (file: string) =>
    gitAction('/api/git/stage', { file }, `Staged ${file.split('/').pop()}`, 'Failed to stage file');

  const unstageFile = (file: string) =>
    gitAction('/api/git/unstage', { file }, `Unstaged ${file.split('/').pop()}`, 'Failed to unstage file');

  const discardFile = (file: string, isUntracked: boolean) =>
    gitAction('/api/git/discard', { file, untracked: isUntracked }, `Discarded ${file.split('/').pop()}`, 'Failed to discard changes');

  const stageAll = async () => {
    try {
      const files = [...unstaged.map((f) => f.file), ...untracked];
      for (const file of files) {
        await apiPost('/api/git/stage', { file });
      }
      toast('All files staged', 'success');
      await refresh();
    } catch {
      toast('Failed to stage all', 'error');
    }
  };

  const unstageAll = async () => {
    try {
      for (const f of staged) {
        await apiPost('/api/git/unstage', { file: f.file });
      }
      toast('All files unstaged', 'success');
      await refresh();
    } catch {
      toast('Failed to unstage all', 'error');
    }
  };

  const handleConfirmDiscard = () => {
    if (discardTarget) {
      discardFile(discardTarget.file, discardTarget.isUntracked);
      setDiscardTarget(null);
    }
  };

  const lc = filter.toLowerCase();
  const filteredStaged = staged.filter((f) => f.file.toLowerCase().includes(lc));
  const filteredUnstaged = unstaged.filter((f) => f.file.toLowerCase().includes(lc));
  const filteredUntracked = untracked.filter((f) => f.toLowerCase().includes(lc));

  if (loading && staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
    return <div className="flex-1"><Spinner /></div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <PullIndicator pullDistance={pullDistance} />

      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain">
        {/* Search filter */}
        <div className="px-3 pt-3 pb-1">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:border-blue-500 focus:outline-none placeholder-slate-600"
          />
        </div>

        {/* Staged section */}
        {filteredStaged.length > 0 && (
          <div className="mt-2">
            <div
              onClick={() => setStagedOpen(!stagedOpen)}
              className="w-full flex items-center justify-between px-3 py-2 active:bg-slate-800/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ChevronRightIcon className={`w-3 h-3 text-slate-500 transition-transform ${stagedOpen ? 'rotate-90' : ''}`} />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Staged</span>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 rounded-full">{filteredStaged.length}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); unstageAll(); }}
                className="text-[10px] font-medium text-amber-400 active:text-amber-300 px-2 py-0.5"
              >
                Unstage All
              </button>
            </div>
            {stagedOpen && (
              <div className="divide-y divide-slate-800/50">
                {filteredStaged.map((f) => (
                  <SwipeableFileRow
                    key={f.file}
                    file={f.file}
                    status={f.status}
                    section="staged"
                    filter={filter}
                    lastViewedFile={lastViewedFile}
                    onStage={() => {}}
                    onUnstage={() => unstageFile(f.file)}
                    onDiscard={() => setDiscardTarget({ file: f.file, isUntracked: false })}
                    onTap={() => onFileClick(f.file, true)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unstaged (Changes) section */}
        {filteredUnstaged.length > 0 && (
          <div className="mt-2">
            <div
              onClick={() => setUnstagedOpen(!unstagedOpen)}
              className="w-full flex items-center justify-between px-3 py-2 active:bg-slate-800/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ChevronRightIcon className={`w-3 h-3 text-slate-500 transition-transform ${unstagedOpen ? 'rotate-90' : ''}`} />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Changes</span>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 rounded-full">{filteredUnstaged.length}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); stageAll(); }}
                className="text-[10px] font-medium text-emerald-400 active:text-emerald-300 px-2 py-0.5"
              >
                Stage All
              </button>
            </div>
            {unstagedOpen && (
              <div className="divide-y divide-slate-800/50">
                {filteredUnstaged.map((f) => (
                  <SwipeableFileRow
                    key={f.file}
                    file={f.file}
                    status={f.status}
                    section="unstaged"
                    filter={filter}
                    lastViewedFile={lastViewedFile}
                    onStage={() => stageFile(f.file)}
                    onUnstage={() => {}}
                    onDiscard={() => setDiscardTarget({ file: f.file, isUntracked: false })}
                    onTap={() => onFileClick(f.file, false)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Untracked section */}
        {filteredUntracked.length > 0 && (
          <div className="mt-2">
            <div
              onClick={() => setUntrackedOpen(!untrackedOpen)}
              className="w-full flex items-center justify-between px-3 py-2 active:bg-slate-800/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ChevronRightIcon className={`w-3 h-3 text-slate-500 transition-transform ${untrackedOpen ? 'rotate-90' : ''}`} />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Untracked</span>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 rounded-full">{filteredUntracked.length}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); stageAll(); }}
                className="text-[10px] font-medium text-emerald-400 active:text-emerald-300 px-2 py-0.5"
              >
                Stage All
              </button>
            </div>
            {untrackedOpen && (
              <div className="divide-y divide-slate-800/50">
                {filteredUntracked.map((f) => (
                  <SwipeableFileRow
                    key={f}
                    file={f}
                    status="?"
                    section="untracked"
                    filter={filter}
                    lastViewedFile={lastViewedFile}
                    onStage={() => stageFile(f)}
                    onUnstage={() => {}}
                    onDiscard={() => setDiscardTarget({ file: f, isUntracked: true })}
                    onTap={() => onFileClick(f, false)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {filteredStaged.length === 0 && filteredUnstaged.length === 0 && filteredUntracked.length === 0 && !loading && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-sm">{filter ? 'No matching files' : 'Working tree clean'}</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!discardTarget}
        title="Discard changes"
        message={`Discard changes to ${discardTarget?.file.split('/').pop() ?? ''}? This cannot be undone.`}
        confirmLabel="Discard"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setDiscardTarget(null)}
      />
    </div>
  );
}
