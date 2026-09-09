import { NextResponse } from 'next/server';
import {
  addSeat,
  castVote,
  cleanName,
  deviceByToken,
  everyoneVoted,
  finishRound,
  GameError,
  isGm,
  nextRound,
  removeDevice,
  seatsOf,
  startRound,
  topicById,
  topicVoteWinner,
  transferGm,
} from '@/lib/game';
import { getRoom, withRoom } from '@/lib/store';
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

    const { room, result } = await withRoom(code, (room) => {
      const device = deviceByToken(room, token);
      if (!device) throw new GameError('Nicht in diesem Raum angemeldet.');
      device.lastSeen = Date.now();

      switch (type) {
        // ---- seats -------------------------------------------------------
        case 'addSeat': {
          if (room.phase !== 'lobby' && room.phase !== 'topicVote' && room.phase !== 'results') {
            throw new GameError('Neue Spieler können erst zwischen den Runden dazukommen.');
          }
          if (room.mode === 'multi' && !isGm(room, device) && seatsOf(room, device.id).length >= 8) {
            throw new GameError('Maximal 8 Spieler pro Gerät.');
          }
          addSeat(room, device.id, cleanName(body.name));
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
          if (room.phase !== 'lobby' && room.phase !== 'results') {
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
          startRound(room, chosen);
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

        // ---- settings (discreet gear menu) --------------------------------
        case 'updateSettings': {
          requireGm(room, device);
          if (typeof body.impostorsKnow === 'boolean') {
            room.settings.impostorsKnow = body.impostorsKnow;
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
          return {};
        }

        // ---- custom topics -------------------------------------------------
        case 'addCustomTopic': {
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
          room.customTopics.push(topic);
          return { topicId: topic.id, topicName: topic.name, pairCount: topic.pairs.length };
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
    });

    // Auto-advance: once every active seat has voted, resolve immediately.
    if (type === 'castVote') {
      await withRoom(code, (r) => {
        if (r.phase === 'voting' && everyoneVoted(r)) finishRound(r);
        return {};
      });
    }

    if (leftRoom) {
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
