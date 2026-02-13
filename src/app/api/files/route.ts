import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { listDirectory } from '@/lib/files';
import { getProjectDir } from '@/lib/project-dir';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const dirParam = req.nextUrl.searchParams.get('dir');
  const dir = dirParam || await getProjectDir();

  if (!existsSync(dir)) {
    return NextResponse.json({ error: 'Directory does not exist' }, { status: 400 });
  }

  const result = listDirectory(dir);
  return NextResponse.json({ ...result, currentDir: dir });
}, 'Failed to list directory');
