'use client';

import { useMemo } from 'react';
import type { RoomView } from '@/lib/types';

// The "and the winner is…" moment between voting and dealing the cards.
// Confetti is plain DOM: ~70 spans with randomised CSS variables, animated by a
// single keyframe. No canvas, no dependency, and it disappears on its own.

const COLORS = ['#7b5cff', '#ff5ca8', '#35e0a1', '#ffc24b', '#ffffff', '#5bc8ff'];

function Confetti({ seed }: { seed: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: `${seed}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.4 + Math.random() * 1.9,
        drift: (Math.random() - 0.5) * 160,
        spin: 360 + Math.random() * 900,
        color: COLORS[i % COLORS.length],
        width: 6 + Math.random() * 6,
        height: 9 + Math.random() * 10,
        round: Math.random() > 0.75,
      })),
    [seed],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={
            {
              left: `${p.left}%`,
              width: p.width,
              height: p.height,
              background: p.color,
              borderRadius: p.round ? '50%' : 2,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function TopicWinner({
  view,
  isGm,
  busy,
  onContinue,
}: {
  view: RoomView;
  isGm: boolean;
  busy: boolean;
  onContinue: () => void;
}) {
  const info = view.topicReveal;
  if (!info) return null;

  const total = info.tally.reduce((sum, t) => sum + t.votes, 0);
  const max = Math.max(1, ...info.tally.map((t) => t.votes));

  return (
    <>
      <Confetti seed={`${view.roundNumber}-${info.name}`} />

      <div className="winner">
        <span className="eyebrow">
          {info.overridden ? 'Der Gamemaster hat entschieden' : 'Das Thema steht fest'}
        </span>
        <div className="winner-name">{info.name}</div>
        {!info.overridden && total > 0 && (
          <p className="muted" style={{ margin: 0 }}>
            {info.tally[0]?.votes} von {total} Stimmen
          </p>
        )}
      </div>

      {info.tally.length > 0 && (
        <div className="panel stack">
          <span className="eyebrow">Abstimmung</span>
          {info.tally.map((t, i) => (
            <div key={t.name} className="bar-row">
              <span className="bar-name">{t.name}</span>
              <span className="bar-track">
                <span
                  className={`bar-fill${t.name === info.name ? ' win' : ''}`}
                  style={{ width: `${(t.votes / max) * 100}%`, animationDelay: `${i * 90}ms` }}
                />
              </span>
              <span className="bar-num">{t.votes}</span>
            </div>
          ))}
        </div>
      )}

      {isGm ? (
        <button className="grad go block" disabled={busy} onClick={onContinue}>
          Rollen austeilen
        </button>
      ) : (
        <p className="muted center">Gleich gibt’s die Karten …</p>
      )}
    </>
  );
}
