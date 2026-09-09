'use client';

import type { RoomView } from './types';

// Browser-side helpers: session token storage + fetch wrappers.
// The token identifies THIS DEVICE in one room. Keeping it in localStorage is
// what makes reconnect work after a screen lock or an accidental reload.

const tokenKey = (code: string) => `impostor:token:${code}`;
const nameKey = 'impostor:lastName';
export const CUSTOM_TOPICS_KEY = 'impostor:myTopics';

export function saveToken(code: string, token: string) {
  try {
    localStorage.setItem(tokenKey(code), token);
  } catch {
    /* private mode - the session simply won't survive a reload */
  }
}

export function loadToken(code: string): string | null {
  try {
    return localStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

export function clearToken(code: string) {
  try {
    localStorage.removeItem(tokenKey(code));
  } catch {
    /* ignore */
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(nameKey, name);
  } catch {
    /* ignore */
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem(nameKey) ?? '';
  } catch {
    return '';
  }
}

export interface SavedTopic {
  name: string;
  json: string;
  addedAt: number;
}

export function loadSavedTopics(): SavedTopic[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TOPICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is SavedTopic =>
        !!t && typeof t.name === 'string' && typeof t.json === 'string',
    );
  } catch {
    return [];
  }
}

export function saveTopicLocally(topic: SavedTopic) {
  try {
    const all = loadSavedTopics().filter((t) => t.name !== topic.name);
    all.unshift(topic);
    localStorage.setItem(CUSTOM_TOPICS_KEY, JSON.stringify(all.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export function deleteSavedTopic(name: string) {
  try {
    localStorage.setItem(
      CUSTOM_TOPICS_KEY,
      JSON.stringify(loadSavedTopics().filter((t) => t.name !== name)),
    );
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {}

async function request<T>(url: string, init: RequestInit & { token?: string | null }): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers['x-impostor-token'] = init.token;
  const res = await fetch(url, { ...init, headers, cache: 'no-store' });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Serverfehler (${res.status}).`;
    throw new ApiError(msg);
  }
  return data as T;
}

export function createRoom(mode: 'single' | 'multi') {
  return request<{ code: string; token: string; deviceId: string }>('/api/room', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}

export function joinRoom(code: string, name: string | null, token: string | null) {
  return request<{ token: string; deviceId: string; view: RoomView }>(
    `/api/room/${encodeURIComponent(code)}/join`,
    { method: 'POST', body: JSON.stringify(name ? { name } : {}), token },
  );
}

export function fetchState(code: string, token: string, signal?: AbortSignal) {
  return request<{ view: RoomView }>(`/api/room/${encodeURIComponent(code)}/state`, {
    method: 'GET',
    token,
    signal,
  });
}

export function sendAction<T = Record<string, unknown>>(
  code: string,
  token: string,
  payload: Record<string, unknown>,
) {
  return request<{ ok: true; view?: RoomView } & T>(
    `/api/room/${encodeURIComponent(code)}/action`,
    { method: 'POST', token, body: JSON.stringify(payload) },
  );
}
