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

  // Already have a session for this room? Walk straight back in.
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
      setError('Wie heißt du?');
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
      <div style={{ marginTop: '10dvh' }}>
        <span className="eyebrow">Raum {code}</span>
        <h1 style={{ fontSize: 'clamp(36px, 12vw, 52px)', marginTop: 6 }}>Mitspielen</h1>
      </div>

      {error && <div className="note err">{error}</div>}

      <div className="spacer" />

      <div className="panel stack">
        <span className="eyebrow">Dein Name</span>
        <input
          type="text"
          placeholder="z.B. Jonas"
          value={name}
          maxLength={24}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="primary block" onClick={submit} disabled={busy || !name.trim()}>
          {busy ? 'Trete bei …' : 'Los geht’s'}
        </button>
      </div>

      <p className="tiny center">
        Spielt jemand ohne Handy mit? Den Namen gleich in der Lobby ergänzen — dieses Handy zeigt
        die Karten dann nacheinander.
      </p>

      <div className="spacer" />
      <button className="quiet block" onClick={() => router.push('/')}>
        Abbrechen
      </button>
    </main>
  );
}
