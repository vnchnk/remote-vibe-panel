import { NextResponse } from 'next/server';
import { listTables } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const GET = withErrorHandler(async () => {
  const tables = await listTables();
  if (tables === null) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 501 });
  }
  return NextResponse.json({ tables });
}, 'Failed to list tables');
