'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { joinRoom, loadName, loadToken, saveName, saveToken } from '@/lib/client';

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params?.code ?? '').toString().toUpperCase();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  // If this device already has a token for the room, walk straight back in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setName(loadName());
      const token = loadToken(code);
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        await joinRoom(code, null, token);
        if (!cancelled) router.replace(`/room/${code}`);
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Bitte einen Namen eingeben.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await joinRoom(code, trimmed, loadToken(code));
      saveToken(code, res.token);
      saveName(trimmed);
      router.replace(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beitritt fehlgeschlagen.');
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="shell">
        <div className="spacer" />
        <p className="muted center">Verbinde …</p>
        <div className="spacer" />
      </main>
    );
  }

  return (
    <main className="shell">
      <div style={{ marginTop: '8dvh' }}>
        <div className="brand" style={{ fontSize: 15, letterSpacing: '0.3em' }}>
          RAUM {code}
        </div>
        <h1>Mitspielen</h1>
      </div>

      {error && <div className="banner err">{error}</div>}

      <div className="card stack">
        <h3>Dein Name</h3>
        <input
          type="text"
          placeholder="z.B. Jonas"
          value={name}
          maxLength={24}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="primary block" onClick={submit} disabled={busy}>
          {busy ? 'Trete bei …' : 'Beitreten'}
        </button>
        <p className="muted" style={{ margin: 0 }}>
          Weitere Spieler an diesem Handy kannst du gleich in der Lobby hinzufügen.
        </p>
      </div>

      <div className="spacer" />
      <button className="ghost block" onClick={() => router.push('/')}>
        Zurück
      </button>
    </main>
  );
}
