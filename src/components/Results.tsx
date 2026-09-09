'use client';

import CharacterArt from './CharacterArt';
import type { RoundResults } from '@/lib/types';

export default function Results({
  results,
  spectatorPreview,
}: {
  results: RoundResults;
  spectatorPreview?: boolean;
}) {
  const impostors = results.rows.filter((r) => r.isImpostor);
  const ranked = [...results.rows].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="stack" style={{ gap: 16 }}>
      {spectatorPreview && (
        <div className="note info">👀 Zuschauer-Ansicht — du siehst alles. Nichts verraten!</div>
      )}

      <div className="panel stack">
        <span className="eyebrow">{results.topicName}</span>
        <div className="versus">
          <div className="face-card real">
            <div className="pic">
              <CharacterArt name={results.realName} src={results.realImage} />
            </div>
            <div className="nm">{results.realName}</div>
          </div>
          <span className="vs">VS</span>
          <div className="face-card imp">
            <div className="pic">
              <CharacterArt name={results.impostorName} src={results.impostorImage} />
            </div>
            <div className="nm">{results.impostorName}</div>
          </div>
        </div>
      </div>

      <div className="panel stack">
        <span className="eyebrow">Die Impostor waren</span>
        <div className="players">
          {impostors.map((r) => (
            <span key={r.seatId} className="chip-player">
              <span className="av" style={{ background: 'var(--danger)' }}>
                🎭
              </span>
              <span className="nm">{r.seatName}</span>
            </span>
          ))}
          {impostors.length === 0 && <span className="muted">—</span>}
        </div>
      </div>

      <div className="panel stack">
        <span className="eyebrow">Gemeinsamkeiten</span>
        <ul className="bullets">
          {results.similarities.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="panel stack">
        <span className="eyebrow">Stolpersteine</span>
        <ul className="bullets">
          {results.traps.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="stack">
        <span className="eyebrow">Runde im Detail</span>
        {results.rows.map((r) => (
          <div key={r.seatId} className={`rowline${r.isImpostor ? ' imp' : ''}`}>
            <div className="thumb">
              <CharacterArt name={r.characterName} src={r.characterImage} />
            </div>
            <div className="grow">
              <div style={{ fontWeight: 800 }}>
                {r.seatName} {r.isImpostor && <span className="badge imp">Impostor</span>}
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                {r.characterName}
              </div>
              <div className="tiny">
                {r.votesReceived} {r.votesReceived === 1 ? 'Stimme' : 'Stimmen'}
                {r.votedFor.length > 0 && <> · wählte {r.votedFor.join(' & ')}</>}
              </div>
            </div>
            <span className="pts">{r.points > 0 ? `+${r.points}` : '0'}</span>
          </div>
        ))}
      </div>

      <div className="stack">
        <span className="eyebrow">Gesamtstand</span>
        {ranked.map((r, i) => (
          <div key={r.seatId} className="rowline">
            <span className="rank">{i + 1}</span>
            <span className="grow" style={{ fontWeight: 700 }}>
              {r.seatName}
            </span>
            <span className="pts">{r.totalScore}</span>
          </div>
        ))}
        <p className="tiny">
          +2 pro richtig erkanntem Impostor · +3 für einen Impostor, der durchkommt.
        </p>
      </div>
    </div>
  );
}
