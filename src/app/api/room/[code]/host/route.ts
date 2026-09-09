import { NextResponse } from 'next/server';
import { handleError, jsonError, noStore, normalizeCode } from '@/lib/http';
import { readRoomAndAdvance } from '@/lib/tick';
import { buildHostView } from '@/lib/view';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/room/:code/host
//
// Feeds the shared screen at /host/CODE. Deliberately token-free: it runs on a
// TV that nobody logs into. That is only safe because the payload contains no
// roles during the round - see buildHostView. Anyone who knows the code could
// join the room anyway.
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    const room = await readRoomAndAdvance(code);
    if (!room) return jsonError('Raum nicht gefunden.', 404);
    return noStore(NextResponse.json({ view: buildHostView(room) }));
  } catch (e) {
    return handleError(e);
  }
}
