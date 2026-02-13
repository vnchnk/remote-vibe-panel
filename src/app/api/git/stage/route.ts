import { NextRequest, NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { stageFile } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { file } = await req.json();
  if (!file || typeof file !== 'string') {
    return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 });
  }
  const cwd = await getProjectDir();
  stageFile(cwd, file);
  return NextResponse.json({ ok: true });
}, 'Failed to stage file');
