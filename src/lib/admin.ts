import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

// Admin access.
//
// One password, set as an environment variable - no user accounts, no password
// storage, nothing to leak. The session is a signed cookie, so there is no
// server-side session store to keep in Redis either.

export const ADMIN_COOKIE = 'impostor_admin';
const SESSION_HOURS = 12;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
}

function secret(): string {
  // Derived from the password unless an explicit secret is set. Changing the
  // password therefore invalidates every existing session, which is what you
  // want if you changed it because it leaked.
  return process.env.ADMIN_SESSION_SECRET || `impostor:${process.env.ADMIN_PASSWORD ?? ''}`;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** Constant-time compare so the password cannot be guessed byte by byte. */
export function passwordMatches(given: unknown): boolean {
  if (!adminConfigured() || typeof given !== 'string') return false;
  const expected = Buffer.from(process.env.ADMIN_PASSWORD!, 'utf8');
  const actual = Buffer.from(given, 'utf8');
  // timingSafeEqual throws on length mismatch, so pad both to the same size.
  const size = Math.max(expected.length, actual.length, 32);
  const a = Buffer.alloc(size);
  const b = Buffer.alloc(size);
  expected.copy(a);
  actual.copy(b);
  return timingSafeEqual(a, b) && expected.length === actual.length;
}

export function issueSession(): { value: string; maxAge: number } {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  const nonce = randomBytes(8).toString('base64url');
  const payload = `${exp}.${nonce}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_HOURS * 3600 };
}

export function sessionValid(cookie: string | undefined): boolean {
  if (!cookie || !adminConfigured()) return false;
  const parts = cookie.split('.');
  if (parts.length !== 3) return false;
  const [exp, nonce, mac] = parts;
  const payload = `${exp}.${nonce}`;
  const expected = sign(payload);
  if (mac.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

export function isAdminRequest(req: NextRequest | Request): boolean {
  const raw = 'cookies' in req ? (req as NextRequest).cookies.get(ADMIN_COOKIE)?.value : undefined;
  if (raw !== undefined) return sessionValid(raw);
  // Plain Request: parse the header ourselves.
  const header = req.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return sessionValid(match?.[1]);
}
