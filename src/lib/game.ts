import { randomBytes, randomUUID } from 'crypto';
import { BUILTIN_TOPICS } from './characters';
import type { Assignment, CharacterPair, Device, Room, RoomMode, Round, Seat, Topic } from './types';

export class GameError extends Error {}

function fail(m: string): never {
  throw new GameError(m);
}

export const MAX_SEATS = 24;
export const MAX_NAME_LEN = 24;
export const ONLINE_WINDOW_MS = 20_000;

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

export function createRoom(code: string, mode: RoomMode): { room: Room; device: Device } {
  const device: Device = { id: randomUUID(), token: makeToken(), lastSeen: Date.now() };
  const room: Room = {
    code,
    mode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    phase: 'lobby',
    devices: [device],
    seats: [],
    gmDeviceId: device.id,
    settings: { impostorsKnow: true, impostorCount: 2 },
    topicVotes: {},
    currentTopicId: null,
    round: null,
    roundCounter: 0,
    customTopics: [],
    usedPairIds: [],
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
  return [...BUILTIN_TOPICS, ...room.customTopics];
}

export function topicById(room: Room, id: string): Topic | undefined {
  return allTopics(room).find((t) => t.id === id);
}

export function addDevice(room: Room): Device {
  const device: Device = { id: randomUUID(), token: makeToken(), lastSeen: Date.now() };
  room.devices.push(device);
  return device;
}

export function addSeat(room: Room, deviceId: string | null, name: string): Seat {
  if (room.seats.length >= MAX_SEATS) fail(`Maximal ${MAX_SEATS} Spieler pro Raum.`);
  const clean = cleanName(name);
  if (room.seats.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
    fail(`"${clean}" ist schon vergeben. Bitte einen anderen Namen wählen.`);
  }
  const seat: Seat = {
    id: randomUUID(),
    name: clean,
    deviceId,
    spectator: false,
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

export function startRound(room: Room, topicId: string): void {
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
  for (const seat of room.seats) seat.spectator = !seat.playNextRound;

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
    points: {},
  };
  room.round = round;
  room.currentTopicId = topic.id;
  room.phase = 'reveal';
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

export function nextRound(room: Room): void {
  room.round = null;
  room.phase = 'topicVote';
  room.topicVotes = {};
  room.currentTopicId = null;
  for (const seat of room.seats) seat.spectator = !seat.playNextRound;
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
  for (const topicId of Object.values(room.topicVotes)) {
    tally[topicId] = (tally[topicId] ?? 0) + 1;
  }
  return tally;
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
