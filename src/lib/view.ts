import {
  allTopics,
  isGm,
  ONLINE_WINDOW_MS,
  pruneReactions,
  seatsOf,
  standings,
  targetReached,
  topicTally,
} from './game';
import type {
  Device,
  MyRole,
  ResultRow,
  Room,
  RoomView,
  RoundResults,
  SeatPublic,
  TopicMeta,
} from './types';

// The single place where server state is turned into something a client may see.
//
// Guarantee: a normal player's payload NEVER contains another seat's character,
// the impostor list, or the pair's similarities/traps. Opening the network tab
// gets you nothing. Full information is only sent to
//   a) spectators (who are told very clearly that they see everything), and
//   b) everybody, once the round is resolved (phase === 'results').

function isSpectatorDevice(room: Room, deviceId: string): boolean {
  const seats = seatsOf(room, deviceId);
  if (seats.length === 0) return true; // a device without a seat only watches
  // Somebody who joined mid-round is NOT a spectator: a spectator chose to see
  // everything, a newcomer would simply be handed the solution.
  if (seats.some((s) => s.waiting)) return false;
  return seats.every((s) => s.spectator);
}

function buildResults(room: Room): RoundResults | undefined {
  const round = room.round;
  if (!round) return undefined;

  const received: Record<string, number> = {};
  for (const id of round.activeSeatIds) received[id] = 0;
  for (const targets of Object.values(round.votes)) {
    for (const t of targets) received[t] = (received[t] ?? 0) + 1;
  }
  const nameOf = (id: string) => room.seats.find((s) => s.id === id)?.name ?? '?';

  const rows: ResultRow[] = round.activeSeatIds.map((seatId) => {
    const a = round.assignments[seatId];
    const seat = room.seats.find((s) => s.id === seatId);
    return {
      seatId,
      seatName: seat?.name ?? '?',
      characterName: a?.characterName ?? '?',
      characterImage: a?.characterImage,
      isImpostor: round.impostorSeatIds.includes(seatId),
      votesReceived: received[seatId] ?? 0,
      votedFor: (round.votes[seatId] ?? []).map(nameOf),
      points: round.points[seatId] ?? 0,
      totalScore: seat?.score ?? 0,
    };
  });

  return {
    topicName: round.topicName,
    realName: round.pair.realName,
    realImage: round.pair.realImage,
    impostorName: round.pair.impostorName,
    impostorImage: round.pair.impostorImage,
    similarities: round.pair.similarities,
    traps: round.pair.traps,
    rows,
    impostorSeatIds: round.impostorSeatIds,
  };
}

export function buildView(room: Room, device: Device): RoomView {
  const now = Date.now();
  const round = room.round;
  const gm = isGm(room, device);
  const mySeats = seatsOf(room, device.id).sort((a, b) => a.createdAt - b.createdAt);
  const mySeatIds = mySeats.map((s) => s.id);
  const spectating = isSpectatorDevice(room, device.id);
  const showEverything = room.phase === 'results' || (spectating && round !== null);

  const deviceOnline = new Map(room.devices.map((d) => [d.id, now - d.lastSeen < ONLINE_WINDOW_MS]));

  const seats: SeatPublic[] = room.seats
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((s) => ({
      id: s.id,
      name: s.name,
      deviceId: s.deviceId,
      waiting: s.waiting,
      online: s.deviceId ? deviceOnline.get(s.deviceId) === true : false,
      mine: s.deviceId === device.id,
      spectator: s.spectator,
      playNextRound: s.playNextRound,
      score: s.score,
      isGmSeat: s.deviceId === room.gmDeviceId,
      unclaimed: s.deviceId === null,
      revealed: round ? round.assignments[s.id]?.revealed === true : false,
      hasVoted: round ? Array.isArray(round.votes[s.id]) : false,
    }));

  const tally = topicTally(room);
  const topics: TopicMeta[] = allTopics(room)
    // Pending suggestions are only visible to the game master until approved.
    .filter((t) => t.approved !== false || gm)
    .map((t) => ({
      id: t.id,
      name: t.name,
      pairCount: t.pairs.length,
      custom: t.custom === true,
      votes: tally[t.id] ?? 0,
      proposedBy: t.proposedBy,
      pending: t.approved === false,
    }));

  const myTopicVotes: Record<string, string> = {};
  for (const id of mySeatIds) {
    if (room.topicVotes[id]) myTopicVotes[id] = room.topicVotes[id];
  }

  const myRoles: MyRole[] = [];
  const myVotes: Record<string, string[]> = {};
  // During the topic announcement nobody gets a role yet - not even their own.
  if (round && room.phase !== 'topicReveal') {
    for (const seat of mySeats) {
      const a = round.assignments[seat.id];
      if (!a) continue; // spectator this round
      myRoles.push({
        seatId: seat.id,
        seatName: seat.name,
        characterName: a.characterName,
        characterImage: a.characterImage,
        // Only tell the player they are the impostor if the setting says so.
        isImpostor:
          round.impostorsKnow || room.phase === 'results' ? a.isImpostor : undefined,
        revealed: a.revealed,
      });
      if (round.votes[seat.id]) myVotes[seat.id] = round.votes[seat.id];
    }
  }

  return {
    code: room.code,
    phase: room.phase,
    version: room.version,
    roundNumber: round?.n ?? room.roundCounter,
    isGm: gm,
    deviceId: device.id,
    mySeatIds,
    seats,
    topics,
    myTopicVotes,
    currentTopicId: room.currentTopicId,
    myRoles,
    myVotes,
    // Settings drive the discreet gear menu -> GM only (spectators may see them too).
    settings: gm || spectating ? { ...room.settings } : undefined,
    topicReveal:
      room.phase === 'topicReveal' && round
        ? {
            name: round.topicName,
            tally: round.topicTally,
            overridden: round.topicOverridden,
          }
        : undefined,
    results: showEverything ? buildResults(room) : undefined,
    spectating,
    deadline: room.deadline,
    reactions: pruneReactions(room),
    standings: room.phase === 'gameOver' ? standings(room) : undefined,
    targetReached: targetReached(room),
    activeCount: room.seats.filter((s) => s.playNextRound).length,
    spectatorCount: room.seats.filter((s) => !s.playNextRound && !s.waiting).length,
    waitingCount: room.seats.filter((s) => s.waiting).length,
  };
}

// ---------------------------------------------------------------------------
// Host screen (/host/CODE)
//
// Shown on a TV or laptop in the middle of the table, so it needs no token -
// and therefore must never contain a role. During the round it only knows the
// phase, the roster and the countdown. Once the round is resolved everyone in
// the room sees the resolution anyway, so it may show that too.
// ---------------------------------------------------------------------------

export interface HostView {
  code: string;
  phase: Room['phase'];
  roundNumber: number;
  seats: { id: string; name: string; score: number; spectator: boolean; waiting: boolean; revealed: boolean; hasVoted: boolean }[];
  topics: { id: string; name: string; votes: number }[];
  topicReveal?: RoomView['topicReveal'];
  results?: RoundResults;
  standings?: { seatId: string; seatName: string; score: number }[];
  deadline: number | null;
  reactions: RoomView['reactions'];
  impostorCount: number;
  waitingCount: number;
}

export function buildHostView(room: Room): HostView {
  const round = room.round;
  const tally = topicTally(room);
  return {
    code: room.code,
    phase: room.phase,
    roundNumber: round?.n ?? room.roundCounter,
    seats: room.seats
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((s) => ({
        id: s.id,
        name: s.name,
        score: s.score,
        spectator: s.spectator,
        waiting: s.waiting,
        revealed: round ? round.assignments[s.id]?.revealed === true : false,
        hasVoted: round ? Array.isArray(round.votes[s.id]) : false,
      })),
    topics: allTopics(room)
      .filter((t) => t.approved !== false)
      .map((t) => ({ id: t.id, name: t.name, votes: tally[t.id] ?? 0 })),
    topicReveal:
      room.phase === 'topicReveal' && round
        ? {
            name: round.topicName,
            tally: round.topicTally,
            overridden: round.topicOverridden,
          }
        : undefined,
    // Only after the round is over - never during it.
    results: room.phase === 'results' ? buildResults(room) : undefined,
    standings: room.phase === 'gameOver' ? standings(room) : undefined,
    deadline: room.deadline,
    reactions: pruneReactions(room),
    impostorCount: room.settings.impostorCount,
    waitingCount: room.seats.filter((s) => s.waiting).length,
  };
}
