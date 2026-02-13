import { NextRequest, NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { commit } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Missing "message" field' }, { status: 400 });
  }
  const cwd = await getProjectDir();
  const output = commit(cwd, message);
  return NextResponse.json({ ok: true, output });
}, 'Failed to commit');
