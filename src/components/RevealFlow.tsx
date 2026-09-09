'use client';

import { useEffect, useState } from 'react';
import RoleCard from './RoleCard';
import type { MyRole } from '@/lib/types';

// Reveal phase for one device.
//  - exactly one seat  -> straight to the card, no extra screens at all
//  - several seats     -> handoff screen -> card -> "Gesehen" -> handoff -> ...
export default function RevealFlow({
  roles,
  roundNumber,
  onReveal,
  onDone,
}: {
  roles: MyRole[];
  roundNumber: number;
  onReveal: (seatId: string) => void;
  onDone: () => void;
}) {
  const multi = roles.length > 1;
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<'handoff' | 'card' | 'finished'>(
    multi ? 'handoff' : 'card',
  );

  useEffect(() => {
    setIndex(0);
    setStage(roles.length > 1 ? 'handoff' : 'card');
  }, [roundNumber, roles.length]);

  if (roles.length === 0) return null;
  const role = roles[Math.min(index, roles.length - 1)];

  // Once this device is through, the shared roster below is the status display -
  // no second "done" panel on top of it.
  if (stage === 'finished') return null;

  if (stage === 'handoff') {
    return (
      <div className="stack">
        <div className="handoff">
          <div>
            <div className="arrow">👉</div>
            <span className="eyebrow">Handy weitergeben an</span>
            <div className="who">{role.seatName}</div>
            <p className="tiny" style={{ margin: 0 }}>
              {index + 1} von {roles.length}
            </p>
          </div>
        </div>
        <button className="grad primary block" onClick={() => setStage('card')}>
          Ich bin {role.seatName} – Karte zeigen
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      {multi && (
        <div className="note info center">
          Karte von <strong>{role.seatName}</strong> ({index + 1}/{roles.length})
        </div>
      )}
      <RoleCard
        key={`${roundNumber}-${role.seatId}`}
        resetKey={`${roundNumber}-${role.seatId}`}
        name={role.characterName}
        image={role.characterImage}
        isImpostor={role.isImpostor}
        onRevealed={() => onReveal(role.seatId)}
      />
      {multi ? (
        <button
          className="grad primary block"
          onClick={() => {
            if (index + 1 < roles.length) {
              setIndex(index + 1);
              setStage('handoff');
            } else {
              setStage('finished');
              onDone();
            }
          }}
        >
          {index + 1 < roles.length ? 'Gesehen – weitergeben' : 'Gesehen – alle fertig'}
        </button>
      ) : (
        <p className="tiny center" style={{ margin: 0 }}>
          Merk dir deinen Charakter.
        </p>
      )}
    </div>
  );
}
