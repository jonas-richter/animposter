import { applyDeadline, syncDeadline } from './game';
import { getRoomCached, withRoom } from './store';
import type { Room } from './types';

/**
 * Serverless has no cron, so due phase transitions are applied by whichever
 * request happens to notice. The cheap check runs on the cached copy; only when
 * something is actually due do we take the lock and write.
 *
 * Returns the room as the caller should use it.
 */
export async function readRoomAndAdvance(code: string): Promise<Room | null> {
  const room = await getRoomCached(code);
  if (!room) return null;
  if (!room.deadline || Date.now() < room.deadline) return room;

  try {
    const { room: fresh } = await withRoom(code, (r) => {
      applyDeadline(r);
      return {};
    });
    return fresh;
  } catch {
    // Another request won the race, or the room vanished - the stale copy is
    // still fine to render from.
    return room;
  }
}

/** Call after every mutation so the next deadline is always in sync. */
export function afterMutation(room: Room): void {
  syncDeadline(room);
}
