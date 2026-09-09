'use client';

import { useState } from 'react';
import { Sheet, Toggle } from './ui';
import type { Settings } from '@/lib/types';

// The discreet gear menu. Only the game master sees the icon, and changing
// anything here produces NO visible reaction for the other players - the new
// value only takes effect when the next round is dealt.
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
    setLocal({ ...local, ...patch });
    setError('');
    try {
      await onChange(patch);
    } catch (e) {
      setLocal(settings);
      setError(e instanceof Error ? e.message : 'Konnte nicht gespeichert werden.');
    }
  }

  return (
    <Sheet title="Geheime Einstellung" onClose={onClose}>
      <p className="tiny" style={{ margin: 0 }}>
        Gilt ab der nächsten Runde. Die anderen bekommen davon nichts mit.
      </p>

      {error && <div className="note err">{error}</div>}

      <Toggle
        label="Impostor wissen Bescheid"
        hint={
          local.impostorsKnow
            ? 'Impostor sehen auf ihrer Karte, dass sie Impostor sind.'
            : 'Niemand weiß es — alle sehen nur ihren Charakter. Deutlich gemeiner.'
        }
        value={local.impostorsKnow}
        onChange={(v) => apply({ impostorsKnow: v })}
      />

      <button className="block" onClick={onClose}>
        Fertig
      </button>
    </Sheet>
  );
}
