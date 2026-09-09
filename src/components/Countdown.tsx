'use client';

import { useEffect, useState } from 'react';

/**
 * Countdown to a server-supplied deadline. The server stays the source of
 * truth; this only renders the remaining time between polls.
 */
export default function Countdown({
  deadline,
  total,
  label,
  big,
}: {
  deadline: number;
  total?: number;
  label?: string;
  big?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, deadline - now);
  const secs = Math.ceil(left / 1000);
  const pct = total && total > 0 ? Math.max(0, Math.min(1, left / (total * 1000))) : null;
  const urgent = secs <= 10;

  return (
    <div className={`countdown${big ? ' big' : ''}${urgent ? ' urgent' : ''}`}>
      {label && <span className="eyebrow">{label}</span>}
      <span className="clock">
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
      </span>
      {pct !== null && (
        <span className="bar">
          <i style={{ width: `${pct * 100}%` }} />
        </span>
      )}
    </div>
  );
}
