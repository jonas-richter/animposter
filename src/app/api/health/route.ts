import { NextResponse } from 'next/server';
import { storageInfo } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/health
// Used by the start screen to warn when rooms cannot survive - see store.ts.
export async function GET() {
  const info = storageInfo();
  return NextResponse.json(info, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
