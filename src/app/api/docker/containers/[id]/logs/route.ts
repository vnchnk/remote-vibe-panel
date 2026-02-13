import { NextRequest, NextResponse } from 'next/server';
import { getContainerLogs } from '@/lib/docker';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const tail = parseInt(req.nextUrl.searchParams.get('tail') || '100') || 100;
  const logs = await getContainerLogs(id, tail);
  return NextResponse.json({ logs });
}, 'Failed to get logs');
