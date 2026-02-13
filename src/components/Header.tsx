'use client';

import { useState, useEffect } from 'react';
import { useProjectDir } from '@/hooks/use-project-dir';
import { useGitBranch } from '@/hooks/use-git-branch';

export default function Header() {
  const { dir, updateDir } = useProjectDir();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const { branch, refresh: refreshBranch } = useGitBranch();

  useEffect(() => {
    refreshBranch();
  }, [dir, refreshBranch]);

  const basename = dir ? dir.split('/').filter(Boolean).pop() || dir : '...';

  const handleSubmit = async () => {
    if (input.trim()) {
      const ok = await updateDir(input.trim());
      if (ok) {
        setEditing(false);
        refreshBranch();
      }
    }
  };

  return (
    <header className="flex-none px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-3">
      <h1 className="text-lg font-semibold text-slate-100 flex-none">devpanel</h1>

      <div className="flex items-center gap-2 min-w-0">
        {branch && (
          <span className="text-[10px] font-mono bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded flex-none">
            {branch}
          </span>
        )}

        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="flex items-center gap-1 min-w-0"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={() => setEditing(false)}
              placeholder="/path/to/repo"
              className="bg-slate-800 text-sm text-slate-200 px-2 py-1 rounded border border-slate-600 focus:border-blue-500 focus:outline-none min-w-0 w-40"
            />
          </form>
        ) : (
          <button
            onClick={() => { setInput(dir); setEditing(true); }}
            className="text-sm text-slate-400 truncate active:text-slate-300"
          >
            {basename}
          </button>
        )}
      </div>
    </header>
  );
}
