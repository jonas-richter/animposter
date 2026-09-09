'use client';

import { useEffect, useState } from 'react';
import CharacterArt from './CharacterArt';

// Tap or swipe to flip. Always starts face-down when mounted or when
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
  const [touchY, setTouchY] = useState<number | null>(null);

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
        className={`rolecard${shown ? ' shown' : ''}`}
        onClick={reveal}
        onTouchStart={(e) => setTouchY(e.touches[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientY ?? null;
          if (touchY !== null && end !== null && Math.abs(end - touchY) > 40) reveal();
          setTouchY(null);
        }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && reveal()}
        role="button"
        tabIndex={0}
        aria-label={shown ? `Deine Karte: ${name}` : 'Karte aufdecken'}
      >
        <div className="inner">
          <div className="face back">
            <div>
              <div className="mark">🎭</div>
              <div className="hint">Antippen zum Aufdecken</div>
              <div className="tiny" style={{ marginTop: 6 }}>
                Schaut sonst jemand mit?
              </div>
            </div>
          </div>
          <div className="face front">
            <div className="art">
              <CharacterArt name={name} src={image} />
            </div>
            <div className="label">
              <span className="eyebrow">Dein Charakter</span>
              <div className="name">{name}</div>
            </div>
          </div>
        </div>
      </div>

      {shown && isImpostor === true && (
        <div className="verdict imp">🎭 Du bist Impostor. Tu so, als gehörtest du dazu.</div>
      )}
      {shown && isImpostor === false && (
        <div className="verdict crew">✅ Du bist echt. Finde die Fälschungen.</div>
      )}
    </div>
  );
}
