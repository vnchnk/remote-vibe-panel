import { NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { getStatus } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async () => {
  const cwd = await getProjectDir();
  const status = getStatus(cwd);
  return NextResponse.json(status);
}, 'Failed to get git status');
