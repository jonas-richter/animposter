'use client';

import { useEffect, useRef, useState } from 'react';
import type { HostView } from '@/lib/view';
import CharacterArt from './CharacterArt';
import Countdown from './Countdown';
import Podium from './Podium';
import { ReactionLayer } from './Reactions';
import { Avatar } from './ui';

// The shared screen: a TV or laptop in the middle of the table. Read-only, no
// token, and by construction it never receives a role while a round is running.

const POLL: Record<HostView['phase'], number> = {
  lobby: 2000,
  topicVote: 1500,
  topicReveal: 1200,
  reveal: 1500,
  discussion: 2000,
  voting: 1000,
  results: 2500,
  gameOver: 4000,
};

export default function HostScreen({ code }: { code: string }) {
  const [view, setView] = useState<HostView | null>(null);
  const [error, setError] = useState('');
  const phase = useRef<HostView['phase']>('lobby');
  const busy = useRef(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      if (stopped || busy.current || document.hidden) return schedule();
      busy.current = true;
      try {
        const res = await fetch(`/api/room/${code}/host`, { cache: 'no-store' });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Fehler');
        const data = (await res.json()) as { view: HostView };
        if (stopped) return;
        phase.current = data.view.phase;
        setView(data.view);
        setError('');
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : 'Verbindung verloren.');
      } finally {
        busy.current = false;
        schedule();
      }
    }
    function schedule() {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(tick, POLL[phase.current] ?? 2000);
    }
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [code]);

  // Keep the TV awake for the length of a game night.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    nav.wakeLock
      ?.request('screen')
      .then((l: typeof lock) => {
        lock = l;
      })
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  if (error && !view) {
    return (
      <main className="host">
        <div className="host-center">
          <h1 className="host-title">Impostor</h1>
          <p className="host-sub">{error}</p>
        </div>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="host">
        <div className="host-center">
          <p className="host-sub">Verbinde …</p>
        </div>
      </main>
    );
  }

  const playing = view.seats.filter((s) => !s.spectator && !s.waiting);
  const revealed = playing.filter((s) => s.revealed).length;
  const voted = playing.filter((s) => s.hasVoted).length;

  return (
    <main className="host">
      <header className="host-top">
        <span className="host-brand">Impostor</span>
        <span className="host-code">{code}</span>
      </header>

      {/* ------------------------------ LOBBY ------------------------------ */}
      {view.phase === 'lobby' && (
        <div className="host-center">
          <p className="host-sub">Beitreten unter</p>
          <div className="host-join">
            <div className="host-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr?code=${code}`} alt="" />
            </div>
            <div>
              <div className="host-bigcode">{code}</div>
              <p className="host-sub">Code auf der Startseite eingeben oder scannen</p>
            </div>
          </div>
          <HostRoster seats={view.seats} />
        </div>
      )}

      {/* ---------------------------- TOPIC VOTE --------------------------- */}
      {view.phase === 'topicVote' && (
        <div className="host-center">
          <h1 className="host-title">Welches Universum?</h1>
          <div className="host-topics">
            {[...view.topics]
              .sort((a, b) => b.votes - a.votes)
              .slice(0, 8)
              .map((t) => (
                <div key={t.id} className={`host-topic${t.votes > 0 ? ' has' : ''}`}>
                  <span className="grow">{t.name}</span>
                  {t.votes > 0 && <span className="n">{t.votes}</span>}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* --------------------------- TOPIC WINNER -------------------------- */}
      {view.phase === 'topicReveal' && view.topicReveal && (
        <div className="host-center">
          <p className="host-sub">
            {view.topicReveal.overridden ? 'Der Gamemaster hat entschieden' : 'Das Thema steht fest'}
          </p>
          <h1 className="host-title glow">{view.topicReveal.name}</h1>
          <HostConfetti seed={view.topicReveal.name + view.roundNumber} />
        </div>
      )}

      {/* ------------------------------ REVEAL ----------------------------- */}
      {view.phase === 'reveal' && (
        <div className="host-center">
          <h1 className="host-title">Karten anschauen</h1>
          <p className="host-sub">
            {revealed} von {playing.length} haben geschaut
          </p>
          <HostRoster seats={view.seats} markDone={(s) => s.revealed} />
        </div>
      )}

      {/* ---------------------------- DISCUSSION --------------------------- */}
      {view.phase === 'discussion' && (
        <div className="host-center">
          <h1 className="host-title">Redet!</h1>
          <p className="host-sub">Reihum ein Satz über euren Charakter</p>
          {view.deadline && <Countdown deadline={view.deadline} big />}
          <HostRoster seats={view.seats} />
        </div>
      )}

      {/* ------------------------------ VOTING ----------------------------- */}
      {view.phase === 'voting' && (
        <div className="host-center">
          <h1 className="host-title">Wer ist Impostor?</h1>
          <p className="host-sub">
            {voted} von {playing.length} haben gewählt · {view.impostorCount} Stimmen pro Person
          </p>
          {view.deadline && <Countdown deadline={view.deadline} big />}
          <HostRoster seats={view.seats} markDone={(s) => s.hasVoted} />
        </div>
      )}

      {/* ------------------------------ RESULTS ---------------------------- */}
      {view.phase === 'results' && view.results && (
        <div className="host-center wide">
          <div className="host-versus">
            <figure>
              <CharacterArt name={view.results.realName} src={view.results.realImage} />
              <figcaption>{view.results.realName}</figcaption>
            </figure>
            <span className="vs">VS</span>
            <figure className="imp">
              <CharacterArt name={view.results.impostorName} src={view.results.impostorImage} />
              <figcaption>{view.results.impostorName}</figcaption>
            </figure>
          </div>
          <p className="host-sub">Die Impostor waren</p>
          <h1 className="host-title glow">
            {view.results.rows
              .filter((r) => r.isImpostor)
              .map((r) => r.seatName)
              .join(' & ') || '—'}
          </h1>
          <div className="host-scores">
            {[...view.results.rows]
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((r, i) => (
                <div key={r.seatId} className="host-score">
                  <span className="rk">{i + 1}</span>
                  <Avatar name={r.seatName} />
                  <span className="grow">{r.seatName}</span>
                  {r.points > 0 && <span className="plus">+{r.points}</span>}
                  <span className="tot">{r.totalScore}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ----------------------------- GAME OVER --------------------------- */}
      {view.phase === 'gameOver' && view.standings && (
        <div className="host-center wide">
          <p className="host-sub">Endstand nach {view.roundNumber} Runden</p>
          <h1 className="host-title glow">{view.standings[0]?.seatName ?? '—'}</h1>
          <Podium standings={view.standings} big />
          <HostConfetti seed={`over-${view.roundNumber}`} />
        </div>
      )}

      {view.waitingCount > 0 && (
        <div className="host-waiting">{view.waitingCount} warten auf die nächste Runde</div>
      )}

      <ReactionLayer reactions={view.reactions} />
    </main>
  );
}

function HostRoster({
  seats,
  markDone,
}: {
  seats: HostView['seats'];
  markDone?: (s: HostView['seats'][number]) => boolean;
}) {
  const shown = seats.filter((s) => !s.waiting);
  if (shown.length === 0) return <p className="host-sub">Noch niemand da.</p>;
  return (
    <div className="host-roster">
      {shown.map((s) => {
        const done = markDone?.(s);
        return (
          <span
            key={s.id}
            className={`host-chip${done ? ' done' : ''}${s.spectator ? ' spec' : ''}`}
          >
            <Avatar name={s.name} />
            <span className="nm">{s.name}</span>
            {markDone && <span className="st">{done ? '✓' : '…'}</span>}
            {!markDone && s.score > 0 && <span className="st">{s.score}</span>}
          </span>
        );
      })}
    </div>
  );
}

function HostConfetti({ seed }: { seed: string }) {
  const colors = ['#7b5cff', '#ff5ca8', '#35e0a1', '#ffc24b', '#ffffff'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 90 }, (_, i) => (
        <span
          key={`${seed}-${i}`}
          style={
            {
              left: `${Math.random() * 100}%`,
              width: 8 + Math.random() * 8,
              height: 12 + Math.random() * 12,
              background: colors[i % colors.length],
              borderRadius: Math.random() > 0.75 ? '50%' : 2,
              animationDelay: `${Math.random()}s`,
              animationDuration: `${2.6 + Math.random() * 2}s`,
              '--drift': `${(Math.random() - 0.5) * 240}px`,
              '--spin': `${360 + Math.random() * 900}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
