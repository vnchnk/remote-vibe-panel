import { NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { push } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const POST = withErrorHandler(async () => {
  const cwd = await getProjectDir();
  const output = push(cwd);
  return NextResponse.json({ ok: true, output });
}, 'Failed to push');
