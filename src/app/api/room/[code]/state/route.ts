import { NextResponse } from 'next/server';
import { deviceByToken } from '@/lib/game';
import { putRoom } from '@/lib/store';
import { readRoomAndAdvance } from '@/lib/tick';
import { handleError, jsonError, noStore, normalizeCode, TOKEN_HEADER } from '@/lib/http';
import { buildView } from '@/lib/view';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/room/:code/state
// Polled by every client roughly once per 800 ms. Also acts as the heartbeat.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    const token = req.headers.get(TOKEN_HEADER);

    // Also applies any phase transition that has come due.
    const room = await readRoomAndAdvance(code);
    if (!room) return jsonError('Raum nicht gefunden.', 404);

    const device = deviceByToken(room, token);
    if (!device) return jsonError('Nicht in diesem Raum angemeldet.', 401);

    // Heartbeat: only write when the timestamp is really stale. Every write is
    // a Redis command, and "online" only drives a dot in the player list.
    if (Date.now() - device.lastSeen > 45000) {
      device.lastSeen = Date.now();
      await putRoom(room);
    }

    return noStore(NextResponse.json({ view: buildView(room, device) }));
  } catch (e) {
    return handleError(e);
  }
}
