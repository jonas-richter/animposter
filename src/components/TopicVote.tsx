'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RoomView } from '@/lib/types';

// Topic voting.
//
// One seat on this device  -> plain list, tap a topic. Nothing else.
// Several seats            -> one orb per player. Drag an orb onto a topic, or
//                             tap the orb and then the topic. Each player's
//                             vote counts separately instead of the device
//                             casting one vote for everybody.
export default function TopicVote({
  view,
  onVote,
  onApprove,
  onRemove,
}: {
  view: RoomView;
  onVote: (seatId: string, topicId: string) => void;
  onApprove: (topicId: string) => void;
  onRemove: (topicId: string) => void;
}) {
  const mySeats = useMemo(
    () =>
      view.seats.filter((s) => view.mySeatIds.includes(s.id) && s.playNextRound),
    [view],
  );
  const multi = mySeats.length > 1;

  const [active, setActive] = useState<string | null>(null);
  // Votes cast from this device but not yet echoed back by the server. Without
  // this, two quick taps race the poll and can both land on the same player.
  const cast = useRef<Set<string>>(new Set());
  const [drag, setDrag] = useState<{ seatId: string; x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasVoted = (id: string) => cast.current.has(id) || Boolean(view.myTopicVotes[id]);

  // Keep the active orb on the first player who has not voted yet.
  useEffect(() => {
    if (!multi) return;
    setActive((cur) => {
      if (cur !== null && !cast.current.has(cur)) return cur;
      return mySeats.find((s) => !hasVoted(s.id))?.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multi, mySeats, view.myTopicVotes]);

  // A fresh round means a fresh ballot.
  useEffect(() => {
    cast.current = new Set();
    setActive(null);
  }, [view.roundNumber, view.phase]);

  function topicUnder(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    const row = el?.closest?.('[data-topic]') as HTMLElement | null;
    return row?.dataset.topic ?? null;
  }

  function startDrag(seatId: string, e: React.PointerEvent) {
    if (!multi) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setActive(seatId);
    setDrag({ seatId, x: e.clientX, y: e.clientY });
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    setHovered(topicUnder(e.clientX, e.clientY));
  }

  function endDrag(e: React.PointerEvent) {
    if (!drag) return;
    const topicId = topicUnder(e.clientX, e.clientY);
    if (topicId) assign(drag.seatId, topicId);
    setDrag(null);
    setHovered(null);
  }

  function assign(seatId: string, topicId: string) {
    cast.current.add(seatId);
    onVote(seatId, topicId);
    setActive(mySeats.find((s) => s.id !== seatId && !hasVoted(s.id))?.id ?? null);
  }

  function pick(topicId: string) {
    if (!multi) {
      for (const s of mySeats) onVote(s.id, topicId);
      return;
    }
    // Prefer the selected orb; otherwise take the next player without a vote.
    const target =
      active && !cast.current.has(active)
        ? active
        : mySeats.find((s) => !hasVoted(s.id))?.id;
    if (target) assign(target, topicId);
  }

  const votedCount = mySeats.filter((s) => hasVoted(s.id)).length;

  return (
    <>
      <div>
        <h2>Welches Universum?</h2>
        <p className="muted" style={{ margin: '2px 0 0' }}>
          {multi
            ? `Zieh jeden Spieler auf ein Thema — oder antippen. ${votedCount}/${mySeats.length} vergeben.`
            : 'Tipp auf ein Thema.'}
        </p>
      </div>

      {multi && (
        <div className="orbs">
          {mySeats.map((s) => {
            const votedFor = view.myTopicVotes[s.id];
            const done = hasVoted(s.id);
            const topic = view.topics.find((t) => t.id === votedFor);
            return (
              <button
                key={s.id}
                className={`orb${active === s.id ? ' active' : ''}${done ? ' done' : ''}${
                  drag?.seatId === s.id ? ' dragging' : ''
                }`}
                onPointerDown={(e) => startDrag(s.id, e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={() => {
                  setDrag(null);
                  setHovered(null);
                }}
                onClick={() => setActive(s.id)}
                title={topic ? `${s.name} → ${topic.name}` : s.name}
                aria-label={topic ? `${s.name}, gewählt: ${topic.name}` : `${s.name}, offen`}
              >
                <span className="orb-face">{initials(s.name)}</span>
                <span className="orb-name">{s.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="stack" ref={listRef}>
        {view.topics.map((t) => {
          const mine = Object.entries(view.myTopicVotes)
            .filter(([, tid]) => tid === t.id)
            .map(([seatId]) => view.seats.find((s) => s.id === seatId)?.name)
            .filter(Boolean) as string[];
          return (
            <button
              key={t.id}
              data-topic={t.id}
              className={`select-target${mine.length ? ' sel' : ''}${
                hovered === t.id ? ' hover-drop' : ''
              }`}
              onClick={() => pick(t.id)}
            >
              <span className="check">✓</span>
              <span className="grow">
                {t.name}
                {t.proposedBy && (
                  <span className="tiny" style={{ display: 'block', fontWeight: 500 }}>
                    Vorschlag von {t.proposedBy}
                    {t.pending && ' · wartet auf Freigabe'}
                  </span>
                )}
              </span>
              {view.isGm && t.pending && (
                <span
                  className="chip"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(t.id);
                  }}
                >
                  Freigeben
                </span>
              )}
              {view.isGm && t.proposedBy && (
                <span
                  className="chip danger"
                  role="button"
                  tabIndex={0}
                  aria-label={`${t.name} entfernen`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(t.id);
                  }}
                >
                  ✕
                </span>
              )}
              {multi && mine.length > 0 && (
                <span className="mini-orbs">
                  {mine.map((n) => (
                    <span key={n} className="mini-orb" style={{ background: hue(n) }}>
                      {initials(n)}
                    </span>
                  ))}
                </span>
              )}
              {t.votes > 0 && <span className="tally">{t.votes}</span>}
            </button>
          );
        })}
      </div>

      {drag && (
        <span
          className="orb ghost"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          <span className="orb-face">
            {initials(view.seats.find((s) => s.id === drag.seatId)?.name ?? '')}
          </span>
        </span>
      )}
    </>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function hue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 72% 62%)`;
}
