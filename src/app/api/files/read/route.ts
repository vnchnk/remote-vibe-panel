import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { getProjectDir } from '@/lib/project-dir';
import { withErrorHandler } from '@/lib/api-handler';

const MAX_SIZE = 512 * 1024; // 512 KB

export const GET = withErrorHandler(async (req: NextRequest) => {
  const file = req.nextUrl.searchParams.get('file');
  if (!file) {
    return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
  }

  const cwd = await getProjectDir();
  const absPath = path.resolve(cwd, file);

  // Prevent path traversal outside project dir
  if (!absPath.startsWith(cwd + path.sep) && absPath !== cwd) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (!existsSync(absPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const content = readFileSync(absPath, 'utf-8').slice(0, MAX_SIZE);
  return NextResponse.json({ content });
}, 'Failed to read file');
