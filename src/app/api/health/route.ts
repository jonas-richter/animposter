import { NextResponse } from 'next/server';
import { storageInfo } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/health
//
// Two jobs:
//  1. Warn the start screen when rooms cannot survive (see store.ts).
//  2. Tell us WHICH commit is actually live. Vercel's "Redeploy" button rebuilds
//     the commit of that particular deployment - not the newest one - so it is
//     easy to stare at an old build and wonder why nothing changed.
export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  return NextResponse.json(
    {
      ...storageInfo(),
      commit: commit ? commit.slice(0, 7) : null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      repo: process.env.VERCEL_GIT_REPO_SLUG ?? null,
      owner: process.env.VERCEL_GIT_REPO_OWNER ?? null,
      message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
