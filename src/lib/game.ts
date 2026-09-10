import { randomBytes, randomUUID } from 'crypto';
import { BUILTIN_TOPICS } from './characters';
import type {
  Assignment,
  CharacterPair,
  Device,
  Reaction,
  Room,
  Round,
  Seat,
  Topic,
} from './types';

export class GameError extends Error {}

function fail(m: string): never {
  throw new GameError(m);
}

export const MAX_SEATS = 24;
export const MAX_NAME_LEN = 24;
// Coarse on purpose: the heartbeat write is throttled to ~45s to save Redis
// commands, and this only drives a cosmetic dot in the player list.
export const ONLINE_WINDOW_MS = 90_000;

// Ambiguous characters (0/O, 1/I) are excluded so a code is easy to type.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(): string {
  const bytes = randomBytes(4);
  let out = '';
  for (let i = 0; i < 4; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function makeToken(): string {
  return randomBytes(24).toString('base64url');
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') fail('Name fehlt.');
  const n = (raw as string)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n) fail('Bitte einen Namen eingeben.');
  if (n.length > MAX_NAME_LEN) fail(`Name ist zu lang (max. ${MAX_NAME_LEN} Zeichen).`);
  return n;
}

export function createRoom(code: string): { room: Room; device: Device } {
  const device: Device = { id: randomUUID(), token: makeToken(), lastSeen: Date.now() };
  const room: Room = {
    code,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    phase: 'lobby',
    devices: [device],
    seats: [],
    gmDeviceId: device.id,
    settings: {
      impostorsKnow: true,
      impostorCount: 2,
      proposalsNeedApproval: false,
      // On by default: the game should run itself, the game master is there to
      // fix things, not to press "next" four times a round.
      multiTopicVote: false,
      timerEnabled: true,
      discussionSec: 120,
      votingSec: 60,
      targetScore: null,
    },
    topicVotes: {},
    currentTopicId: null,
    round: null,
    roundCounter: 0,
    customTopics: [],
    usedPairIds: [],
    deadline: null,
    deadlineAction: null,
    reactions: [],
    lastReactionAt: {},
  };
  return { room, device };
}

export function deviceByToken(room: Room, token: string | null): Device | null {
  if (!token) return null;
  return room.devices.find((d) => d.token === token) ?? null;
}

export function isGm(room: Room, device: Device): boolean {
  return room.gmDeviceId === device.id;
}

export function seatsOf(room: Room, deviceId: string): Seat[] {
  return room.seats.filter((s) => s.deviceId === deviceId);
}

export function allTopics(room: Room): Topic[] {
  // Topics the admin promoted are attached to the room when it is loaded, so
  // this stays a pure function.
  return [...BUILTIN_TOPICS, ...(room.globalTopics ?? []), ...room.customTopics];
}

export function topicById(room: Room, id: string): Topic | undefined {
  return allTopics(room).find((t) => t.id === id);
}

export function addDevice(
  room: Room,
  meta: { country?: string; userAgent?: string; hidden?: boolean } = {},
): Device {
  const device: Device = {
    id: randomUUID(),
    token: makeToken(),
    lastSeen: Date.now(),
    ...meta,
  };
  room.devices.push(device);
  return device;
}

export function addSeat(
  room: Room,
  deviceId: string | null,
  name: string,
  waiting = false,
): Seat {
  if (room.seats.length >= MAX_SEATS) fail(`Maximal ${MAX_SEATS} Spieler pro Raum.`);
  const clean = cleanName(name);
  if (room.seats.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
    fail(`"${clean}" ist schon vergeben. Bitte einen anderen Namen wählen.`);
  }
  const seat: Seat = {
    id: randomUUID(),
    name: clean,
    deviceId,
    // A newcomer sits out the running round but is in from the next one.
    spectator: waiting,
    waiting,
    playNextRound: true,
    score: 0,
    createdAt: Date.now(),
  };
  room.seats.push(seat);
  return seat;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    // Cryptographic randomness: role assignment must not be predictable.
    const j = randomBytes(4).readUInt32BE(0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickPair(room: Room, topic: Topic): CharacterPair {
  const unused = topic.pairs.filter((p) => !room.usedPairIds.includes(p.id));
  const pool = unused.length > 0 ? unused : topic.pairs;
  if (pool.length === 0) fail('Dieses Thema enthält keine Charakter-Paare.');
  if (unused.length === 0) {
    // All pairs of this topic have been played -> start over for this topic.
    room.usedPairIds = room.usedPairIds.filter((id) => !topic.pairs.some((p) => p.id === id));
  }
  return shuffle(pool)[0];
}

/** Seats that take part in the upcoming round. */
export function activeSeats(room: Room): Seat[] {
  return room.seats.filter((s) => s.playNextRound);
}

/** True while a round is running and nobody may be dealt in. */
export function roundInProgress(room: Room): boolean {
  return ['topicReveal', 'reveal', 'discussion', 'voting'].includes(room.phase);
}

export function startRound(room: Room, topicId: string, overridden = false): void {
  const topic = topicById(room, topicId);
  if (!topic) fail('Unbekanntes Thema.');

  const active = activeSeats(room);
  const impostorCount = room.settings.impostorCount;
  const minPlayers = impostorCount + 2;
  if (active.length < minPlayers) {
    fail(
      `Für ${impostorCount} Impostor werden mindestens ${minPlayers} mitspielende Spieler gebraucht (aktuell ${active.length}). Weniger Impostor einstellen oder mehr Spieler mitspielen lassen.`,
    );
  }

  // Snapshot the vote before it is cleared, so the announcement screen can
  // show how the decision came about.
  const counts = topicTally(room);
  const tallySnapshot = Object.entries(counts)
    .map(([id, votes]) => ({ name: topicById(room, id)?.name ?? '?', votes }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  const pair = pickPair(room, topic);
  room.usedPairIds.push(pair.id);
  if (room.usedPairIds.length > 400) room.usedPairIds = room.usedPairIds.slice(-200);

  const shuffled = shuffle(active);
  const impostors = shuffled.slice(0, impostorCount);
  const impostorIds = impostors.map((s) => s.id);

  const assignments: Record<string, Assignment> = {};
  for (const seat of active) {
    const isImp = impostorIds.includes(seat.id);
    assignments[seat.id] = {
      seatId: seat.id,
      characterName: isImp ? pair.impostor.name : pair.real.name,
      characterImage: isImp ? pair.impostor.image : pair.real.image,
      isImpostor: isImp,
      revealed: false,
    };
  }

  // Spectator flag is frozen for the round from the "play next round" toggle.
  // Everyone who was waiting is dealt in now.
  for (const seat of room.seats) {
    seat.spectator = !seat.playNextRound;
    seat.waiting = false;
  }

  room.roundCounter += 1;
  const round: Round = {
    n: room.roundCounter,
    topicId: topic.id,
    topicName: topic.name,
    pair: {
      pairId: pair.id,
      realName: pair.real.name,
      realImage: pair.real.image,
      impostorName: pair.impostor.name,
      impostorImage: pair.impostor.image,
      similarities: pair.similarities,
      traps: pair.traps,
    },
    assignments,
    impostorSeatIds: impostorIds,
    votes: {},
    impostorsKnow: room.settings.impostorsKnow,
    impostorCount,
    activeSeatIds: active.map((s) => s.id),
    topicTally: tallySnapshot,
    topicOverridden: overridden,
    points: {},
  };
  // A suggestion that made it into a round is just a normal topic afterwards.
  delete topic.proposedBy;
  topic.approved = true;

  room.round = round;
  room.currentTopicId = topic.id;
  // Announce the winning topic first; the cards follow when the GM continues.
  room.phase = 'topicReveal';
  room.topicVotes = {};
}

export function castVote(room: Room, voterSeatId: string, targets: string[]): void {
  const round = room.round;
  if (!round) fail('Es läuft gerade keine Runde.');
  if (room.phase !== 'voting') fail('Die Abstimmung läuft gerade nicht.');
  if (!round.activeSeatIds.includes(voterSeatId)) fail('Zuschauer dürfen nicht abstimmen.');

  const unique = Array.from(new Set(targets));
  if (unique.length !== round.impostorCount) {
    fail(`Bitte genau ${round.impostorCount} Spieler auswählen.`);
  }
  if (unique.includes(voterSeatId)) fail('Du kannst nicht für dich selbst stimmen.');
  for (const t of unique) {
    if (!round.activeSeatIds.includes(t)) fail('Ungültige Auswahl.');
  }
  round.votes[voterSeatId] = unique;
}

export function everyoneVoted(room: Room): boolean {
  const round = room.round;
  if (!round) return false;
  return round.activeSeatIds.every((id) => Array.isArray(round.votes[id]));
}

export function everyoneRevealed(room: Room): boolean {
  const round = room.round;
  if (!round) return false;
  return round.activeSeatIds.every((id) => round.assignments[id]?.revealed);
}

/**
 * Scoring:
 *  - Crew member: +2 for every impostor they correctly named.
 *  - Impostor: +3 if they were NOT among the most-voted `impostorCount` seats.
 */
export function finishRound(room: Room): void {
  const round = room.round;
  if (!round) fail('Es läuft gerade keine Runde.');

  const received: Record<string, number> = {};
  for (const id of round.activeSeatIds) received[id] = 0;
  for (const targets of Object.values(round.votes)) {
    for (const t of targets) received[t] = (received[t] ?? 0) + 1;
  }

  // Seats that the group collectively accused (top N by votes, ties included).
  const sorted = [...round.activeSeatIds].sort((a, b) => received[b] - received[a]);
  const cutoff = sorted.length > 0 ? received[sorted[Math.min(round.impostorCount, sorted.length) - 1]] : 0;
  const accused = new Set(round.activeSeatIds.filter((id) => received[id] > 0 && received[id] >= cutoff));

  const points: Record<string, number> = {};
  for (const seatId of round.activeSeatIds) {
    const isImp = round.impostorSeatIds.includes(seatId);
    if (isImp) {
      points[seatId] = accused.has(seatId) ? 0 : 3;
    } else {
      const myVotes = round.votes[seatId] ?? [];
      const correct = myVotes.filter((v) => round.impostorSeatIds.includes(v)).length;
      points[seatId] = correct * 2;
    }
  }
  round.points = points;
  for (const seat of room.seats) {
    if (points[seat.id]) seat.score += points[seat.id];
  }
  room.phase = 'results';
}

/** Has anybody reached the target score? Drives the results-screen button. */
export function targetReached(room: Room): boolean {
  const target = room.settings.targetScore;
  return Boolean(target && room.seats.some((s) => s.score >= target));
}

export function nextRound(room: Room): void {
  room.round = null;
  room.phase = 'topicVote';
  room.topicVotes = {};
  room.currentTopicId = null;
  for (const seat of room.seats) {
    seat.spectator = !seat.playNextRound;
    seat.waiting = false;
  }
}

/** Hand the game master role to another device; returns the new GM device id. */
export function transferGm(room: Room, targetDeviceId?: string): string {
  const candidates = room.devices.filter((d) => d.id !== room.gmDeviceId);
  if (candidates.length === 0) fail('Es ist kein anderes Gerät im Raum.');
  let target = targetDeviceId ? candidates.find((d) => d.id === targetDeviceId) : undefined;
  if (!target) {
    const online = candidates.filter((d) => Date.now() - d.lastSeen < ONLINE_WINDOW_MS);
    const pool = online.length > 0 ? online : candidates;
    target = shuffle(pool)[0];
  }
  room.gmDeviceId = target.id;
  return target.id;
}

/** Remove a device: its seats become free to claim, GM role moves on if needed. */
export function removeDevice(room: Room, deviceId: string, successorDeviceId?: string): void {
  const wasGm = room.gmDeviceId === deviceId;
  room.devices = room.devices.filter((d) => d.id !== deviceId);
  for (const seat of room.seats) {
    if (seat.deviceId === deviceId) seat.deviceId = null;
  }
  // In the lobby an abandoned seat is simply dropped.
  if (room.phase === 'lobby') {
    room.seats = room.seats.filter((s) => s.deviceId !== null);
  }
  if (wasGm) {
    if (room.devices.length === 0) return; // room will expire on its own
    const pick = successorDeviceId
      ? room.devices.find((d) => d.id === successorDeviceId)
      : undefined;
    room.gmDeviceId = (pick ?? shuffle(room.devices)[0]).id;
  }
}

export function topicTally(room: Room): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const chosen of Object.values(room.topicVotes)) {
    for (const topicId of chosen ?? []) tally[topicId] = (tally[topicId] ?? 0) + 1;
  }
  return tally;
}

/**
 * Record a vote. In single mode the seat's choice is replaced; in approval mode
 * the topic is toggled, so a player can tick everything they know.
 */
export function voteForTopic(room: Room, seatId: string, topicId: string): void {
  if (!room.settings.multiTopicVote) {
    room.topicVotes[seatId] = [topicId];
    return;
  }
  const current = room.topicVotes[seatId] ?? [];
  room.topicVotes[seatId] = current.includes(topicId)
    ? current.filter((t) => t !== topicId)
    : [...current, topicId].slice(0, 20);
}

/** Topic with the most votes; ties are broken randomly. Null when nobody voted. */
export function topicVoteWinner(room: Room): string | null {
  const tally = topicTally(room);
  const entries = Object.entries(tally);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  const best = entries.filter(([, c]) => c === max).map(([id]) => id);
  return shuffle(best)[0];
}


// ---------------------------------------------------------------------------
// Automatic phase progression
//
// There are no background jobs on serverless, so a phase does not advance on a
// timer thread - it advances the moment any request notices that the deadline
// has passed. Clients poll every 1-3s, so the delay is not noticeable.
// ---------------------------------------------------------------------------

const REVEAL_ANNOUNCE_MS = 7000; // how long the winning topic stays on screen
const DEAL_PAUSE_MS = 2500; // beat between "all cards seen" and the discussion
const TOPIC_VOTE_PAUSE_MS = 2500; // beat after the last topic vote

/** Recompute when (and whether) the current phase should advance by itself. */
export function syncDeadline(room: Room): void {
  const now = Date.now();
  // Countdown off means the game master drives every transition by hand.
  if (!room.settings.timerEnabled) {
    room.deadline = null;
    room.deadlineAction = null;
    return;
  }
  const set = (ms: number, action: Room['deadlineAction']) => {
    room.deadline = now + ms;
    room.deadlineAction = action;
  };
  const clear = () => {
    room.deadline = null;
    room.deadlineAction = null;
  };

  switch (room.phase) {
    case 'topicVote': {
      const active = activeSeats(room);
      const everyoneVoted =
        active.length > 0 && active.every((s) => (room.topicVotes[s.id] ?? []).length > 0);
      // In approval mode people keep ticking boxes, so give them longer before
      // the round starts by itself.
      const pause = room.settings.multiTopicVote ? 6000 : TOPIC_VOTE_PAUSE_MS;
      const enough = active.length >= room.settings.impostorCount + 2;
      if (everyoneVoted && enough) {
        if (room.deadlineAction !== 'startRound') set(pause, 'startRound');
      } else clear();
      return;
    }
    case 'topicReveal':
      if (room.deadlineAction !== 'reveal') set(REVEAL_ANNOUNCE_MS, 'reveal');
      return;
    case 'reveal': {
      if (everyoneRevealed(room)) {
        if (room.deadlineAction !== 'discussion') set(DEAL_PAUSE_MS, 'discussion');
      } else clear();
      return;
    }
    case 'discussion':
      if (room.settings.timerEnabled) {
        if (room.deadlineAction !== 'voting') set(room.settings.discussionSec * 1000, 'voting');
      } else clear();
      return;
    case 'voting':
      if (room.settings.timerEnabled) {
        if (room.deadlineAction !== 'finish') set(room.settings.votingSec * 1000, 'finish');
      } else clear();
      return;
    default:
      clear();
  }
}

/**
 * Apply any due transition. Returns true when something changed, so the caller
 * knows it has to persist the room.
 */
export function applyDeadline(room: Room): boolean {
  if (!room.deadline || Date.now() < room.deadline) return false;
  const action = room.deadlineAction;
  room.deadline = null;
  room.deadlineAction = null;

  try {
    switch (action) {
      case 'startRound': {
        const winner = topicVoteWinner(room);
        if (!winner) return true;
        startRound(room, winner);
        break;
      }
      case 'reveal':
        if (room.phase === 'topicReveal') room.phase = 'reveal';
        break;
      case 'discussion':
        if (room.phase === 'reveal') room.phase = 'discussion';
        break;
      case 'voting':
        if (room.phase === 'discussion') room.phase = 'voting';
        break;
      case 'finish':
        if (room.phase === 'voting') finishRound(room);
        break;
      default:
        break;
    }
  } catch {
    // A transition that is no longer valid (too few players, round already
    // resolved) simply drops - the game master can always take over.
  }
  syncDeadline(room);
  return true;
}

// ---------------------------------------------------------------------------
// Emotes
// ---------------------------------------------------------------------------

export const REACTIONS = ['😂', '😮', '😭', '👏', '🤨', '🎭'] as const;
const REACTION_COOLDOWN_MS = 2500;
const REACTION_TTL_MS = 6000;

export function addReaction(room: Room, seat: Seat, emoji: string): void {
  if (!REACTIONS.includes(emoji as (typeof REACTIONS)[number])) {
    fail('Unbekannte Reaktion.');
  }
  const last = room.lastReactionAt[seat.id] ?? 0;
  if (Date.now() - last < REACTION_COOLDOWN_MS) {
    fail('Immer mit der Ruhe.');
  }
  room.lastReactionAt[seat.id] = Date.now();
  const reaction: Reaction = {
    id: randomBytes(6).toString('hex'),
    seatName: seat.name,
    emoji,
    at: Date.now(),
  };
  room.reactions = [...pruneReactions(room), reaction].slice(-24);
}

export function pruneReactions(room: Room): Reaction[] {
  const cutoff = Date.now() - REACTION_TTL_MS;
  return (room.reactions ?? []).filter((r) => r.at > cutoff);
}

// ---------------------------------------------------------------------------
// End of game
// ---------------------------------------------------------------------------

export function standings(room: Room) {
  return [...room.seats]
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    .map((s) => ({ seatId: s.id, seatName: s.name, score: s.score }));
}

export function endGame(room: Room): void {
  room.phase = 'gameOver';
  room.round = null;
  room.deadline = null;
  room.deadlineAction = null;
}

export function restartGame(room: Room): void {
  for (const seat of room.seats) {
    seat.score = 0;
    seat.waiting = false;
    seat.spectator = !seat.playNextRound;
  }
  room.phase = 'lobby';
  room.round = null;
  room.roundCounter = 0;
  room.topicVotes = {};
  room.currentTopicId = null;
  room.usedPairIds = [];
  room.deadline = null;
  room.deadlineAction = null;
}
