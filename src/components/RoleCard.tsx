'use client';

import { useEffect, useRef, useState } from 'react';
import CharacterArt from './CharacterArt';

// Tap or swipe to flip.
//
// The swipe is a real drag: the card follows your finger and turns as you pull,
// so you feel the flip instead of just triggering an animation. Let go past the
// halfway point and it snaps open; let go early and it falls back.
// Always starts face-down when mounted or when `resetKey` changes, so a card
// can never carry over to the next player.
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
  const [angle, setAngle] = useState<number | null>(null); // null = not dragging
  const startX = useRef(0);
  const width = useRef(1);
  const moved = useRef(false);

  useEffect(() => {
    setShown(false);
    setAngle(null);
  }, [resetKey]);

  function reveal() {
    if (shown) return;
    setShown(true);
    onRevealed?.();
  }

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (shown) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    width.current = e.currentTarget.clientWidth || 1;
    startX.current = e.clientX;
    moved.current = false;
    setAngle(0);
  }

  function move(e: React.PointerEvent) {
    if (angle === null || shown) return;
    const dx = Math.abs(e.clientX - startX.current);
    if (dx > 6) moved.current = true;
    setAngle(Math.min(180, (dx / width.current) * 220));
  }

  function up() {
    if (angle === null) return;
    const passed = angle > 70;
    setAngle(null);
    if (passed || !moved.current) reveal();
  }

  const dragging = angle !== null && !shown;

  return (
    <div className="stack">
      <div
        className={`rolecard${shown ? ' shown' : ''}${dragging ? ' dragging' : ''}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setAngle(null)}
        // Fallback for anything that dispatches a plain click (assistive tech,
        // desktop browsers without pointer events, automated tests).
        onClick={() => {
          if (!moved.current) reveal();
        }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && reveal()}
        role="button"
        tabIndex={0}
        aria-label={shown ? `Deine Karte: ${name}` : 'Karte aufdecken'}
      >
        <div
          className="inner"
          style={dragging ? { transform: `rotateY(${angle}deg)` } : undefined}
        >
          <div className="face back">
            <div>
              <div className="mark">🎭</div>
              <div className="hint">Aufdecken</div>
              <div className="swipe-hint">
                <span className="finger">👆</span> tippen oder wischen
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
        <div className="verdict imp pop">🎭 Du bist Impostor. Tu so, als gehörtest du dazu.</div>
      )}
      {shown && isImpostor === false && (
        <div className="verdict crew pop">✅ Du bist echt. Finde die Fälschungen.</div>
      )}
    </div>
  );
}
