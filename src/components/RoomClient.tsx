'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearToken,
  fetchState,
  joinRoom,
  loadName,
  loadToken,
  saveToken,
  sendAction,
} from '@/lib/client';
import type { RoomView, SeatPublic } from '@/lib/types';
import RevealFlow from './RevealFlow';
import VotingFlow from './VotingFlow';
import Results from './Results';
import GearSheet from './GearSheet';
import CustomTopicSheet from './CustomTopicSheet';
import { Sheet, Toggle } from './ui';

const POLL_MS = 800;

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [fatal, setFatal] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [gearOpen, setGearOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [newSeatName, setNewSeatName] = useState('');
  const [overrideTopic, setOverrideTopic] = useState('');
  const [copied, setCopied] = useState(false);

  const polling = useRef(false);
  const bootstrapped = useRef(false);

  // --- session bootstrap ----------------------------------------------------
  // Runs exactly once per room: read the device token and re-attach. Guarded by
  // a ref so a re-render can never restart the handshake with a stale token.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const t = loadToken(code);
    if (!t) {
      router.replace(`/join/${code}`);
      return;
    }
    setToken(t);
    joinRoom(code, null, t)
      .then((res) => {
        saveToken(code, res.token);
        setView(res.view);
      })
      .catch((e) => {
        clearToken(code);
        setFatal(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // --- polling --------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    let stopped = false;

    async function tick() {
      if (stopped || polling.current || document.hidden) return;
      polling.current = true;
      try {
        const res = await fetchState(code, token!);
        if (!stopped) setView(res.view);
      } catch (e) {
        if (!stopped && e instanceof Error && /nicht gefunden|angemeldet/i.test(e.message)) {
          setFatal(e.message);
          stopped = true;
        }
      } finally {
        polling.current = false;
      }
    }

    const id = setInterval(tick, POLL_MS);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', onVisible);
    tick();
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [code, token]);

  const act = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!token) throw new Error('Keine Session.');
      setBusy(true);
      setError('');
      try {
        const res = await sendAction(code, token, payload);
        if (res.view) setView(res.view);
        return res;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Fehler.';
        setError(msg);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [code, token],
  );

  const safeAct = useCallback(
    (payload: Record<string, unknown>) => {
      act(payload).catch(() => {
        /* message already shown */
      });
    },
    [act],
  );

  const mySeats = useMemo<SeatPublic[]>(
    () => (view ? view.seats.filter((s) => view.mySeatIds.includes(s.id)) : []),
    [view],
  );
  const gmSeatOfMine = mySeats[0];

  // ---------------------------------------------------------------------------

  if (fatal) {
    return (
      <main className="shell">
        <div className="spacer" />
        <div className="banner err">{fatal}</div>
        <button className="primary block" onClick={() => router.push('/')}>
          Zur Startseite
        </button>
        <div className="spacer" />
      </main>
    );
  }

  if (!view) {
    return (
      <main className="shell">
        <div className="spacer" />
        <p className="muted center">Verbinde mit Raum {code} …</p>
        <div className="spacer" />
      </main>
    );
  }

  const impostorCount =
    view.settings?.impostorCount ??
    (view.results ? view.results.impostorSeatIds.length : 2);
  const activeSeats = view.seats.filter((s) => !s.spectator);
  const revealedCount = activeSeats.filter((s) => s.revealed).length;
  const votedCount = activeSeats.filter((s) => s.hasVoted).length;

  const phaseLabel: Record<RoomView['phase'], string> = {
    lobby: 'Lobby',
    topicVote: 'Themenwahl',
    reveal: 'Rollen ansehen',
    discussion: 'Diskussion',
    voting: 'Abstimmung',
    results: 'Auflösung',
  };

  async function shareLink() {
    const url = `${window.location.origin}/join/${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Impostor', text: `Raumcode ${code}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  }

  // ---------------------------------------------------------------------------
  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand grow">Impostor</span>
        <span className="muted" style={{ fontSize: 14 }}>
          {phaseLabel[view.phase]}
          {view.roundNumber > 0 &&
          ['reveal', 'discussion', 'voting', 'results'].includes(view.phase)
            ? ` · Runde ${view.roundNumber}`
            : ''}
        </span>
        {/* Discreet gear: game master only, opens without any visible side effect. */}
        {view.isGm && view.settings && (
          <button className="icon-btn" onClick={() => setGearOpen(true)} aria-label="Einstellungen">
            ⚙️
          </button>
        )}
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menü">
          ⋯
        </button>
      </header>

      {error && <div className="banner err">{error}</div>}

      {view.spectating && view.phase !== 'lobby' && view.phase !== 'results' && (
        <div className="banner info">
          👀 Du bist Zuschauer. Du siehst alles – auch wer Impostor ist. Bitte nichts verraten!
        </div>
      )}

      {/* ------------------------------- LOBBY ------------------------------ */}
      {view.phase === 'lobby' && (
        <>
          {view.mode === 'multi' && (
            <div className="card stack center">
              <h3>Raumcode</h3>
              <div className="code-pill" style={{ fontSize: 30, letterSpacing: '0.3em' }}>
                {code}
              </div>
              <div className="qr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/qr?code=${code}`} alt={`QR-Code für Raum ${code}`} />
              </div>
              <button className="block" onClick={shareLink}>
                {copied ? '✅ Link kopiert' : '🔗 Link teilen'}
              </button>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Scannen oder Code auf der Startseite eingeben.
              </p>
            </div>
          )}

          {view.mode === 'single' && (
            <div className="banner info">
              🤝 Ein-Gerät-Modus: Trage alle Mitspieler ein. Das Handy wird später reihum
              weitergegeben.
            </div>
          )}

          <div className="card stack">
            <h3>
              Spieler ({view.seats.length}) · {view.activeCount} spielen mit
            </h3>
            <SeatList
              view={view}
              onToggleSpectator={(seatId, play) =>
                safeAct({ type: 'setPlayNextRound', seatId, value: play })
              }
              onRemove={(seatId) => safeAct({ type: 'removeSeat', seatId })}
            />
            {view.seats.length === 0 && <p className="muted">Noch niemand da.</p>}
          </div>

          <div className="card stack">
            <h3>{view.mode === 'single' ? 'Spieler anlegen' : 'Weiterer Spieler an diesem Handy'}</h3>
            <div className="row">
              <input
                className="grow"
                type="text"
                placeholder="Name"
                value={newSeatName}
                maxLength={24}
                onChange={(e) => setNewSeatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSeatName.trim()) {
                    safeAct({ type: 'addSeat', name: newSeatName.trim() });
                    setNewSeatName('');
                  }
                }}
              />
              <button
                className="primary"
                disabled={!newSeatName.trim() || busy}
                onClick={() => {
                  safeAct({ type: 'addSeat', name: newSeatName.trim() });
                  setNewSeatName('');
                }}
              >
                +
              </button>
            </div>
            {view.mode === 'multi' && (
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Nur nötig, wenn mehrere Leute dieses Handy teilen. Dieses Gerät zeigt dann die
                Karten nacheinander mit Weitergabe-Screen.
              </p>
            )}
          </div>

          {view.isGm && (
            <div className="card stack">
              <h3>Gamemaster</h3>
              {view.mode === 'multi' && (
                <Toggle
                  label="Ich spiele mit"
                  hint={
                    mySeats.length > 0
                      ? `Du spielst als ${mySeats.map((s) => s.name).join(', ')}.`
                      : 'Du leitest nur und siehst alle Rollen.'
                  }
                  value={mySeats.length > 0}
                  onChange={(v) => {
                    if (v) {
                      safeAct({ type: 'addSeat', name: loadName() || 'Gamemaster' });
                    } else if (gmSeatOfMine) {
                      for (const s of mySeats) safeAct({ type: 'removeSeat', seatId: s.id });
                    }
                  }}
                />
              )}
              <button
                className="primary block"
                disabled={busy || view.activeCount < impostorCount + 2}
                onClick={() => safeAct({ type: 'startTopicVote' })}
              >
                Themen-Voting starten
              </button>
              {view.activeCount < impostorCount + 2 && (
                <p className="muted" style={{ margin: 0 }}>
                  Es werden mindestens {impostorCount + 2} mitspielende Spieler gebraucht (aktuell{' '}
                  {view.activeCount}).
                </p>
              )}
            </div>
          )}
          {!view.isGm && (
            <p className="muted center">Warten auf den Gamemaster …</p>
          )}
        </>
      )}

      {/* ---------------------------- TOPIC VOTE ---------------------------- */}
      {view.phase === 'topicVote' && (
        <>
          <div className="card tight">
            <h2 style={{ margin: 0 }}>Welches Universum?</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {Object.keys(view.myTopicVotes).length > 0
                ? 'Deine Stimme ist abgegeben – du kannst sie noch ändern.'
                : 'Stimme für ein Thema ab.'}
            </p>
          </div>

          <div className="stack">
            {view.topics.map((t) => {
              const mine = Object.values(view.myTopicVotes).includes(t.id);
              return (
                <button
                  key={t.id}
                  className={`select-target${mine ? ' sel' : ''}`}
                  onClick={() => {
                    for (const seatId of view.mySeatIds) {
                      safeAct({ type: 'voteTopic', seatId, topicId: t.id });
                    }
                  }}
                  disabled={view.mySeatIds.length === 0}
                >
                  <span className="check">{mine ? '✓' : ''}</span>
                  <span className="grow">
                    {t.name}
                    {t.custom && <span className="tag" style={{ marginLeft: 8 }}>eigen</span>}
                  </span>
                  <span className="muted">{t.votes > 0 ? `${t.votes} ×` : ''}</span>
                </button>
              );
            })}
          </div>

          <button className="ghost block" onClick={() => setTopicSheetOpen(true)}>
            ➕ Eigenes Thema hinzufügen
          </button>

          {view.isGm && (
            <div className="card stack">
              <h3>Runde starten</h3>
              <select
                value={overrideTopic}
                onChange={(e) => setOverrideTopic(e.target.value)}
                style={{
                  minHeight: 'var(--tap)',
                  borderRadius: 14,
                  border: '1px solid var(--line)',
                  background: '#0e1422',
                  color: 'var(--text)',
                  padding: '0 14px',
                  font: 'inherit',
                }}
              >
                <option value="">Ergebnis des Votings übernehmen</option>
                {view.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                className="primary block"
                disabled={busy}
                onClick={() =>
                  safeAct(
                    overrideTopic
                      ? { type: 'startRound', topicId: overrideTopic }
                      : { type: 'startRound' },
                  )
                }
              >
                🎲 Rollen verteilen
              </button>
              <button className="ghost block" onClick={() => safeAct({ type: 'backToLobby' })}>
                Zurück zur Lobby
              </button>
            </div>
          )}
        </>
      )}

      {/* ------------------------------ REVEAL ------------------------------ */}
      {view.phase === 'reveal' && (
        <>
          {view.myRoles.length > 0 ? (
            <RevealFlow
              roles={view.myRoles}
              roundNumber={view.roundNumber}
              onReveal={(seatId) => safeAct({ type: 'revealCard', seatId })}
              onDone={() => {}}
            />
          ) : view.results ? (
            <Results results={view.results} spectatorPreview />
          ) : (
            <p className="muted center">Du bist in dieser Runde Zuschauer.</p>
          )}

          <div className="card stack">
            <div className="row">
              <span className="grow muted">Karten gesehen</span>
              <strong>
                {revealedCount}/{activeSeats.length}
              </strong>
            </div>
            <div className="progress">
              <div
                style={{
                  width: `${activeSeats.length ? (revealedCount / activeSeats.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {view.isGm && (
            <button
              className="primary block"
              disabled={busy}
              onClick={() => safeAct({ type: 'startDiscussion' })}
            >
              💬 Diskussion starten
            </button>
          )}
        </>
      )}

      {/* ---------------------------- DISCUSSION ---------------------------- */}
      {view.phase === 'discussion' && (
        <>
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Redet!</h2>
            <p className="muted" style={{ margin: 0 }}>
              Reihum ein Satz über euren Charakter – vage genug, dass ein Impostor nicht sofort
              auffliegt, konkret genug, dass ihr etwas merkt.
            </p>
          </div>

          {view.myRoles.length > 0 && (
            <button className="block" onClick={() => setPeekOpen(true)}>
              🔍 Meine Karte nochmal ansehen
            </button>
          )}

          {view.spectating && view.results && <Results results={view.results} spectatorPreview />}

          {view.isGm && (
            <button
              className="primary block"
              disabled={busy}
              onClick={() => safeAct({ type: 'startVoting' })}
            >
              🗳️ Abstimmung starten
            </button>
          )}
        </>
      )}

      {/* ------------------------------ VOTING ------------------------------ */}
      {view.phase === 'voting' && (
        <>
          {view.mySeatIds.some((id) => !view.seats.find((s) => s.id === id)?.spectator) ? (
            <VotingFlow
              view={view}
              impostorCount={impostorCount}
              busy={busy}
              onVote={async (seatId, targets) => {
                await act({ type: 'castVote', seatId, targets });
              }}
            />
          ) : view.results ? (
            <Results results={view.results} spectatorPreview />
          ) : (
            <p className="muted center">Du bist Zuschauer – lehn dich zurück.</p>
          )}

          <div className="card stack">
            <h3>Wer hat schon gewählt?</h3>
            <div className="stack">
              {activeSeats.map((s) => (
                <div key={s.id} className="seat">
                  <span className={`dot ${s.hasVoted ? 'on' : 'off'}`} />
                  <span className="grow">{s.name}</span>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {s.hasVoted ? 'fertig' : 'wählt noch'}
                  </span>
                </div>
              ))}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Angezeigt wird nur <em>ob</em> jemand gewählt hat – nie für wen.
            </p>
          </div>

          {view.isGm && (
            <button
              className="block"
              disabled={busy || votedCount === 0}
              onClick={() => safeAct({ type: 'finishRound' })}
            >
              Jetzt auflösen ({votedCount}/{activeSeats.length} haben gewählt)
            </button>
          )}
        </>
      )}

      {/* ------------------------------ RESULTS ----------------------------- */}
      {view.phase === 'results' && view.results && (
        <>
          <Results results={view.results} />

          <div className="card stack">
            <h3>Nächste Runde</h3>
            <SeatList
              view={view}
              onToggleSpectator={(seatId, play) =>
                safeAct({ type: 'setPlayNextRound', seatId, value: play })
              }
              onRemove={(seatId) => safeAct({ type: 'removeSeat', seatId })}
            />
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Zuschauen? Schalte „spielt mit“ für dich aus. Zuschauer sehen ab dem Rundenstart alle
              Rollen.
            </p>
          </div>

          {view.isGm && (
            <>
              <button
                className="primary block"
                disabled={busy}
                onClick={() => safeAct({ type: 'nextRound' })}
              >
                ▶️ Nächste Runde
              </button>
              <button className="ghost block" onClick={() => safeAct({ type: 'backToLobby' })}>
                Zurück zur Lobby
              </button>
            </>
          )}
        </>
      )}

      <div className="spacer" />

      {/* ------------------------------ sheets ------------------------------ */}
      {gearOpen && view.settings && (
        <GearSheet
          settings={view.settings}
          onClose={() => setGearOpen(false)}
          onChange={async (patch) => {
            await act({ type: 'updateSettings', ...patch });
          }}
        />
      )}

      {topicSheetOpen && (
        <CustomTopicSheet
          topics={view.topics}
          isGm={view.isGm}
          onClose={() => setTopicSheetOpen(false)}
          onSubmit={async (json) => {
            const res = (await act({ type: 'addCustomTopic', json })) as unknown as {
              topicName: string;
              pairCount: number;
            };
            return res;
          }}
          onRemove={async (topicId) => {
            await act({ type: 'removeCustomTopic', topicId });
          }}
        />
      )}

      {peekOpen && (
        <Sheet title="Deine Karte" onClose={() => setPeekOpen(false)}>
          <RevealFlow
            roles={view.myRoles}
            roundNumber={view.roundNumber}
            onReveal={() => {}}
            onDone={() => setPeekOpen(false)}
          />
        </Sheet>
      )}

      {menuOpen && (
        <MenuSheet
          view={view}
          code={code}
          onClose={() => setMenuOpen(false)}
          onAction={safeAct}
          onOpenTopics={() => {
            setMenuOpen(false);
            setTopicSheetOpen(true);
          }}
          onLeave={() => {
            clearToken(code);
            router.push('/');
          }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------

function SeatList({
  view,
  onToggleSpectator,
  onRemove,
}: {
  view: RoomView;
  onToggleSpectator: (seatId: string, play: boolean) => void;
  onRemove: (seatId: string) => void;
}) {
  return (
    <div className="stack">
      {view.seats.map((s) => {
        const canControl = view.mySeatIds.includes(s.id) || view.isGm;
        return (
          <div key={s.id} className={`seat${view.mySeatIds.includes(s.id) ? ' me' : ''}`}>
            <span className={`dot ${s.online ? 'on' : 'off'}`} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 650 }}>{s.name}</span>
              {view.mySeatIds.includes(s.id) && (
                <span className="muted" style={{ fontSize: 13 }}>
                  {' '}
                  (dieses Gerät)
                </span>
              )}
            </span>
            {s.isGmSeat && <span className="tag gm">GM</span>}
            {s.unclaimed && <span className="tag">frei</span>}
            {!s.playNextRound && <span className="tag spec">Zuschauer</span>}
            {canControl && (
              <button
                className="small"
                onClick={() => onToggleSpectator(s.id, !s.playNextRound)}
                aria-label={`${s.name} ${s.playNextRound ? 'zuschauen lassen' : 'mitspielen lassen'}`}
              >
                {s.playNextRound ? '👀' : '🎮'}
              </button>
            )}
            {view.isGm && (view.phase === 'lobby' || view.phase === 'results') && (
              <button className="small danger" onClick={() => onRemove(s.id)} aria-label="Entfernen">
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MenuSheet({
  view,
  code,
  onClose,
  onAction,
  onOpenTopics,
  onLeave,
}: {
  view: RoomView;
  code: string;
  onClose: () => void;
  onAction: (p: Record<string, unknown>) => void;
  onOpenTopics: () => void;
  onLeave: () => void;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [successor, setSuccessor] = useState('');

  // Other devices in the room, labelled by the seats they hold.
  const otherDevices = useMemo(() => {
    const byDevice = new Map<string, string[]>();
    for (const s of view.seats) {
      if (!s.deviceId || s.deviceId === view.deviceId) continue;
      byDevice.set(s.deviceId, [...(byDevice.get(s.deviceId) ?? []), s.name]);
    }
    return [...byDevice.entries()].map(([deviceId, names]) => ({
      deviceId,
      label: names.join(', '),
    }));
  }, [view]);

  const freeSeats = view.seats.filter((s) => s.unclaimed);
  const mySeats = view.seats.filter((s) => view.mySeatIds.includes(s.id));

  return (
    <Sheet title={`Raum ${code}`} onClose={onClose}>
      <div className="stack">
        <button className="block" onClick={onOpenTopics}>
          &#10133; Eigenes Thema hinzufügen
        </button>

        {freeSeats.length > 0 && (
          <>
            <h3>Freie Plätze übernehmen</h3>
            {freeSeats.map((s) => (
              <button
                key={s.id}
                className="block"
                onClick={() => onAction({ type: 'claimSeat', seatId: s.id })}
              >
                {s.name} übernehmen
              </button>
            ))}
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Dieses Gerät zeigt die Karten aller übernommenen Spieler nacheinander, mit
              Weitergabe-Screen dazwischen.
            </p>
          </>
        )}

        {mySeats.length > 1 && (
          <>
            <h3>Spieler an diesem Gerät</h3>
            {mySeats.map((s) => (
              <div key={s.id} className="seat">
                <span className="grow">{s.name}</span>
                <button
                  className="small"
                  onClick={() => onAction({ type: 'releaseSeat', seatId: s.id })}
                >
                  freigeben
                </button>
              </div>
            ))}
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Freigegebene Plätze kann ein anderes Handy hier übernehmen.
            </p>
          </>
        )}

        {view.isGm && otherDevices.length > 0 && (
          <>
            <h3>Gamemaster übergeben</h3>
            {otherDevices.map((d) => (
              <button
                key={d.deviceId}
                className="block"
                onClick={() => {
                  onAction({ type: 'transferGm', deviceId: d.deviceId });
                  onClose();
                }}
              >
                An {d.label} übergeben
              </button>
            ))}
          </>
        )}

        <h3 style={{ marginTop: 8 }}>Raum verlassen</h3>
        {view.isGm && otherDevices.length > 0 && (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Du bist Gamemaster. Wähle einen Nachfolger – sonst wird zufällig jemand bestimmt.
            </p>
            <select
              value={successor}
              onChange={(e) => setSuccessor(e.target.value)}
              style={{
                minHeight: 'var(--tap)',
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: '#0e1422',
                color: 'var(--text)',
                padding: '0 14px',
                font: 'inherit',
              }}
            >
              <option value="">Zufällig bestimmen</option>
              {otherDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </>
        )}
        {!confirmLeave ? (
          <button className="danger block" onClick={() => setConfirmLeave(true)}>
            Raum verlassen
          </button>
        ) : (
          <button
            className="danger block"
            onClick={() => {
              onAction({ type: 'leave', successorDeviceId: successor || undefined });
              onLeave();
            }}
          >
            Wirklich verlassen?
          </button>
        )}
      </div>
    </Sheet>
  );
}
