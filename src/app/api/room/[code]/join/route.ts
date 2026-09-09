import { NextResponse } from 'next/server';
import { addDevice, addSeat, cleanName, deviceByToken, roundInProgress } from '@/lib/game';
import { withRoom } from '@/lib/store';
import { handleError, noStore, normalizeCode, readJson, TOKEN_HEADER } from '@/lib/http';
import { buildView } from '@/lib/view';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/room/:code/join
// body: { name?: string }
// header x-impostor-token: reconnect with an existing device instead of creating one.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    const body = await readJson(req);
    const existingToken = req.headers.get(TOKEN_HEADER);

    const { room, result } = await withRoom(code, (room) => {
      // Reconnect path: token already belongs to this room.
      const known = deviceByToken(room, existingToken);
      if (known) {
        known.lastSeen = Date.now();
        if (typeof body.name === 'string' && body.name.trim()) {
          const owned = room.seats.filter((s) => s.deviceId === known.id);
          if (owned.length === 0) addSeat(room, known.id, body.name, roundInProgress(room));
        }
        return { token: known.token, deviceId: known.id };
      }

      // Latecomers are always let in; they simply sit the running round out.
      const waiting = roundInProgress(room);

      const device = addDevice(room);
      if (typeof body.name === 'string' && body.name.trim()) {
        try {
          addSeat(room, device.id, cleanName(body.name), waiting);
        } catch (e) {
          // roll the new device back so a duplicate name does not leave a ghost
          room.devices = room.devices.filter((d) => d.id !== device.id);
          throw e;
        }
      }
      return { token: device.token, deviceId: device.id };
    });

    const device = deviceByToken(room, result.token)!;
    return noStore(
      NextResponse.json({ ...result, view: buildView(room, device) }),
    );
  } catch (e) {
    return handleError(e);
  }
}
