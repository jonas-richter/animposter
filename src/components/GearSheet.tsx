'use client';

import { useState } from 'react';
import { Sheet, Toggle } from './ui';
import type { Settings } from '@/lib/types';

// The discreet gear menu. Only the game master sees the gear icon, and changing
// anything here produces NO visible reaction for the other players - the new
// values only take effect when the next round is dealt.
export default function GearSheet({
  settings,
  onClose,
  onChange,
}: {
  settings: Settings;
  onClose: () => void;
  onChange: (patch: Partial<Settings>) => Promise<void>;
}) {
  const [local, setLocal] = useState<Settings>(settings);
  const [error, setError] = useState('');

  async function apply(patch: Partial<Settings>) {
    const next = { ...local, ...patch };
    setLocal(next);
    setError('');
    try {
      await onChange(patch);
    } catch (e) {
      setLocal(settings);
      setError(e instanceof Error ? e.message : 'Konnte nicht gespeichert werden.');
    }
  }

  return (
    <Sheet title="Einstellungen" onClose={onClose}>
      <p className="muted" style={{ margin: 0 }}>
        Gilt ab der nächsten Runde. Die anderen Spieler bekommen von Änderungen nichts mit.
      </p>

      {error && <div className="banner err">{error}</div>}

      <Toggle
        label="Impostor wissen Bescheid"
        hint={
          local.impostorsKnow
            ? 'Die Impostor sehen auf ihrer Karte, dass sie Impostor sind.'
            : 'Niemand weiß, ob er Impostor ist – alle sehen nur ihren Charakter.'
        }
        value={local.impostorsKnow}
        onChange={(v) => apply({ impostorsKnow: v })}
      />

      <div className="card tight stack">
        <div style={{ fontWeight: 650 }}>Anzahl Impostor</div>
        <div className="row">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              className={`grow${local.impostorCount === n ? ' primary' : ''}`}
              onClick={() => apply({ impostorCount: n })}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Bestimmt auch, wie viele Stimmen jeder in der Abstimmung hat. Mindestens{' '}
          {local.impostorCount + 2} mitspielende Spieler nötig.
        </p>
      </div>

      <button className="block" onClick={onClose}>
        Fertig
      </button>
    </Sheet>
  );
}
