'use client';

import { useCallback, useEffect, useState } from 'react';
import { saveToken } from '@/lib/client';

interface Status {
  configured: boolean;
  authed: boolean;
  llmConfigured: boolean;
  retentionDays: number;
}
interface RoomRow {
  code: string;
  phase: string;
  round: number;
  createdAt: number;
  updatedAt: number;
  players: { name: string; score: number; waiting: boolean }[];
  devices: { country: string; userAgent: string; lastSeen: number }[];
  hiddenWatchers: number;
  customTopics: { id: string; name: string; pairs: number; proposedBy: string | null }[];
}
interface HistoryRow {
  at: number;
  code: string;
  round: number;
  topic: string;
  players: string[];
  impostors: string[];
  realName: string;
  impostorName: string;
}
interface Overview {
  rooms: RoomRow[];
  history: HistoryRow[];
  config: { llmForEveryone: boolean };
  promoted: { id: string; name: string; pairs: number }[];
  retentionDays: number;
}

const when = (t: number) =>
  new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** "Mozilla/5.0 (iPhone; …) …" -> "iPhone · Safari" */
function device(ua: string): string {
  if (!ua) return 'unbekannt';
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'anderes';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : '?';
  return `${os} · ${browser}`;
}

export default function AdminPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const st = await fetch('/api/admin?action=status', { cache: 'no-store' }).then((r) => r.json());
    setStatus(st);
    if (!st.authed) return setData(null);
    const res = await fetch('/api/admin?action=overview', { cache: 'no-store' });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Fehler');
      await load();
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
      throw e;
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <main className="shell">
        <div className="spacer" />
        <p className="muted center">Lade …</p>
        <div className="spacer" />
      </main>
    );
  }

  if (!status.configured) {
    return (
      <main className="shell">
        <div className="spacer" />
        <h1 style={{ fontSize: 40 }}>Admin</h1>
        <div className="note warn">
          Es ist kein Admin-Passwort gesetzt. Lege in Vercel die Umgebungsvariable{' '}
          <strong>ADMIN_PASSWORD</strong> an (mindestens 8 Zeichen) und deploye neu.
        </div>
        <div className="spacer" />
      </main>
    );
  }

  if (!status.authed) {
    return (
      <main className="shell">
        <div className="spacer" />
        <h1 style={{ fontSize: 40 }}>Admin</h1>
        {error && <div className="note err">{error}</div>}
        <div className="panel stack">
          <span className="eyebrow">Passwort</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && post({ action: 'login', password }).catch(() => {})}
          />
          <button
            className="grad primary block"
            disabled={busy || password.length < 4}
            onClick={() => post({ action: 'login', password }).catch(() => {})}
          >
            Anmelden
          </button>
        </div>
        <div className="spacer" />
      </main>
    );
  }

  return (
    <main className="shell admin">
      <header className="row">
        <h1 style={{ fontSize: 30 }} className="grow">
          Admin
        </h1>
        <button className="chip" onClick={() => post({ action: 'logout' })}>
          Abmelden
        </button>
      </header>

      {error && <div className="note err">{error}</div>}

      <div className="panel stack">
        <span className="eyebrow">Einstellungen</span>
        <button
          className="toggle"
          onClick={() => post({ action: 'config', llmForEveryone: !data?.config.llmForEveryone })}
          disabled={busy || !status.llmConfigured}
        >
          <span className="grow">
            <span style={{ display: 'block' }}>KI-Themen für alle</span>
            <span className="tiny" style={{ display: 'block', fontWeight: 400 }}>
              {!status.llmConfigured
                ? 'Kein LLM_API_KEY gesetzt — Funktion ist überall aus.'
                : data?.config.llmForEveryone
                  ? 'Jeder Spieler darf den Generator nutzen (begrenzt pro Gerät).'
                  : 'Nur du als angemeldeter Admin siehst den Generator.'}
            </span>
          </span>
          <span className={`switch${data?.config.llmForEveryone ? ' on' : ''}`} />
        </button>
        <p className="tiny">
          Verlauf und Geräteangaben werden nach {status.retentionDays} Tagen automatisch gelöscht.
          Gespeichert wird nur Land und Browser — nie die IP-Adresse.
        </p>
      </div>

      <div className="stack">
        <span className="eyebrow">Laufende Räume ({data?.rooms.length ?? 0})</span>
        {(data?.rooms.length ?? 0) === 0 && <p className="muted">Gerade nichts los.</p>}
        {data?.rooms.map((r) => (
          <div key={r.code} className="panel stack">
            <div className="row">
              <span className="code-pill grow">{r.code}</span>
              <span className="badge">{r.phase}</span>
              <button
                className="chip"
                onClick={() => setOpen(open === r.code ? null : r.code)}
                aria-expanded={open === r.code}
              >
                {open === r.code ? 'weniger' : 'mehr'}
              </button>
            </div>
            <p className="tiny" style={{ margin: 0 }}>
              Runde {r.round} · {r.players.length} Spieler · seit {when(r.createdAt)} · zuletzt{' '}
              {when(r.updatedAt)}
              {r.hiddenWatchers > 0 && ` · ${r.hiddenWatchers} unsichtbar dabei`}
            </p>
            <div className="players">
              {r.players.map((p) => (
                <span key={p.name} className="chip-player">
                  <span className="nm">{p.name}</span>
                  <span className="badge">{p.score}</span>
                </span>
              ))}
            </div>

            {open === r.code && (
              <>
                <span className="eyebrow">Geräte</span>
                {r.devices.map((d, i) => (
                  <div key={i} className="rowline">
                    <span className="badge">{d.country}</span>
                    <span className="grow tiny">{device(d.userAgent)}</span>
                    <span className="tiny">{when(d.lastSeen)}</span>
                  </div>
                ))}
                {r.customTopics.length > 0 && (
                  <>
                    <span className="eyebrow">Eigene Themen in diesem Raum</span>
                    {r.customTopics.map((t) => (
                      <div key={t.id} className="rowline">
                        <span className="grow">
                          {t.name} <span className="tiny">· {t.pairs} Paare</span>
                          {t.proposedBy && <span className="tiny"> · von {t.proposedBy}</span>}
                        </span>
                        <button
                          className="chip"
                          disabled={busy}
                          onClick={() => post({ action: 'promote', code: r.code, topicId: t.id })}
                        >
                          dauerhaft
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            <div className="row">
              <a className="chip grow" href={`/host/${r.code}`} target="_blank" rel="noreferrer">
                TV-Ansicht
              </a>
              <button
                className="chip grow"
                disabled={busy}
                onClick={async () => {
                  const res = await post({ action: 'watch', code: r.code });
                  saveToken(r.code, res.token);
                  window.open(`/room/${r.code}`, '_blank');
                }}
              >
                👁 Unsichtbar zuschauen
              </button>
            </div>
          </div>
        ))}
      </div>

      {(data?.promoted.length ?? 0) > 0 && (
        <div className="stack">
          <span className="eyebrow">Dauerhafte Themen</span>
          {data?.promoted.map((t) => (
            <div key={t.id} className="rowline">
              <span className="grow">
                {t.name} <span className="tiny">· {t.pairs} Paare</span>
              </span>
              <button
                className="chip danger"
                disabled={busy}
                onClick={() => post({ action: 'demote', topicId: t.id })}
              >
                entfernen
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="stack">
        <span className="eyebrow">Verlauf ({data?.history.length ?? 0})</span>
        {(data?.history.length ?? 0) === 0 && <p className="muted">Noch keine Runden.</p>}
        {data?.history.map((h, i) => (
          <div key={i} className="rowline">
            <span className="grow">
              <span style={{ fontWeight: 700 }}>{h.topic}</span>{' '}
              <span className="tiny">
                · {h.realName} vs {h.impostorName}
              </span>
              <span className="tiny" style={{ display: 'block' }}>
                {h.code} · Runde {h.round} · {h.players.join(', ')} · Impostor:{' '}
                {h.impostors.join(' & ')}
              </span>
            </span>
            <span className="tiny">{when(h.at)}</span>
          </div>
        ))}
      </div>

      <div className="spacer" />
    </main>
  );
}
