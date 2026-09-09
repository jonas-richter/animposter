'use client';

import { useState } from 'react';

// Renders a character image when a URL is available, otherwise a generated
// card (deterministic colours + monogram derived from the name).
// The generated card is also the fallback when a remote image fails to load,
// so a dead link never shows a broken-image icon.

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name
    .replace(/[()]/g, ' ')
    .split(/[\s.'’-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function GeneratedArt({ name }: { name: string }) {
  const h = hash(name);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  const seedA = (h >> 3) % 100;
  const seedB = (h >> 7) % 100;
  const gid = `g${h.toString(36)}`;

  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label={name}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 62% 30%)`} />
          <stop offset="100%" stopColor={`hsl(${hue2} 58% 14%)`} />
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#${gid})`} />
      <circle cx={40 + seedA * 2.2} cy={70 + seedB} r={110} fill={`hsl(${hue2} 70% 55%)`} opacity="0.16" />
      <circle cx={260 - seedB * 1.6} cy={330 - seedA} r={80} fill={`hsl(${hue} 80% 65%)`} opacity="0.14" />
      <g opacity="0.1" stroke="#fff" strokeWidth="1.5" fill="none">
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={-40 + i * 55} y1="420" x2={40 + i * 55} y2="-20" />
        ))}
      </g>
      <text
        x="150"
        y="215"
        textAnchor="middle"
        fontSize="120"
        fontWeight="800"
        fill="#fff"
        opacity="0.92"
        fontFamily="ui-rounded, -apple-system, Segoe UI, Roboto, sans-serif"
      >
        {initials(name)}
      </text>
    </svg>
  );
}

/**
 * Fandom images go through our own proxy so a player's browser never talks to
 * a third party. Anything else is left alone.
 */
export function proxied(src: string): string {
  return src.startsWith('https://static.wikia.nocookie.net/')
    ? `/api/img?u=${encodeURIComponent(src)}`
    : src;
}

export default function CharacterArt({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <GeneratedArt name={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={proxied(src)} alt={name} onError={() => setFailed(true)} loading="lazy" />
  );
}
