import { NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { getBranch } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async () => {
  const cwd = await getProjectDir();
  const branch = getBranch(cwd);
  return NextResponse.json({ branch });
}, 'Failed to get branch');
