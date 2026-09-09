import { NextResponse } from 'next/server';
import {
  addReaction,
  addSeat,
  castVote,
  endGame,
  cleanName,
  deviceByToken,
  everyoneVoted,
  finishRound,
  GameError,
  isGm,
  nextRound,
  removeDevice,
  restartGame,
  roundInProgress,
  seatsOf,
  startRound,
  topicById,
  topicVoteWinner,
  transferGm,
} from '@/lib/game';
import { deleteRoom, getRoom, withRoom } from '@/lib/store';
import { afterMutation } from '@/lib/tick';
import { recordRound, unregisterRoom } from '@/lib/registry';
import { hitLimit, LIMITS as RATE } from '@/lib/limits';
import { handleError, noStore, normalizeCode, readJson, TOKEN_HEADER } from '@/lib/http';
import { buildView } from '@/lib/view';
import { LIMITS, parseCustomTopic } from '@/lib/validateTopic';
import type { Device, Room } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function str(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v) throw new GameError(`Feld "${field}" fehlt.`);
  if (v.length > 300) throw new GameError(`Feld "${field}" ist zu lang.`);
  return v;
}

function requireGm(room: Room, device: Device) {
  if (!isGm(room, device)) throw new GameError('Nur der Gamemaster kann das tun.');
}

/** A seat the calling device is allowed to act for. */
function ownSeat(room: Room, device: Device, seatId: unknown) {
  const seat = room.seats.find((s) => s.id === seatId);
  if (!seat) throw new GameError('Spieler nicht gefunden.');
  if (seat.deviceId !== device.id) throw new GameError('Dieser Spieler gehört nicht zu diesem Gerät.');
  return seat;
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await ctx.params;
    const code = normalizeCode(rawCode);
    const body = await readJson(req);
    const token = req.headers.get(TOKEN_HEADER);
    const type = str(body.type, 'type');

    let leftRoom = false;
    let roomEmpty = false;
    let finished: Parameters<typeof recordRound>[0] | null = null;

    const { room, result } = await withRoom(code, (room) => {
      const device = deviceByToken(room, token);
      if (!device) throw new GameError('Nicht in diesem Raum angemeldet.');
      device.lastSeen = Date.now();

      const out = handle(room, device);
      // Whatever changed, the automatic clock has to match the new situation.
      afterMutation(room);
      return out;

      function handle(room: Room, device: Device) {
      switch (type) {
        // ---- seats -------------------------------------------------------
        case 'addSeat': {
          if (!isGm(room, device) && seatsOf(room, device.id).length >= 8) {
            throw new GameError('Maximal 8 Spieler pro Gerät.');
          }
          // Mid-round additions wait for the next round instead of being refused.
          addSeat(room, device.id, cleanName(body.name), roundInProgress(room));
          return {};
        }
        case 'renameSeat': {
          const seat = ownSeat(room, device, body.seatId);
          const name = cleanName(body.name);
          if (room.seats.some((s) => s.id !== seat.id && s.name.toLowerCase() === name.toLowerCase())) {
            throw new GameError(`"${name}" ist schon vergeben.`);
          }
          seat.name = name;
          return {};
        }
        case 'releaseSeat': {
          const seat = ownSeat(room, device, body.seatId);
          seat.deviceId = null;
          return {};
        }
        case 'claimSeat': {
          const seat = room.seats.find((s) => s.id === body.seatId);
          if (!seat) throw new GameError('Spieler nicht gefunden.');
          if (seat.deviceId !== null && seat.deviceId !== device.id) {
            throw new GameError(
              `"${seat.name}" wird gerade von einem anderen Gerät gespielt. Dieses Gerät muss den Platz erst freigeben.`,
            );
          }
          seat.deviceId = device.id;
          return {};
        }
        case 'removeSeat': {
          const seat = room.seats.find((s) => s.id === body.seatId);
          if (!seat) throw new GameError('Spieler nicht gefunden.');
          if (!isGm(room, device) && seat.deviceId !== device.id) {
            throw new GameError('Nur der Gamemaster kann fremde Spieler entfernen.');
          }
          if (room.phase !== 'lobby' && room.phase !== 'results' && !seat.waiting) {
            throw new GameError('Spieler können nur zwischen den Runden entfernt werden.');
          }
          room.seats = room.seats.filter((s) => s.id !== seat.id);
          delete room.topicVotes[seat.id];
          return {};
        }
        case 'setPlayNextRound': {
          const seat = isGm(room, device)
            ? room.seats.find((s) => s.id === body.seatId)
            : ownSeat(room, device, body.seatId);
          if (!seat) throw new GameError('Spieler nicht gefunden.');
          seat.playNextRound = body.value === true;
          if (room.phase === 'lobby' || room.phase === 'topicVote') {
            seat.spectator = !seat.playNextRound;
          }
          return {};
        }

        // ---- topic voting ------------------------------------------------
        case 'startTopicVote': {
          requireGm(room, device);
          room.phase = 'topicVote';
          room.round = null;
          room.topicVotes = {};
          room.currentTopicId = null;
          for (const s of room.seats) s.spectator = !s.playNextRound;
          return {};
        }
        case 'voteTopic': {
          if (room.phase !== 'topicVote') throw new GameError('Das Themen-Voting läuft gerade nicht.');
          const seat = ownSeat(room, device, body.seatId);
          const topicId = str(body.topicId, 'topicId');
          if (!topicById(room, topicId)) throw new GameError('Unbekanntes Thema.');
          room.topicVotes[seat.id] = topicId;
          return {};
        }
        case 'startRound': {
          requireGm(room, device);
          const chosen =
            typeof body.topicId === 'string' && body.topicId
              ? body.topicId
              : topicVoteWinner(room);
          if (!chosen) {
            throw new GameError(
              'Noch hat niemand für ein Thema gestimmt. Wähle unten selbst eines aus.',
            );
          }
          const winner = topicVoteWinner(room);
          startRound(room, chosen, Boolean(body.topicId) && chosen !== winner);
          return {};
        }

        // ---- round -------------------------------------------------------
        case 'revealCard': {
          const seat = ownSeat(room, device, body.seatId);
          const round = room.round;
          if (!round) throw new GameError('Es läuft gerade keine Runde.');
          const a = round.assignments[seat.id];
          if (!a) throw new GameError('Dieser Spieler ist in dieser Runde Zuschauer.');
          a.revealed = true;
          return {};
        }
        case 'startReveal': {
          requireGm(room, device);
          if (!room.round) throw new GameError('Es läuft gerade keine Runde.');
          room.phase = 'reveal';
          return {};
        }
        case 'startDiscussion': {
          requireGm(room, device);
          if (!room.round) throw new GameError('Es läuft gerade keine Runde.');
          room.phase = 'discussion';
          return {};
        }
        case 'startVoting': {
          requireGm(room, device);
          if (!room.round) throw new GameError('Es läuft gerade keine Runde.');
          room.phase = 'voting';
          return {};
        }
        case 'castVote': {
          const seat = ownSeat(room, device, body.seatId);
          const targets = Array.isArray(body.targets)
            ? body.targets.filter((t): t is string => typeof t === 'string')
            : [];
          castVote(room, seat.id, targets);
          return {};
        }
        case 'finishRound': {
          requireGm(room, device);
          finishRound(room);
          finished = historyEntry(room);
          return {};
        }
        case 'nextRound': {
          requireGm(room, device);
          nextRound(room);
          return {};
        }
        case 'backToLobby': {
          requireGm(room, device);
          room.phase = 'lobby';
          room.round = null;
          room.topicVotes = {};
          room.currentTopicId = null;
          return {};
        }

        case 'react': {
          const seat = ownSeat(room, device, body.seatId);
          addReaction(room, seat, str(body.emoji, 'emoji'));
          return {};
        }
        case 'endGame': {
          requireGm(room, device);
          endGame(room);
          return {};
        }
        case 'restartGame': {
          requireGm(room, device);
          restartGame(room);
          return {};
        }

        // ---- settings (discreet gear menu) --------------------------------
        case 'updateSettings': {
          requireGm(room, device);
          if (typeof body.impostorsKnow === 'boolean') {
            room.settings.impostorsKnow = body.impostorsKnow;
          }
          if (typeof body.proposalsNeedApproval === 'boolean') {
            room.settings.proposalsNeedApproval = body.proposalsNeedApproval;
          }
          if (typeof body.timerEnabled === 'boolean') {
            room.settings.timerEnabled = body.timerEnabled;
          }
          if (typeof body.discussionSec === 'number') {
            const n = Math.round(body.discussionSec);
            if (n < 15 || n > 600) throw new GameError('Diskussion: 15 bis 600 Sekunden.');
            room.settings.discussionSec = n;
          }
          if (typeof body.votingSec === 'number') {
            const n = Math.round(body.votingSec);
            if (n < 15 || n > 300) throw new GameError('Abstimmung: 15 bis 300 Sekunden.');
            room.settings.votingSec = n;
          }
          if (body.targetScore === null || typeof body.targetScore === 'number') {
            const n = body.targetScore === null ? null : Math.round(body.targetScore);
            if (n !== null && (n < 3 || n > 200)) {
              throw new GameError('Punkteziel: zwischen 3 und 200.');
            }
            room.settings.targetScore = n;
          }
          if (typeof body.impostorCount === 'number') {
            const n = Math.round(body.impostorCount);
            if (n < 1 || n > 3) throw new GameError('Zwischen 1 und 3 Impostor sind möglich.');
            room.settings.impostorCount = n;
          }
          return {};
        }

        // ---- game master ---------------------------------------------------
        case 'transferGm': {
          requireGm(room, device);
          const newGm = transferGm(
            room,
            typeof body.deviceId === 'string' ? body.deviceId : undefined,
          );
          return { newGm };
        }
        case 'leave': {
          removeDevice(
            room,
            device.id,
            typeof body.successorDeviceId === 'string' ? body.successorDeviceId : undefined,
          );
          leftRoom = true;
          roomEmpty = room.devices.length === 0;
          return {};
        }

        // ---- custom topics -------------------------------------------------
        case 'addCustomTopic': {
          if (hitLimit(req, RATE.customTopic)) {
            throw new GameError('Zu viele eigene Themen in kurzer Zeit.');
          }
          if (room.customTopics.length >= LIMITS.maxCustomTopicsPerRoom) {
            throw new GameError(
              `Maximal ${LIMITS.maxCustomTopicsPerRoom} eigene Themen pro Raum.`,
            );
          }
          const topic = parseCustomTopic(
            typeof body.json === 'string' ? body.json : '',
          );
          if (room.customTopics.some((t) => t.name.toLowerCase() === topic.name.toLowerCase())) {
            throw new GameError(`Ein Thema mit dem Namen "${topic.name}" gibt es in diesem Raum schon.`);
          }
          // The game master adds directly; everyone else makes a suggestion.
          if (!isGm(room, device)) {
            const mine = seatsOf(room, device.id);
            topic.proposedBy = mine[0]?.name ?? 'Gast';
            if (room.settings.proposalsNeedApproval) topic.approved = false;
          }
          room.customTopics.push(topic);
          return {
            topicId: topic.id,
            topicName: topic.name,
            pairCount: topic.pairs.length,
            pending: topic.approved === false,
          };
        }
        case 'approveCustomTopic': {
          requireGm(room, device);
          const id = str(body.topicId, 'topicId');
          const topic = room.customTopics.find((t) => t.id === id);
          if (!topic) throw new GameError('Thema nicht gefunden.');
          topic.approved = true;
          return {};
        }
        case 'removeCustomTopic': {
          requireGm(room, device);
          const id = str(body.topicId, 'topicId');
          room.customTopics = room.customTopics.filter((t) => t.id !== id);
          if (room.currentTopicId === id) room.currentTopicId = null;
          for (const [seatId, tid] of Object.entries(room.topicVotes)) {
            if (tid === id) delete room.topicVotes[seatId];
          }
          return {};
        }

        default:
          throw new GameError(`Unbekannte Aktion: ${type}`);
      }
      }
    });

    // Auto-advance: once every active seat has voted, resolve immediately.
    if (type === 'castVote') {
      await withRoom(code, (r) => {
        if (r.phase === 'voting' && everyoneVoted(r)) {
          finishRound(r);
          finished = historyEntry(r);
          afterMutation(r);
        }
        return {};
      });
    }
    if (finished) await recordRound(finished);

    if (leftRoom) {
      // Nobody is left in here - free it immediately instead of letting it
      // idle away its remaining TTL.
      if (roomEmpty) {
        await deleteRoom(code);
        await unregisterRoom(code);
      }
      return noStore(NextResponse.json({ ok: true, left: true }));
    }

    // Re-read so the returned view reflects a possible auto-advance.
    const fresh = type === 'castVote' ? (await getRoom(code)) ?? room : room;
    const device = deviceByToken(fresh, token);
    if (!device) return noStore(NextResponse.json({ ok: true, ...result }));

    return noStore(
      NextResponse.json({ ok: true, ...result, view: buildView(fresh, device) }),
    );
  } catch (e) {
    return handleError(e);
  }
}

/** Compact, retention-limited record of a finished round for the admin view. */
function historyEntry(room: Room) {
  const r = room.round;
  const nameOf = (id: string) => room.seats.find((s) => s.id === id)?.name ?? '?';
  return {
    at: Date.now(),
    code: room.code,
    round: r?.n ?? 0,
    topic: r?.topicName ?? '',
    players: (r?.activeSeatIds ?? []).map(nameOf),
    impostors: (r?.impostorSeatIds ?? []).map(nameOf),
    realName: r?.pair.realName ?? '',
    impostorName: r?.pair.impostorName ?? '',
  };
}
