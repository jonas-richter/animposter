import { NextResponse } from 'next/server';
import { createRoom, makeRoomCode } from '@/lib/game';
import { getRoom, putRoom } from '@/lib/store';
import { handleError, noStore, readJson } from '@/lib/http';
import type { RoomMode } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/room  -> create a new room, caller becomes game master device.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const mode: RoomMode = body.mode === 'single' ? 'single' : 'multi';

    let code = '';
    for (let i = 0; i < 12; i++) {
      const candidate = makeRoomCode();
      if (!(await getRoom(candidate))) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error('Konnte keinen freien Raumcode finden. Bitte nochmal versuchen.');

    const { room, device } = createRoom(code, mode);
    await putRoom(room);

    return noStore(
      NextResponse.json({ code: room.code, token: device.token, deviceId: device.id, mode }),
    );
  } catch (e) {
    return handleError(e);
  }
}
