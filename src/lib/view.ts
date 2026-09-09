import { allTopics, isGm, ONLINE_WINDOW_MS, seatsOf, topicTally } from './game';
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
  const topics: TopicMeta[] = allTopics(room).map((t) => ({
    id: t.id,
    name: t.name,
    pairCount: t.pairs.length,
    custom: t.custom === true,
    votes: tally[t.id] ?? 0,
  }));

  const myTopicVotes: Record<string, string> = {};
  for (const id of mySeatIds) {
    if (room.topicVotes[id]) myTopicVotes[id] = room.topicVotes[id];
  }

  const myRoles: MyRole[] = [];
  const myVotes: Record<string, string[]> = {};
  if (round) {
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
    mode: room.mode,
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
    results: showEverything ? buildResults(room) : undefined,
    spectating,
    activeCount: room.seats.filter((s) => s.playNextRound).length,
    spectatorCount: room.seats.filter((s) => !s.playNextRound).length,
  };
}
