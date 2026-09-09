import { NextResponse } from 'next/server';
import { handleError, jsonError, noStore } from '@/lib/http';
import {
  characterDetail,
  cleanQuery,
  cleanSlug,
  compareCategories,
  searchCharacters,
  WikiError,
} from '@/lib/wiki';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// A very small in-process throttle so nobody can use this endpoint to hammer
// Fandom through our server. The real per-IP limiting arrives with the admin
// work; this is the cheap guard until then.
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

function throttled(key: string): boolean {
  const now = Date.now();
  const hits = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  HITS.set(key, hits);
  if (HITS.size > 500) HITS.clear();
  return hits.length > MAX_PER_WINDOW;
}

// GET /api/wiki?action=search&wiki=onepiece&q=zoro
// GET /api/wiki?action=detail&wiki=onepiece&a=Roronoa%20Zoro&b=Dracule%20Mihawk
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'local';
    if (throttled(ip)) return jsonError('Zu viele Anfragen. Kurz durchatmen.', 429);

    const slug = cleanSlug(url.searchParams.get('wiki'));
    const action = url.searchParams.get('action') ?? 'search';

    if (action === 'search') {
      const hits = await searchCharacters(slug, cleanQuery(url.searchParams.get('q')));
      return noStore(NextResponse.json({ hits }));
    }

    if (action === 'detail') {
      const a = url.searchParams.get('a') ?? '';
      const b = url.searchParams.get('b') ?? '';
      if (!a || !b) return jsonError('Es werden zwei Charaktere gebraucht.', 400);
      const [ da, db ] = await Promise.all([
        characterDetail(slug, a),
        characterDetail(slug, b),
      ]);
      return noStore(
        NextResponse.json({ a: da, b: db, ...compareCategories(da.categories, db.categories) }),
      );
    }

    return jsonError('Unbekannte Aktion.', 400);
  } catch (e) {
    if (e instanceof WikiError) return jsonError(e.message, 400);
    return handleError(e);
  }
}
