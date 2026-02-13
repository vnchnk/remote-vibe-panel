import { NextRequest, NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { discardFile, removeUntracked } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { file, untracked } = await req.json();
  if (!file || typeof file !== 'string') {
    return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 });
  }
  const cwd = await getProjectDir();
  if (untracked) {
    removeUntracked(cwd, file);
  } else {
    discardFile(cwd, file);
  }
  return NextResponse.json({ ok: true });
}, 'Failed to discard');
