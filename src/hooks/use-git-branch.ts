'use client';

import { useState, useCallback } from 'react';

export function useGitBranch() {
  const [branch, setBranch] = useState('');

  const refresh = useCallback(() => {
    fetch('/api/git/branch')
      .then((r) => r.json())
      .then((d) => setBranch(d.branch || ''))
      .catch(() => {});
  }, []);

  return { branch, refresh };
}
