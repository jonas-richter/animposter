'use client';

import { useEffect, useRef, useState } from 'react';
import CharacterArt from './CharacterArt';

// Tap or swipe to flip.
//
// The swipe is a real drag: the card follows your finger and turns as you pull.
// The gesture is horizontal and the element is `touch-action: pan-y`, so the
// browser keeps handling vertical scrolling while we own the horizontal axis -
// otherwise the page scroll fights every swipe on a phone.
//
// The impostor status lives INSIDE the card label, in the same neutral styling
// for both outcomes. A coloured banner would be readable from two seats away
// without reading a single word.
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
  const startY = useRef(0);
  const width = useRef(1);
  const moved = useRef(false);
  const axis = useRef<'none' | 'x' | 'y'>('none');

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
    width.current = e.currentTarget.clientWidth || 1;
    startX.current = e.clientX;
    startY.current = e.clientY;
    moved.current = false;
    axis.current = 'none';
    setAngle(0);
  }

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (angle === null || shown) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Decide once whether this gesture is a flip or a scroll, then stick to it.
    if (axis.current === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis.current === 'x') {
        // Take over the pointer so the flip survives leaving the element.
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
    }
    if (axis.current === 'y') return; // let the page scroll

    moved.current = true;
    setAngle(Math.min(180, (Math.abs(dx) / width.current) * 220));
  }

  function up() {
    if (angle === null) return;
    const passed = angle > 70;
    setAngle(null);
    axis.current = 'none';
    if (passed || !moved.current) reveal();
  }

  const dragging = angle !== null && !shown;

  return (
    <div
      className={`rolecard${shown ? ' shown' : ''}${dragging ? ' dragging' : ''}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        setAngle(null);
        axis.current = 'none';
      }}
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
      <div className="inner" style={dragging ? { transform: `rotateY(${angle}deg)` } : undefined}>
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
            {isImpostor !== undefined && (
              <div className="role-status">{isImpostor ? 'Impostor' : 'Kein Impostor'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
