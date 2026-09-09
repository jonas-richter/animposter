import QRCode from 'qrcode';
import { jsonError } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/qr?code=ABCD
// Renders the join URL for a room code as an SVG. Only the room code is taken
// from the query string - the URL itself is built server-side, so this endpoint
// cannot be abused to render arbitrary content into a QR code.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!code) return jsonError('Kein Raumcode angegeben.', 400);

  const origin =
    req.headers.get('origin') ||
    `${req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')}://${
      req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host
    }`;
  const target = `${origin}/join/${code}`;

  const svg = await QRCode.toString(target, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0b0e14', light: '#ffffff' },
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
