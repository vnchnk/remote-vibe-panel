import { NextResponse } from 'next/server';

export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  fallbackMessage = 'Internal server error',
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || fallbackMessage },
        { status: 500 },
      );
    }
  }) as T;
}
