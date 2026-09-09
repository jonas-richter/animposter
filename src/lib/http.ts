import { NextResponse } from 'next/server';
import { GameError } from './game';
import { TopicValidationError } from './validateTopic';

export const TOKEN_HEADER = 'x-impostor-token';

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof GameError || e instanceof TopicValidationError) {
    return jsonError(e.message, 400);
  }
  const msg = e instanceof Error ? e.message : 'Unbekannter Fehler.';
  if (msg === 'Raum nicht gefunden.') return jsonError(msg, 404);
  console.error('[impostor]', e);
  return jsonError(msg, 500);
}

export function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}

export function normalizeCode(raw: string): string {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    if (text.length > 300_000) throw new Error('Anfrage ist zu groß.');
    const data = JSON.parse(text);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    return data as Record<string, unknown>;
  } catch {
    throw new Error('Ungültige Anfrage.');
  }
}
