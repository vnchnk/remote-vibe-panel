import { NextRequest, NextResponse } from 'next/server';
import { runQuery, getPool } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const POST = withErrorHandler(async (req: NextRequest) => {
  if (!getPool()) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 501 });
  }

  const { sql } = await req.json();
  if (!sql || typeof sql !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "sql" field' }, { status: 400 });
  }

  const result = await runQuery(sql);
  return NextResponse.json(result);
}, 'Query failed');
