import { Redis } from '@upstash/redis';
import type { Topic } from './types';

// Everything the admin view needs that is not part of a single room:
// which rooms exist, a short history, and the globally promoted topics.
//
// Retention: history entries carry a 7 day TTL and expire on their own. We
// never store an IP address - only the country Vercel puts in the request
// header, plus the user agent string. That is enough to tell "someone in DE on
// an iPhone" apart from a bot, and far less than a full address.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const ROOMS_KEY = 'impostor:rooms';
const HISTORY_KEY = 'impostor:history';
const GLOBAL_TOPICS_KEY = 'impostor:globalTopics';
const CONFIG_KEY = 'impostor:config';

export const HISTORY_TTL_DAYS = 7;
const HISTORY_MAX = 400;
const ROOM_INDEX_TTL_MS = 12 * 3600_000;

// In-memory fallback so everything also works during `npm run dev`.
const mem = globalThis as unknown as {
  __impostorRegistry?: {
    rooms: Map<string, number>;
    history: HistoryEntry[];
    topics: Topic[];
    config: AdminConfig;
  };
};
function local() {
  if (!mem.__impostorRegistry) {
    mem.__impostorRegistry = {
      rooms: new Map(),
      history: [],
      topics: [],
      config: { llmForEveryone: false },
    };
  }
  return mem.__impostorRegistry;
}

export interface AdminConfig {
  /** When off, the AI topic generator is only offered to a logged-in admin. */
  llmForEveryone: boolean;
}

export interface HistoryEntry {
  at: number;
  code: string;
  round: number;
  topic: string;
  players: string[];
  impostors: string[];
  realName: string;
  impostorName: string;
}

// --- room index --------------------------------------------------------------

export async function registerRoom(code: string): Promise<void> {
  const now = Date.now();
  if (redis) {
    await redis.zadd(ROOMS_KEY, { score: now, member: code });
    return;
  }
  local().rooms.set(code, now);
}

export async function unregisterRoom(code: string): Promise<void> {
  if (redis) {
    await redis.zrem(ROOMS_KEY, code);
    return;
  }
  local().rooms.delete(code);
}

export async function listRoomCodes(): Promise<string[]> {
  const cutoff = Date.now() - ROOM_INDEX_TTL_MS;
  if (redis) {
    // Drop anything older than a room could possibly live, then read the rest.
    await redis.zremrangebyscore(ROOMS_KEY, 0, cutoff);
    return (await redis.zrange<string[]>(ROOMS_KEY, 0, 200, { rev: true })) ?? [];
  }
  return [...local().rooms.entries()]
    .filter(([, at]) => at > cutoff)
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);
}

// --- history -----------------------------------------------------------------

export async function recordRound(entry: HistoryEntry): Promise<void> {
  if (redis) {
    await redis.lpush(HISTORY_KEY, JSON.stringify(entry));
    await redis.ltrim(HISTORY_KEY, 0, HISTORY_MAX - 1);
    await redis.expire(HISTORY_KEY, HISTORY_TTL_DAYS * 86400);
    return;
  }
  const l = local();
  l.history.unshift(entry);
  l.history = l.history.slice(0, HISTORY_MAX);
}

export async function readHistory(): Promise<HistoryEntry[]> {
  const cutoff = Date.now() - HISTORY_TTL_DAYS * 86400_000;
  const raw = redis
    ? ((await redis.lrange<string>(HISTORY_KEY, 0, HISTORY_MAX - 1)) ?? [])
    : local().history.map((h) => JSON.stringify(h));
  return raw
    .map((r) => {
      try {
        return typeof r === 'string' ? (JSON.parse(r) as HistoryEntry) : (r as HistoryEntry);
      } catch {
        return null;
      }
    })
    .filter((h): h is HistoryEntry => h !== null && h.at > cutoff);
}

// --- promoted topics ---------------------------------------------------------

export async function readGlobalTopics(): Promise<Topic[]> {
  if (redis) return (await redis.get<Topic[]>(GLOBAL_TOPICS_KEY)) ?? [];
  return local().topics;
}

// Promoted topics change maybe once a week but would otherwise be read on every
// single room load. Memoised per instance so attaching them is effectively free.
let topicCache: { at: number; topics: Topic[] } | null = null;
const TOPIC_CACHE_MS = 60_000;

export async function globalTopicsCached(): Promise<Topic[]> {
  if (topicCache && Date.now() - topicCache.at < TOPIC_CACHE_MS) return topicCache.topics;
  const topics = await readGlobalTopics();
  topicCache = { at: Date.now(), topics };
  return topics;
}

export async function writeGlobalTopics(topics: Topic[]): Promise<void> {
  topicCache = { at: Date.now(), topics };
  if (redis) {
    await redis.set(GLOBAL_TOPICS_KEY, topics.slice(0, 60));
    return;
  }
  local().topics = topics.slice(0, 60);
}

// --- admin config ------------------------------------------------------------

export async function readConfig(): Promise<AdminConfig> {
  if (redis) return (await redis.get<AdminConfig>(CONFIG_KEY)) ?? { llmForEveryone: false };
  return local().config;
}

export async function writeConfig(config: AdminConfig): Promise<void> {
  if (redis) {
    await redis.set(CONFIG_KEY, config);
    return;
  }
  local().config = config;
}
