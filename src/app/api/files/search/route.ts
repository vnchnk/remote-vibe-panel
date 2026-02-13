import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { searchFiles } from '@/lib/files';
import { getProjectDir } from '@/lib/project-dir';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const dir = await getProjectDir();
  if (!existsSync(dir)) {
    return NextResponse.json({ error: 'Directory does not exist' }, { status: 400 });
  }

  const data = searchFiles(dir, q);
  return NextResponse.json(data);
}, 'Search failed');
