import { NextResponse } from 'next/server';
import { restartContainer } from '@/lib/docker';
import { withErrorHandler } from '@/lib/api-handler';

export const POST = withErrorHandler(async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  await restartContainer(id);
  return NextResponse.json({ ok: true });
}, 'Failed to restart');
