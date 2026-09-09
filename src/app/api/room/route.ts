import { NextResponse } from 'next/server';
import { createRoom, makeRoomCode } from '@/lib/game';
import { getRoom, putRoom } from '@/lib/store';
import { registerRoom } from '@/lib/registry';
import { hitLimit, LIMITS, requestCountry, shortUserAgent } from '@/lib/limits';
import { handleError, jsonError, noStore } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/room  -> create a new room, caller becomes game master device.
export async function POST(req: Request) {
  try {
    if (hitLimit(req, LIMITS.createRoom)) {
      return jsonError('Zu viele Räume in kurzer Zeit. Versuch es später nochmal.', 429);
    }
    let code = '';
    for (let i = 0; i < 12; i++) {
      const candidate = makeRoomCode();
      if (!(await getRoom(candidate))) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error('Konnte keinen freien Raumcode finden. Bitte nochmal versuchen.');

    const { room, device } = createRoom(code);
    device.country = requestCountry(req);
    device.userAgent = shortUserAgent(req);
    await putRoom(room);
    await registerRoom(code);

    return noStore(
      NextResponse.json({ code: room.code, token: device.token, deviceId: device.id }),
    );
  } catch (e) {
    return handleError(e);
  }
}
