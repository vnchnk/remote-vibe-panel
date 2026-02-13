import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { listDirectoryRecursive } from '@/lib/files';
import { getProjectDir } from '@/lib/project-dir';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async () => {
  const dir = await getProjectDir();

  if (!existsSync(dir)) {
    return NextResponse.json({ error: 'Directory does not exist' }, { status: 400 });
  }

  const result = listDirectoryRecursive(dir);
  return NextResponse.json({ ...result, currentDir: dir });
}, 'Failed to list directory');
