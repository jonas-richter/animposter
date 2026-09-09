'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createRoom, saveToken } from '@/lib/client';

export default function HomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');

  async function make(mode: 'single' | 'multi') {
    setError('');
    setBusy(mode);
    try {
      const res = await createRoom(mode);
      saveToken(res.code, res.token);
      router.push(`/room/${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Anlegen.');
      setBusy(null);
    }
  }

  function join() {
    const code = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      setError('Bitte den 4-stelligen Raumcode eingeben.');
      return;
    }
    router.push(`/join/${code}`);
  }

  return (
    <main className="shell">
      <div style={{ marginTop: '6dvh' }}>
        <div className="brand" style={{ fontSize: 15, letterSpacing: '0.3em' }}>
          PARTYSPIEL
        </div>
        <h1>Impostor</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Alle bekommen denselben Charakter aus einem Universum – bis auf zwei. Redet, hört genau
          hin und findet die Impostor.
        </p>
      </div>

      {error && <div className="banner err">{error}</div>}

      <div className="card stack">
        <h3>Neues Spiel</h3>
        <button
          className="primary block"
          onClick={() => make('multi')}
          disabled={busy !== null}
        >
          {busy === 'multi' ? 'Raum wird erstellt …' : '📱 Mehrere Handys (QR-Code)'}
        </button>
        <p className="muted" style={{ margin: 0 }}>
          Jeder scannt den QR-Code und spielt auf dem eigenen Handy. Ein Handy kann auch mehrere
          Spieler übernehmen.
        </p>
        <button className="block" onClick={() => make('single')} disabled={busy !== null}>
          {busy === 'single' ? 'Raum wird erstellt …' : '🤝 Ein Handy (herumreichen)'}
        </button>
        <p className="muted" style={{ margin: 0 }}>
          Alle spielen an diesem Gerät. Namen eintragen, dann wird das Handy reihum weitergegeben.
        </p>
      </div>

      <div className="card stack">
        <h3>Einem Raum beitreten</h3>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Raumcode, z.B. K7QM"
          value={joinCode}
          maxLength={8}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          style={{
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '0.3em',
            textAlign: 'center',
            fontSize: 22,
          }}
        />
        <button className="block" onClick={join}>
          Beitreten
        </button>
      </div>

      <div className="spacer" />
      <p className="muted center" style={{ fontSize: 13 }}>
        4–24 Spieler · ca. 5 Minuten pro Runde
      </p>
    </main>
  );
}
