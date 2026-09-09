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
    <div className="stack">
      {spectatorPreview && (
        <div className="banner info">
          👀 Zuschauer-Ansicht: Du siehst alle Rollen. Bitte nichts verraten!
        </div>
      )}

      <div className="card stack">
        <h3>{results.topicName}</h3>
        <div className="row" style={{ alignItems: 'stretch', gap: 12 }}>
          <div className="grow stack" style={{ gap: 6 }}>
            <div className="avatar-sm" style={{ width: '100%', height: 110, borderRadius: 14 }}>
              <CharacterArt name={results.realName} src={results.realImage} />
            </div>
            <div className="tag ok" style={{ textAlign: 'center' }}>
              Mehrheit
            </div>
            <div style={{ fontWeight: 750 }}>{results.realName}</div>
          </div>
          <div className="grow stack" style={{ gap: 6 }}>
            <div className="avatar-sm" style={{ width: '100%', height: 110, borderRadius: 14 }}>
              <CharacterArt name={results.impostorName} src={results.impostorImage} />
            </div>
            <div className="tag imp" style={{ textAlign: 'center' }}>
              Impostor
            </div>
            <div style={{ fontWeight: 750 }}>{results.impostorName}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Gemeinsamkeiten</h3>
        <ul className="bullets">
          {results.similarities.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Stolpersteine</h3>
        <ul className="bullets">
          {results.traps.map((t, i) => (
            <li key={i}>⚠️ {t}</li>
          ))}
        </ul>
      </div>

      <div className="card stack">
        <h3>Die Impostor waren</h3>
        <div className="row wrap">
          {impostors.map((r) => (
            <span key={r.seatId} className="tag imp" style={{ fontSize: 15, padding: '6px 12px' }}>
              🎭 {r.seatName}
            </span>
          ))}
          {impostors.length === 0 && <span className="muted">—</span>}
        </div>
      </div>

      <div className="card stack">
        <h3>Runde im Detail</h3>
        <div className="scorelist">
          {results.rows.map((r) => (
            <div key={r.seatId} className={`scorerow${r.isImpostor ? ' imp' : ''}`}>
              <div className="avatar-sm">
                <CharacterArt name={r.characterName} src={r.characterImage} />
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {r.seatName} {r.isImpostor && <span className="tag imp">Impostor</span>}
                </div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {r.characterName}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {r.votesReceived} Stimme{r.votesReceived === 1 ? '' : 'n'} erhalten
                  {r.votedFor.length > 0 && <> · wählte {r.votedFor.join(' & ')}</>}
                </div>
              </div>
              <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                {r.points > 0 ? `+${r.points}` : '0'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h3>Gesamtstand</h3>
        <div className="scorelist">
          {ranked.map((r, i) => (
            <div key={r.seatId} className="scorerow">
              <div style={{ width: 26, fontWeight: 800, color: 'var(--muted)' }}>{i + 1}.</div>
              <div className="grow">{r.seatName}</div>
              <div style={{ fontWeight: 800 }}>{r.totalScore}</div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Punkte: +2 pro richtig erkanntem Impostor · +3 für einen Impostor, der nicht zu den
          Meistgewählten gehört.
        </p>
      </div>
    </div>
  );
}
