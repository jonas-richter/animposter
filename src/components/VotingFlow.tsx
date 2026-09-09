'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RoomView, SeatPublic } from '@/lib/types';

// Voting phase for one device. Same handoff logic as the reveal flow:
// several seats on one device vote one after another and cannot see each
// other's ballot.
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
  const votableSeats = useMemo(
    () =>
      view.seats.filter(
        (s) => view.mySeatIds.includes(s.id) && !s.spectator && !view.myVotes[s.id],
      ),
    [view],
  );
  const multi = view.mySeatIds.filter((id) => {
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

  const seat = votableSeats[Math.min(index, Math.max(votableSeats.length - 1, 0))];

  if (votableSeats.length === 0) {
    const done = view.seats.filter((s) => s.hasVoted && !s.spectator).length;
    const total = view.seats.filter((s) => !s.spectator).length;
    return (
      <div className="card stack center">
        <div style={{ fontSize: 40 }}>🗳️</div>
        <h2 style={{ margin: 0 }}>Stimme abgegeben</h2>
        <p className="muted" style={{ margin: 0 }}>
          {done} von {total} haben gewählt.
        </p>
        <div className="progress">
          <div style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>
    );
  }

  if (stage === 'handoff') {
    return (
      <div className="stack">
        <div className="handoff">
          <div>
            <div className="muted" style={{ letterSpacing: '0.16em', fontSize: 13 }}>
              HANDY WEITERGEBEN AN
            </div>
            <div className="who">{seat.name}</div>
            <p className="muted" style={{ margin: 0 }}>
              Noch {votableSeats.length} Stimme{votableSeats.length === 1 ? '' : 'n'} offen
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
    if (selected.length !== impostorCount) {
      setError(`Bitte genau ${impostorCount} Spieler auswählen.`);
      return;
    }
    try {
      await onVote(seat.id, selected);
      setSelected([]);
      setError('');
      if (votableSeats.length > 1) {
        setIndex(0);
        setStage(multi ? 'handoff' : 'ballot');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Abstimmen.');
    }
  }

  return (
    <div className="stack">
      <div className="card tight">
        <h2 style={{ margin: 0 }}>Wer sind die Impostor?</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {multi ? (
            <>
              Stimme von <strong>{seat.name}</strong> · genau {impostorCount} auswählen
            </>
          ) : (
            <>Wähle genau {impostorCount} Spieler aus.</>
          )}
        </p>
      </div>

      {error && <div className="banner err">{error}</div>}

      <div className="stack">
        {candidates.map((c) => (
          <button
            key={c.id}
            className={`select-target${selected.includes(c.id) ? ' sel' : ''}`}
            onClick={() => toggle(c.id)}
          >
            <span className="check">{selected.includes(c.id) ? '✓' : ''}</span>
            <span className="grow">{c.name}</span>
            {c.hasVoted && <span className="tag ok">gewählt</span>}
          </button>
        ))}
      </div>

      <button
        className="primary block"
        onClick={submit}
        disabled={busy || selected.length !== impostorCount}
      >
        {busy ? 'Sende …' : `Stimme abgeben (${selected.length}/${impostorCount})`}
      </button>
    </div>
  );
}
