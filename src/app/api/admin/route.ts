import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  adminConfigured,
  isAdminRequest,
  issueSession,
  passwordMatches,
} from '@/lib/admin';
import { handleError, jsonError, noStore, readJson } from '@/lib/http';
import { hitLimit, LIMITS } from '@/lib/limits';
import {
  HISTORY_TTL_DAYS,
  listRoomCodes,
  readConfig,
  readGlobalTopics,
  readHistory,
  writeConfig,
  writeGlobalTopics,
} from '@/lib/registry';
import { getRoom, putRoom } from '@/lib/store';
import { addDevice } from '@/lib/game';
import type { Topic } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// One endpoint for the whole admin panel. Everything except `login` and
// `status` requires a valid session cookie.

export async function GET(req: Request) {
  try {
    const action = new URL(req.url).searchParams.get('action') ?? 'status';

    if (action === 'status') {
      return noStore(
        NextResponse.json({
          configured: adminConfigured(),
          authed: isAdminRequest(req),
          llmConfigured: Boolean(process.env.LLM_API_KEY),
          retentionDays: HISTORY_TTL_DAYS,
        }),
      );
    }

    if (!isAdminRequest(req)) return jsonError('Nicht angemeldet.', 401);

    if (action === 'overview') {
      const codes = await listRoomCodes();
      const rooms = [];
      for (const code of codes.slice(0, 40)) {
        const room = await getRoom(code);
        if (!room) continue;
        rooms.push({
          code: room.code,
          phase: room.phase,
          round: room.roundCounter,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          players: room.seats.map((s) => ({ name: s.name, score: s.score, waiting: s.waiting })),
          // Devices: country and user agent only - no IP is ever stored.
          devices: room.devices
            .filter((d) => !d.hidden)
            .map((d) => ({
              country: d.country || '??',
              userAgent: d.userAgent ?? '',
              lastSeen: d.lastSeen,
            })),
          hiddenWatchers: room.devices.filter((d) => d.hidden).length,
          customTopics: room.customTopics.map((t) => ({
            id: t.id,
            name: t.name,
            pairs: t.pairs.length,
            proposedBy: t.proposedBy ?? null,
          })),
        });
      }
      const [history, config, promoted] = await Promise.all([
        readHistory(),
        readConfig(),
        readGlobalTopics(),
      ]);
      return noStore(
        NextResponse.json({
          rooms,
          history: history.slice(0, 120),
          config,
          promoted: promoted.map((t) => ({ id: t.id, name: t.name, pairs: t.pairs.length })),
          retentionDays: HISTORY_TTL_DAYS,
        }),
      );
    }

    return jsonError('Unbekannte Aktion.', 400);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const action = String(body.action ?? '');

    if (action === 'login') {
      if (!adminConfigured()) {
        return jsonError('Kein Admin-Passwort gesetzt (ADMIN_PASSWORD).', 400);
      }
      if (hitLimit(req, LIMITS.adminLogin)) {
        return jsonError('Zu viele Versuche. Warte ein paar Minuten.', 429);
      }
      if (!passwordMatches(body.password)) return jsonError('Falsches Passwort.', 401);
      const session = issueSession();
      const res = noStore(NextResponse.json({ ok: true }));
      res.cookies.set(ADMIN_COOKIE, session.value, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: session.maxAge,
      });
      return res;
    }

    if (action === 'logout') {
      const res = noStore(NextResponse.json({ ok: true }));
      res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
      return res;
    }

    if (!isAdminRequest(req)) return jsonError('Nicht angemeldet.', 401);

    // Join a running room as an invisible observer. The device holds no seat,
    // so the normal spectator rules apply - it sees everything - but it is
    // filtered out of every player-facing list.
    if (action === 'watch') {
      const code = String(body.code ?? '').toUpperCase();
      const room = await getRoom(code);
      if (!room) return jsonError('Raum nicht gefunden.', 404);
      const device = addDevice(room, { hidden: true, country: '', userAgent: 'admin' });
      await putRoom(room);
      return noStore(NextResponse.json({ token: device.token, code }));
    }

    // Make a room-bound topic permanent for everybody.
    if (action === 'promote') {
      const code = String(body.code ?? '').toUpperCase();
      const topicId = String(body.topicId ?? '');
      const room = await getRoom(code);
      const topic = room?.customTopics.find((t) => t.id === topicId);
      if (!topic) return jsonError('Thema nicht gefunden.', 404);

      const promoted = await readGlobalTopics();
      if (promoted.some((t) => t.name.toLowerCase() === topic.name.toLowerCase())) {
        return jsonError('Ein Thema mit diesem Namen ist schon dauerhaft.', 400);
      }
      const clean: Topic = {
        ...topic,
        id: `global-${topic.id}`,
        custom: true,
        approved: true,
      };
      delete clean.proposedBy;
      await writeGlobalTopics([...promoted, clean]);
      return noStore(NextResponse.json({ ok: true, name: clean.name }));
    }

    if (action === 'demote') {
      const topicId = String(body.topicId ?? '');
      const promoted = await readGlobalTopics();
      await writeGlobalTopics(promoted.filter((t) => t.id !== topicId));
      return noStore(NextResponse.json({ ok: true }));
    }

    if (action === 'config') {
      const current = await readConfig();
      if (typeof body.llmForEveryone === 'boolean') current.llmForEveryone = body.llmForEveryone;
      await writeConfig(current);
      return noStore(NextResponse.json({ ok: true, config: current }));
    }

    return jsonError('Unbekannte Aktion.', 400);
  } catch (e) {
    return handleError(e);
  }
}
