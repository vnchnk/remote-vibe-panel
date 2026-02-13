import { NextRequest, NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { getDiff } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const cwd = await getProjectDir();
  const file = req.nextUrl.searchParams.get('file') || undefined;
  const staged = req.nextUrl.searchParams.get('staged') === 'true';
  const diff = getDiff(cwd, file, staged);
  return NextResponse.json({ diff });
}, 'Failed to get diff');
