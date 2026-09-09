// Abuse limits for a semi-public deployment.
//
// Deliberately in-process: a Redis round trip per request would cost more than
// the thing it protects, and the free plan has a monthly command budget. Each
// serverless instance keeps its own counters, so the effective limit is
// (instances x limit) - still orders of magnitude below what a script needs to
// be a problem, and it costs nothing.
//
// The numbers are set so a normal player never touches them: the limit on room
// creation is per hour, and nobody opens six rooms an hour by accident.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface LimitSpec {
  key: string;
  windowMs: number;
  max: number;
}

export const LIMITS = {
  createRoom: { key: 'room', windowMs: 3600_000, max: 30 },
  join: { key: 'join', windowMs: 600_000, max: 60 },
  customTopic: { key: 'topic', windowMs: 3600_000, max: 20 },
  llm: { key: 'llm', windowMs: 86_400_000, max: 8 },
  adminLogin: { key: 'login', windowMs: 900_000, max: 10 },
} as const;

/** Client identity for limiting only - never stored anywhere. */
export function clientKey(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

export function hitLimit(req: Request, spec: LimitSpec): boolean {
  const who = clientKey(req);
  // No proxy headers means we are not behind a real edge (local dev, the test
  // suite). Limiting there would only make development annoying.
  if (who === 'local') return false;
  const id = `${spec.key}:${who}`;
  const now = Date.now();
  const bucket = buckets.get(id) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < spec.windowMs);
  bucket.hits.push(now);
  buckets.set(id, bucket);

  // Cheap garbage collection so the map cannot grow without bound.
  if (buckets.size > 2000) {
    for (const [k, b] of buckets) {
      if (b.hits.length === 0 || now - b.hits[b.hits.length - 1] > 86_400_000) buckets.delete(k);
    }
  }
  return bucket.hits.length > spec.max;
}

/** Country only - Vercel provides it without us ever touching the IP. */
export function requestCountry(req: Request): string {
  const c =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-country-code') ||
    '';
  return /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : '';
}

export function shortUserAgent(req: Request): string {
  return (req.headers.get('user-agent') ?? '').slice(0, 180);
}
