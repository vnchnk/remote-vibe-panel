import { useState, useCallback, useEffect, useRef } from 'react';
import type { FileStatus } from '@/components/git/types';

interface GitStatusResult {
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: string[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useGitStatus(): GitStatusResult {
  const [staged, setStaged] = useState<FileStatus[]>([]);
  const [unstaged, setUnstaged] = useState<FileStatus[]>([]);
  const [untracked, setUntracked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/git/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStaged(data.staged ?? []);
      setUnstaged(data.unstaged ?? []);
      setUntracked(data.untracked ?? []);
    } catch {
      setStaged([]);
      setUnstaged([]);
      setUntracked([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetched.current) {
      fetched.current = true;
      refresh();
    }
  }, [refresh]);

  return { staged, unstaged, untracked, loading, refresh };
}
