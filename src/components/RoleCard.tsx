'use client';

import { useEffect, useState } from 'react';
import CharacterArt from './CharacterArt';

// Tap (or swipe) to reveal. Starts covered every time it is mounted or when the
// `resetKey` changes, so a card can never carry over to the next player.
export default function RoleCard({
  name,
  image,
  isImpostor,
  resetKey,
  onRevealed,
}: {
  name: string;
  image?: string;
  isImpostor?: boolean;
  resetKey: string;
  onRevealed?: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    setShown(false);
  }, [resetKey]);

  function reveal() {
    if (shown) return;
    setShown(true);
    onRevealed?.();
  }

  return (
    <div className="stack">
      <div
        className={`rolecard ${shown ? 'shown' : 'hidden-card'}`}
        onClick={reveal}
        onTouchStart={(e) => setTouchStart(e.touches[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientY ?? null;
          if (touchStart !== null && end !== null && Math.abs(end - touchStart) > 40) reveal();
          setTouchStart(null);
        }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && reveal()}
        role="button"
        tabIndex={0}
        aria-label={shown ? `Deine Karte: ${name}` : 'Karte aufdecken'}
      >
        <div className="front">
          <div className="art">
            <CharacterArt name={name} src={image} />
          </div>
          <div className="label">
            <div className="muted" style={{ fontSize: 13, letterSpacing: '0.12em' }}>
              DEIN CHARAKTER
            </div>
            <div className="name">{name}</div>
          </div>
        </div>
        <div className="back">
          <div className="eye">👁️</div>
          <div style={{ fontSize: 20, fontWeight: 750 }}>Antippen zum Aufdecken</div>
          <div className="muted">Achte darauf, dass niemand mitschaut.</div>
        </div>
      </div>

      {shown && isImpostor === true && (
        <div className="impostor-banner">🎭 Du bist ein IMPOSTOR. Tu so, als wärst du dabei.</div>
      )}
      {shown && isImpostor === false && (
        <div className="crew-banner">✅ Du bist kein Impostor. Finde die zwei Fälschungen.</div>
      )}
    </div>
  );
}
