import { Redis } from '@upstash/redis';
import { globalTopicsCached } from './registry';
import type { Room } from './types';

// Storage layer.
//
// Two backends, chosen automatically:
//  1. Upstash Redis (REST) when the env vars are present -> works on Vercel/Netlify
//     where every request may hit a different serverless instance.
//  2. In-memory Map as a fallback -> zero setup for `npm run dev` and for
//     single-instance hosting.
//
// Both are wrapped in `withRoom()`, which takes a short lock so two players
// acting at the same moment cannot clobber each other's writes.

const ROOM_TTL_SECONDS = 60 * 60 * 8; // 8h, plenty for a game night
const LOCK_TTL_MS = 4000;

// Every polling client would otherwise cost one Redis command per tick. With
// eight phones that is thousands of commands per hour - the Upstash free plan
// allows 500k per MONTH. So each serverless instance keeps the room in memory
// for a moment: reads within that window cost nothing, and the number of Redis
// reads now scales with the number of warm instances instead of the number of
// players. Writes always bypass the cache and refresh it.
const READ_CACHE_MS = 900;

function readEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

const REDIS_URL = readEnv('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = readEnv('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');

export const STORAGE_BACKEND: 'redis' | 'memory' =
  REDIS_URL && REDIS_TOKEN ? 'redis' : 'memory';

let redis: Redis | null = null;
if (STORAGE_BACKEND === 'redis') {
  redis = new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
}

/**
 * In-memory storage only works when every request hits the same process.
 * On a serverless host (Vercel/Netlify) that is NOT the case: each request may
 * land on a different instance, and instances get recycled when idle. The room
 * then vanishes between two requests and players get thrown out with
 * "Raum nicht gefunden". This flag lets the UI warn about exactly that.
 */
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.NETLIFY);

export function storageInfo() {
  return {
    backend: STORAGE_BACKEND,
    serverless: IS_SERVERLESS,
    /** True when rooms survive reliably across requests. */
    reliable: STORAGE_BACKEND === 'redis' || !IS_SERVERLESS,
  };
}

// --- in-memory fallback -----------------------------------------------------

interface MemoryState {
  rooms: Map<string, { room: Room; expiresAt: number }>;
  locks: Map<string, number>;
  cache: Map<string, { room: Room; at: number }>;
}

const globalForMemory = globalThis as unknown as { __impostorMemory?: MemoryState };

function memory(): MemoryState {
  if (!globalForMemory.__impostorMemory) {
    globalForMemory.__impostorMemory = { rooms: new Map(), locks: new Map(), cache: new Map() };
  }
  return globalForMemory.__impostorMemory;
}

// --- primitives -------------------------------------------------------------

const key = (code: string) => `impostor:room:${code}`;
const lockKey = (code: string) => `impostor:lock:${code}`;

/**
 * Read a room, allowing a slightly stale copy from this instance's cache.
 * Only for the polling endpoint - never for anything that then writes.
 */
export async function getRoomCached(code: string): Promise<Room | null> {
  if (!redis) return getRoom(code);
  const hit = memory().cache.get(code);
  if (hit && Date.now() - hit.at < READ_CACHE_MS) {
    hit.room.globalTopics = await globalTopicsCached();
    return hit.room;
  }
  const room = await getRoom(code);
  if (room) memory().cache.set(code, { room, at: Date.now() });
  else memory().cache.delete(code);
  return room;
}

export async function getRoom(code: string): Promise<Room | null> {
  const room = await loadRoom(code);
  if (room) room.globalTopics = await globalTopicsCached();
  return room;
}

async function loadRoom(code: string): Promise<Room | null> {
  if (redis) {
    const raw = await redis.get<Room>(key(code));
    return raw ?? null;
  }
  const mem = memory();
  const entry = mem.rooms.get(code);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    mem.rooms.delete(code);
    return null;
  }
  return entry.room;
}

export async function putRoom(room: Room): Promise<void> {
  room.updatedAt = Date.now();
  if (redis) {
    // Promoted topics are attached on load; storing them per room would
    // duplicate them into every room and never update.
    const { globalTopics, ...persisted } = room;
    void globalTopics;
    await redis.set(key(room.code), persisted, { ex: ROOM_TTL_SECONDS });
    memory().cache.set(room.code, { room, at: Date.now() });
    return;
  }
  memory().rooms.set(room.code, {
    room,
    expiresAt: Date.now() + ROOM_TTL_SECONDS * 1000,
  });
}

export async function deleteRoom(code: string): Promise<void> {
  memory().cache.delete(code);
  if (redis) {
    await redis.del(key(code));
    return;
  }
  memory().rooms.delete(code);
}

export async function roomExists(code: string): Promise<boolean> {
  return (await getRoom(code)) !== null;
}

async function acquireLock(code: string): Promise<boolean> {
  if (redis) {
    const ok = await redis.set(lockKey(code), '1', { nx: true, px: LOCK_TTL_MS });
    return ok === 'OK';
  }
  const mem = memory();
  const until = mem.locks.get(code);
  if (until && until > Date.now()) return false;
  mem.locks.set(code, Date.now() + LOCK_TTL_MS);
  return true;
}

async function releaseLock(code: string): Promise<void> {
  if (redis) {
    await redis.del(lockKey(code));
    return;
  }
  memory().locks.delete(code);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Read-modify-write a room under a lock. The mutator may return `false`
 * to abort without writing. Throws if the room does not exist.
 */
export async function withRoom<T>(
  code: string,
  mutator: (room: Room) => T | Promise<T>,
): Promise<{ room: Room; result: T }> {
  let locked = false;
  for (let i = 0; i < 40; i++) {
    // ~2s worst case
    if (await acquireLock(code)) {
      locked = true;
      break;
    }
    await sleep(50);
  }
  if (!locked) throw new Error('Raum ist gerade belegt, bitte nochmal versuchen.');

  try {
    const room = await getRoom(code);
    if (!room) throw new Error('Raum nicht gefunden.');
    const result = await mutator(room);
    room.version += 1;
    await putRoom(room);
    return { room, result };
  } finally {
    await releaseLock(code);
  }
}
