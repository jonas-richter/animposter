'use client';

import { useEffect, useRef, useState } from 'react';
import type { Reaction } from '@/lib/types';

export const REACTION_EMOJI = ['😂', '😮', '😭', '👏', '🤨', '🎭'];
const COOLDOWN_MS = 2500;

/**
 * Floating emotes. Each reaction from the server is drawn once and then
 * forgotten locally, so a reaction that is still inside the server's 6s window
 * does not restart its animation on every poll.
 */
export function ReactionLayer({ reactions }: { reactions: Reaction[] }) {
  const seen = useRef<Set<string>>(new Set());
  const [live, setLive] = useState<
    (Reaction & {
      x: number;
      dur: number;
      sway: number;
      dir: number;
      tilt: number;
      scale: number;
      rise: number;
    })[]
  >([]);

  useEffect(() => {
    const fresh = reactions.filter((r) => !seen.current.has(r.id));
    if (fresh.length === 0) return;
    for (const r of fresh) seen.current.add(r.id);
    // Live-stream style: each emote gets its own lane, sway width, direction,
    // tilt and size, so a burst of taps never looks like a marching column.
    const withPos = fresh.map((r) => ({
      ...r,
      x: 8 + Math.random() * 78,
      dur: 3800 + Math.random() * 1600,
      sway: 18 + Math.random() * 30,
      dir: Math.random() > 0.5 ? 1 : -1,
      tilt: (Math.random() - 0.5) * 14,
      scale: 0.9 + Math.random() * 0.35,
      rise: 34 + Math.random() * 16,
    }));
    setLive((cur) => [...cur, ...withPos].slice(-24));
    const timers = withPos.map((r) =>
      setTimeout(() => setLive((cur) => cur.filter((x) => x.id !== r.id)), r.dur + 200),
    );
    return () => timers.forEach(clearTimeout);
  }, [reactions]);

  if (live.length === 0) return null;
  return (
    <div className="reaction-layer" aria-hidden="true">
      {live.map((r) => (
        <span
          key={r.id}
          className="reaction"
          style={
            {
              left: `${r.x}%`,
              animationDuration: `${r.dur}ms`,
              '--sway': `${r.sway * r.dir}px`,
              '--tilt': `${r.tilt}deg`,
              '--scale': r.scale,
              '--rise': `${r.rise}vh`,
            } as React.CSSProperties
          }
        >
          <span className="emoji">{r.emoji}</span>
          <span className="who">{r.seatName}</span>
        </span>
      ))}
    </div>
  );
}

/** The emote buttons. Cooled down locally so the server rarely has to say no. */
export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  const [until, setUntil] = useState(0);
  const [, force] = useState(0);

  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(t);
  }, [until]);

  const cooling = until > Date.now();

  return (
    <div className="reaction-bar">
      {REACTION_EMOJI.map((e) => (
        <button
          key={e}
          className="react-btn"
          disabled={cooling}
          onClick={() => {
            setUntil(Date.now() + COOLDOWN_MS);
            onReact(e);
            if ('vibrate' in navigator) navigator.vibrate?.(12);
          }}
          aria-label={`Reaktion ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
