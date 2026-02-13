import { NextResponse } from 'next/server';
import { listContainers } from '@/lib/docker';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async () => {
  const containers = await listContainers();
  return NextResponse.json({ containers });
}, 'Failed to list containers');
