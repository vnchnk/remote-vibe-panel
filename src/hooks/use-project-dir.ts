import { useState, useEffect, useCallback } from 'react';

export function useProjectDir() {
  const [dir, setDir] = useState<string>('');

  const fetchDir = useCallback(async () => {
    try {
      const res = await fetch('/api/config/project-dir');
      if (res.ok) {
        const data = await res.json();
        setDir(data.dir || '');
      }
    } catch {
      // ignore
    }
  }, []);

  const updateDir = useCallback(async (newDir: string) => {
    try {
      const res = await fetch('/api/config/project-dir', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: newDir }),
      });
      if (res.ok) {
        const data = await res.json();
        setDir(data.dir);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => { fetchDir(); }, [fetchDir]);

  return { dir, updateDir };
}
