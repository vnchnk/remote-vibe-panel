import { NextRequest, NextResponse } from 'next/server';
import { getProjectDir } from '@/lib/project-dir';
import { getLog } from '@/lib/git';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const cwd = await getProjectDir();
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20') || 20;
  const commits = getLog(cwd, limit);
  return NextResponse.json(commits);
}, 'Failed to get log');
