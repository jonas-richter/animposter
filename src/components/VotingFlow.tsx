'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RoomView, SeatPublic } from '@/lib/types';

// Voting for one device. Same handoff rule as the reveal flow: several seats on
// one device vote one after another and cannot see each other's ballot.
export default function VotingFlow({
  view,
  impostorCount,
  onVote,
  busy,
}: {
  view: RoomView;
  impostorCount: number;
  onVote: (seatId: string, targets: string[]) => Promise<void>;
  busy: boolean;
}) {
  const openSeats = useMemo(
    () =>
      view.seats.filter(
        (s) => view.mySeatIds.includes(s.id) && !s.spectator && !view.myVotes[s.id],
      ),
    [view],
  );
  const multi =
    view.mySeatIds.filter((id) => {
      const s = view.seats.find((x) => x.id === id);
      return s && !s.spectator;
    }).length > 1;

  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<'handoff' | 'ballot'>(multi ? 'handoff' : 'ballot');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setIndex(0);
    setSelected([]);
    setStage(multi ? 'handoff' : 'ballot');
  }, [multi, view.roundNumber]);

  if (openSeats.length === 0) {
    const done = view.seats.filter((s) => s.hasVoted && !s.spectator).length;
    const total = view.seats.filter((s) => !s.spectator).length;
    return (
      <div className="panel stack center">
        <div style={{ fontSize: 44 }}>🗳️</div>
        <h2>Stimme steht</h2>
        <p className="muted" style={{ margin: 0 }}>
          {done} von {total} sind durch.
        </p>
        <div className="progress">
          <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>
    );
  }

  const seat = openSeats[Math.min(index, openSeats.length - 1)];

  if (stage === 'handoff') {
    return (
      <div className="stack">
        <div className="handoff">
          <div>
            <div className="arrow">👉</div>
            <span className="eyebrow">Handy weitergeben an</span>
            <div className="who">{seat.name}</div>
            <p className="tiny" style={{ margin: 0 }}>
              Noch {openSeats.length} {openSeats.length === 1 ? 'Stimme' : 'Stimmen'} offen
            </p>
          </div>
        </div>
        <button className="primary block" onClick={() => setStage('ballot')}>
          Ich bin {seat.name} – abstimmen
        </button>
      </div>
    );
  }

  const candidates: SeatPublic[] = view.seats.filter((s) => !s.spectator && s.id !== seat.id);

  function toggle(id: string) {
    setError('');
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= impostorCount
          ? [...prev.slice(1), id]
          : [...prev, id],
    );
  }

  async function submit() {
    if (selected.length !== impostorCount) return;
    try {
      await onVote(seat.id, selected);
      setSelected([]);
      setError('');
      if (openSeats.length > 1) {
        setIndex(0);
        setStage(multi ? 'handoff' : 'ballot');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Abstimmen.');
    }
  }

  return (
    <div className="stack">
      <div>
        <h2>Wer ist Impostor?</h2>
        <p className="muted" style={{ margin: '2px 0 0' }}>
          {multi ? (
            <>
              Stimme von <strong>{seat.name}</strong> · {impostorCount} auswählen
            </>
          ) : (
            <>Wähle genau {impostorCount} {impostorCount === 1 ? 'Person' : 'Personen'}.</>
          )}
        </p>
      </div>

      {error && <div className="note err">{error}</div>}

      <div className="stack">
        {candidates.map((c) => (
          <button
            key={c.id}
            className={`select-target${selected.includes(c.id) ? ' sel' : ''}`}
            onClick={() => toggle(c.id)}
          >
            <span className="check">✓</span>
            <span className="grow">{c.name}</span>
            {c.hasVoted && <span className="badge ok">fertig</span>}
          </button>
        ))}
      </div>

      <button
        className="go block"
        onClick={submit}
        disabled={busy || selected.length !== impostorCount}
      >
        {busy ? 'Sende …' : `Abstimmen (${selected.length}/${impostorCount})`}
      </button>
    </div>
  );
}
