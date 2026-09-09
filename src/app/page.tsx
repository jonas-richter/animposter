'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createRoom, fetchHealth, saveToken } from '@/lib/client';

export default function HomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [storageBroken, setStorageBroken] = useState(false);

  // Warn loudly when rooms cannot survive between requests - otherwise players
  // just get thrown out with "Raum nicht gefunden" and nobody knows why.
  useEffect(() => {
    fetchHealth()
      .then((h) => setStorageBroken(!h.reliable))
      .catch(() => {});
  }, []);

  async function create() {
    setError('');
    setBusy(true);
    try {
      const res = await createRoom();
      saveToken(res.code, res.token);
      router.push(`/room/${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Raum konnte nicht erstellt werden.');
      setBusy(false);
    }
  }

  function join() {
    const code = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      setError('Der Raumcode hat 4 Zeichen.');
      return;
    }
    router.push(`/join/${code}`);
  }

  return (
    <main className="shell">
      <div style={{ marginTop: '9dvh' }}>
        <h1>Impostor</h1>
        <p className="lead" style={{ marginTop: 12 }}>
          Alle bekommen denselben Charakter — bis auf ein paar Fälschungen. Redet, hört genau hin,
          enttarnt sie.
        </p>
      </div>

      {storageBroken && (
        <div className="note warn">
          <strong>Kein Speicher verbunden.</strong> Räume verschwinden hier nach wenigen Sekunden
          wieder. In der README steht unter „Deployment“, wie du das mit drei Klicks behebst.
        </div>
      )}

      {error && <div className="note err">{error}</div>}

      <div className="spacer" />

      <button className="primary block" onClick={create} disabled={busy}>
        {busy ? 'Moment …' : 'Raum erstellen'}
      </button>

      <div className="panel stack">
        <span className="eyebrow">Oder beitreten</span>
        <input
          className="code-input"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          placeholder="CODE"
          value={joinCode}
          maxLength={8}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          aria-label="Raumcode"
        />
        <button className="block" onClick={join} disabled={joinCode.length < 4}>
          Beitreten
        </button>
      </div>

      <p className="tiny center">
        4–24 Spieler · ~5 Minuten pro Runde
        <br />
        Ein Handy pro Person — oder eins für mehrere, das geht auch.
      </p>
    </main>
  );
}
