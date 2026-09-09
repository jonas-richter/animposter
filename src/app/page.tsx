'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createRoom, fetchHealth, saveToken } from '@/lib/client';
import CodeScanner, { scannerSupported } from '@/components/CodeScanner';
import { proxied } from '@/components/CharacterArt';

// A few real characters for the hero stack. Hardcoded rather than imported from
// the library so the landing page does not pull the whole 80-pair file into the
// client bundle.
const HERO = [
  {
    name: 'Zoro',
    src: 'https://static.wikia.nocookie.net/onepiece/images/5/52/Roronoa_Zoro_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/300',
  },
  {
    name: 'Gojo',
    src: 'https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ef/Satoru_Gojo_%28Anime_2%29.png/revision/latest/scale-to-width-down/300',
  },
  {
    name: 'Levi',
    src: 'https://static.wikia.nocookie.net/shingekinokyojin/images/9/94/Levi_Ackerman_character_image.png/revision/latest/scale-to-width-down/300',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [storageBroken, setStorageBroken] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [canScan, setCanScan] = useState(false);

  useEffect(() => {
    setCanScan(scannerSupported());
    fetchHealth()
      .then((h) => setStorageBroken(!h.reliable))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);

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

  function go(code: string) {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) {
      setError('Der Raumcode hat 4 Zeichen.');
      return;
    }
    router.push(`/join/${clean}`);
  }

  return (
    <main className="shell landing">
      <div className="hero">
        <div className="hero-cards" aria-hidden="true">
          {HERO.map((c, i) => (
            <span key={c.name} className={`hero-card c${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proxied(c.src)} alt="" loading="eager" />
            </span>
          ))}
          <span className="hero-card back">
            <span className="q">?</span>
          </span>
        </div>

        <h1>Impostor</h1>
        <p className="lead">
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

      <button className="grad primary block big" onClick={create} disabled={busy}>
        {busy ? 'Moment …' : 'Raum erstellen'}
      </button>

      <div className="panel stack">
        <span className="eyebrow">Oder beitreten</span>
        <div className="row">
          <input
            className="code-input grow"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            placeholder="CODE"
            value={joinCode}
            maxLength={8}
            onChange={(e) => {
              const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
              setJoinCode(next);
              // Room codes are exactly four characters - no reason to make
              // people reach for a second button.
              if (next.length === 4) setTimeout(() => go(next), 120);
            }}
            onKeyDown={(e) => e.key === 'Enter' && go(joinCode)}
            aria-label="Raumcode"
          />
          {canScan && (
            <button
              className="chip scan-btn"
              onClick={() => setScanOpen(true)}
              aria-label="QR-Code scannen"
              type="button"
            >
              📷
            </button>
          )}
        </div>
        <p className="tiny">
          {canScan
            ? 'Oder tippe auf die Kamera und scanne den QR-Code.'
            : 'Auf dem iPhone einfach die Kamera-App auf den QR-Code halten.'}
        </p>
      </div>

      <div className="spacer" />

      <div className="marquee" aria-hidden="true">
        <div>
          {[
            'One Piece',
            'Naruto',
            'Jujutsu Kaisen',
            'Attack on Titan',
            'Demon Slayer',
            'My Hero Academia',
            'Dragon Ball',
            'Death Note',
            'Harry Potter',
            'Marvel',
          ]
            .concat([
              'One Piece',
              'Naruto',
              'Jujutsu Kaisen',
              'Attack on Titan',
              'Demon Slayer',
            ])
            .map((t, i) => (
              <span key={i}>{t}</span>
            ))}
        </div>
      </div>

      <p className="tiny center">
        4–24 Spieler · ~5 Minuten pro Runde · 80 Charakterpaare
        <br />
        Ein Handy pro Person — oder eins für mehrere, das geht auch.
        <br />
        <a href="/datenschutz" className="footlink">
          Datenschutz
        </a>
      </p>

      {scanOpen && (
        <CodeScanner
          onClose={() => setScanOpen(false)}
          onCode={(code) => {
            setScanOpen(false);
            go(code);
          }}
        />
      )}
    </main>
  );
}
