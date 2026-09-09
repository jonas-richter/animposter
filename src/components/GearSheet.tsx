'use client';

import { useState } from 'react';
import { Sheet, Stepper, Toggle } from './ui';
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

      <Toggle
        label="Vorschläge erst freigeben"
        hint={
          local.proposalsNeedApproval
            ? 'Themen von Mitspielern siehst nur du, bis du sie durchwinkst.'
            : 'Vorschläge sind sofort für alle wählbar.'
        }
        value={local.proposalsNeedApproval}
        onChange={(v) => apply({ proposalsNeedApproval: v })}
      />

      <Toggle
        label="Countdown"
        hint={
          local.timerEnabled
            ? 'Diskussion und Abstimmung laufen automatisch weiter.'
            : 'Du schaltest jede Phase selbst weiter.'
        }
        value={local.timerEnabled}
        onChange={(v) => apply({ timerEnabled: v })}
      />

      {local.timerEnabled && (
        <>
          <div className="panel tight stack">
            <span className="eyebrow">Diskussion · {local.discussionSec}s</span>
            <div className="row">
              {[60, 90, 120, 180].map((n) => (
                <button
                  key={n}
                  className={`grow chip${local.discussionSec === n ? ' grad primary' : ''}`}
                  onClick={() => apply({ discussionSec: n })}
                >
                  {n}s
                </button>
              ))}
            </div>
          </div>
          <div className="panel tight stack">
            <span className="eyebrow">Abstimmung · {local.votingSec}s</span>
            <div className="row">
              {[30, 45, 60, 90].map((n) => (
                <button
                  key={n}
                  className={`grow chip${local.votingSec === n ? ' grad primary' : ''}`}
                  onClick={() => apply({ votingSec: n })}
                >
                  {n}s
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="panel tight stack">
        <span className="eyebrow">
          Spielziel {local.targetScore ? `· ${local.targetScore} Punkte` : '· offen'}
        </span>
        {local.targetScore === null ? (
          <button className="block" onClick={() => apply({ targetScore: 15 })}>
            Punkteziel setzen
          </button>
        ) : (
          <>
            <Stepper
              value={local.targetScore}
              min={3}
              max={60}
              onChange={(v) => apply({ targetScore: v })}
            />
            <button className="quiet block" onClick={() => apply({ targetScore: null })}>
              Ohne Ziel spielen
            </button>
          </>
        )}
      </div>

      <button className="block" onClick={onClose}>
        Fertig
      </button>
    </Sheet>
  );
}
