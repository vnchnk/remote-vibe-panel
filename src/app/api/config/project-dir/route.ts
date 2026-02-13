import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { getProjectDir } from '@/lib/project-dir';
import { withErrorHandler } from '@/lib/api-handler';

export async function GET() {
  const dir = await getProjectDir();
  return NextResponse.json({ dir });
}

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const { dir } = await req.json();
  if (!dir || typeof dir !== 'string') {
    return NextResponse.json({ error: 'Missing "dir" field' }, { status: 400 });
  }
  if (!existsSync(dir)) {
    return NextResponse.json({ error: 'Path does not exist' }, { status: 400 });
  }

  const res = NextResponse.json({ dir });
  res.cookies.set('project_dir', dir, {
    path: '/',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}, 'Failed to update');
