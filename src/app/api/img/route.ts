import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

// Image proxy.
//
// Character art lives on Fandom's CDN. Loading it directly from the player's
// browser would send their IP address to a third party on every single card -
// which is exactly the kind of thing that turns a banner-free app into one that
// needs a consent dialog. Routing it through here means the only host a player
// ever talks to is this one.
//
// The URL is not free-form: only the Fandom image CDN is allowed, and only
// paths that look like an image.

const ALLOWED_HOST = 'static.wikia.nocookie.net';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('u') ?? '';
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return jsonError('Ungültige Bild-URL.', 400);
  }
  if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST) {
    return jsonError('Dieser Bild-Host ist nicht erlaubt.', 400);
  }
  if (!/\.(png|jpe?g|gif|webp)(\/|$)/i.test(target.pathname)) {
    return jsonError('Das ist kein Bildpfad.', 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { 'User-Agent': 'impostor-party-game/1.0' },
      // Let the platform cache it; these files never change.
      cache: 'force-cache',
    });
    if (!res.ok || !res.body) return jsonError('Bild nicht erreichbar.', 502);

    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return jsonError('Das ist kein Bild.', 502);

    return new Response(res.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': `public, max-age=${ONE_YEAR}, immutable`,
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return jsonError('Bild nicht erreichbar.', 502);
  } finally {
    clearTimeout(timer);
  }
}
