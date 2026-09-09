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
import TopicVote from './TopicVote';
import { Avatar, Sheet, Stepper } from './ui';

const POLL_MS = 800;
/** A room has to be missing this many polls in a row before we give up. */
const MISS_LIMIT = 6;

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [fatal, setFatal] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [gearOpen, setGearOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [newSeatName, setNewSeatName] = useState(() =>
    typeof window === 'undefined' ? '' : loadName(),
  );
  const [overrideTopic, setOverrideTopic] = useState('');
  const [copied, setCopied] = useState(false);

  const polling = useRef(false);
  const bootstrapped = useRef(false);
  const misses = useRef(0);

  // --- session bootstrap (once per room) -----------------------------------
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const t = loadToken(code);
    if (!t) {
      router.replace(`/join/${code}`);
      return;
    }
    setToken(t);

    // Retry a few times: right after a room is created the very next request
    // can land on a cold instance, and mobile networks drop requests.
    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await joinRoom(code, null, t);
          saveToken(code, res.token);
          setView(res.view);
          return;
        } catch (e) {
          if (attempt === 3) {
            setFatal(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen.');
            return;
          }
          setReconnecting(true);
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // --- polling --------------------------------------------------------------
  // A single failed poll is not fatal: mobile networks drop requests, and a
  // serverless backend can answer from a cold instance. Only give up after
  // several misses in a row, and show a "reconnecting" hint meanwhile.
  useEffect(() => {
    if (!token) return;
    let stopped = false;

    async function tick() {
      if (stopped || polling.current || document.hidden) return;
      polling.current = true;
      try {
        const res = await fetchState(code, token!);
        if (stopped) return;
        misses.current = 0;
        setReconnecting(false);
        setView(res.view);
      } catch (e) {
        if (stopped) return;
        const msg = e instanceof Error ? e.message : '';
        if (/nicht gefunden|angemeldet/i.test(msg)) {
          misses.current += 1;
          setReconnecting(true);
          if (misses.current >= MISS_LIMIT) {
            setFatal(msg || 'Verbindung verloren.');
            stopped = true;
          }
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
        setError(e instanceof Error ? e.message : 'Fehler.');
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [code, token],
  );

  const safeAct = useCallback(
    (payload: Record<string, unknown>) => {
      act(payload).catch(() => {});
    },
    [act],
  );

  const mySeats = useMemo<SeatPublic[]>(
    () => (view ? view.seats.filter((s) => view.mySeatIds.includes(s.id)) : []),
    [view],
  );

  // -------------------------------------------------------------------------

  if (fatal) {
    return (
      <main className="shell">
        <div className="spacer" />
        <div className="note err">{fatal}</div>
        <p className="tiny center">
          Der Raum ist auf dem Server nicht mehr da. Wenn das ständig passiert, fehlt dem
          Deployment der Speicher — siehe README.
        </p>
        <button
          className="primary block"
          onClick={() => {
            clearToken(code);
            router.push('/');
          }}
        >
          Zur Startseite
        </button>
        <button
          className="quiet block"
          onClick={() => {
            misses.current = 0;
            setFatal('');
            bootstrapped.current = false;
            location.reload();
          }}
        >
          Nochmal versuchen
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
    view.settings?.impostorCount ?? (view.results ? view.results.impostorSeatIds.length : 2);
  const playing = view.seats.filter((s) => !s.spectator);
  const revealed = playing.filter((s) => s.revealed).length;
  const voted = playing.filter((s) => s.hasVoted).length;
  const minPlayers = impostorCount + 2;
  const canStart = view.activeCount >= minPlayers;

  const phaseLabel: Record<RoomView['phase'], string> = {
    lobby: 'Lobby',
    topicVote: 'Thema',
    reveal: 'Karten',
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
      /* cancelled */
    }
  }

  const inRound = ['reveal', 'discussion', 'voting', 'results'].includes(view.phase);

  return (
    <main className="shell">
      <header className="row">
        <span className="eyebrow grow">
          {phaseLabel[view.phase]}
          {inRound ? ` · Runde ${view.roundNumber}` : ` · ${code}`}
        </span>
        {view.isGm && view.settings && (
          <button className="icon-btn" onClick={() => setGearOpen(true)} aria-label="Einstellungen">
            ⚙︎
          </button>
        )}
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menü">
          ⋯
        </button>
      </header>

      {reconnecting && <div className="note warn">Verbindung wackelt — versuche es weiter …</div>}
      {error && <div className="note err">{error}</div>}

      {view.spectating && view.phase !== 'lobby' && view.phase !== 'results' && (
        <div className="note info">
          👀 Du schaust zu und siehst alles — auch wer Impostor ist. Nichts verraten!
        </div>
      )}

      {/* ------------------------------ LOBBY ------------------------------ */}
      {view.phase === 'lobby' && (
        <>
          <div className="panel stack center">
            <span className="eyebrow">Raumcode</span>
            <div className="code-hero">
              <span className="value">{code}</span>
            </div>
            <div className="qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr?code=${code}`} alt={`QR-Code für Raum ${code}`} />
            </div>
            <button className="block" onClick={shareLink}>
              {copied ? '✓ Link kopiert' : 'Link teilen'}
            </button>
          </div>

          <div className="stack">
            <span className="eyebrow">
              {view.seats.length} {view.seats.length === 1 ? 'Spieler' : 'Spieler'}
              {view.spectatorCount > 0 && ` · ${view.spectatorCount} schauen zu`}
            </span>
            <SeatChips view={view} onToggle={safeAct} onRemove={safeAct} />
            {view.seats.length === 0 ? (
              <p className="muted">Noch niemand da.</p>
            ) : (
              <p className="tiny">Auf einen Namen tippen = zuschauen statt mitspielen.</p>
            )}
          </div>

          <div className="panel stack">
            <span className="eyebrow">
              {mySeats.length === 0 ? 'Dein Name' : 'Ohne eigenes Handy dabei?'}
            </span>
            <div className="row">
              <input
                className="grow"
                type="text"
                placeholder={mySeats.length === 0 ? 'z.B. Jonas' : 'Name hinzufügen'}
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
                style={{ width: 62, padding: 0, fontSize: 26 }}
                disabled={!newSeatName.trim() || busy}
                onClick={() => {
                  safeAct({ type: 'addSeat', name: newSeatName.trim() });
                  setNewSeatName('');
                }}
                aria-label="Spieler hinzufügen"
              >
                +
              </button>
            </div>
            <p className="tiny">
              {mySeats.length === 0
                ? 'Ohne Namen leitest du nur und siehst alle Rollen.'
                : 'Diese Person spielt an deinem Handy mit. Bei der Rollenvergabe kommt dann automatisch ein Weitergabe-Screen dazwischen.'}
            </p>
          </div>

          {view.isGm && (
            <>
              <div className="panel stack">
                <span className="eyebrow">Wie viele Impostor?</span>
                <Stepper
                  value={impostorCount}
                  min={1}
                  max={3}
                  disabled={busy}
                  onChange={(v) => safeAct({ type: 'updateSettings', impostorCount: v })}
                />
                <p className="tiny">
                  So viele Stimmen hat auch jeder in der Abstimmung. Mindestens {minPlayers}{' '}
                  Mitspielende nötig.
                </p>
              </div>

              <button
                className="go block"
                disabled={busy || !canStart}
                onClick={() => safeAct({ type: 'startTopicVote' })}
              >
                {canStart ? 'Los geht’s' : `Noch ${minPlayers - view.activeCount} Spieler fehlen`}
              </button>
            </>
          )}
          {!view.isGm && <p className="muted center">Warten auf den Gamemaster …</p>}
        </>
      )}

      {/* ---------------------------- TOPIC VOTE --------------------------- */}
      {view.phase === 'topicVote' && (
        <>
          <TopicVote
            view={view}
            onVote={(seatId, topicId) => safeAct({ type: 'voteTopic', seatId, topicId })}
          />

          <button className="quiet block" onClick={() => setTopicSheetOpen(true)}>
            + Eigenes Thema
          </button>

          {view.isGm && (
            <div className="panel stack">
              <span className="eyebrow">Starten</span>
              <select value={overrideTopic} onChange={(e) => setOverrideTopic(e.target.value)}>
                <option value="">Ergebnis der Abstimmung nehmen</option>
                {view.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                className="go block"
                disabled={busy}
                onClick={() =>
                  safeAct(
                    overrideTopic
                      ? { type: 'startRound', topicId: overrideTopic }
                      : { type: 'startRound' },
                  )
                }
              >
                Rollen verteilen
              </button>
              <button className="quiet block" onClick={() => safeAct({ type: 'backToLobby' })}>
                Zurück zur Lobby
              </button>
            </div>
          )}
        </>
      )}

      {/* ------------------------------ REVEAL ----------------------------- */}
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
            <p className="muted center">Du schaust diese Runde zu.</p>
          )}

          <div className="panel stack">
            <div className="row">
              <span className="eyebrow grow">Karten gesehen</span>
              <strong>
                {revealed}/{playing.length}
              </strong>
            </div>
            <div className="progress">
              <i style={{ width: `${playing.length ? (revealed / playing.length) * 100 : 0}%` }} />
            </div>
          </div>

          {view.isGm && (
            <button
              className="go block"
              disabled={busy}
              onClick={() => safeAct({ type: 'startDiscussion' })}
            >
              Diskussion starten
            </button>
          )}
        </>
      )}

      {/* ---------------------------- DISCUSSION --------------------------- */}
      {view.phase === 'discussion' && (
        <>
          <div className="panel stack">
            <h2>Redet!</h2>
            <p className="muted" style={{ margin: 0 }}>
              Reihum ein Satz über euren Charakter. Vage genug, dass ein Impostor nicht sofort
              auffliegt — konkret genug, dass ihr etwas merkt.
            </p>
          </div>

          {view.myRoles.length > 0 && (
            <button className="block" onClick={() => setPeekOpen(true)}>
              Karte nochmal ansehen
            </button>
          )}

          {view.spectating && view.results && <Results results={view.results} spectatorPreview />}

          {view.isGm && (
            <button
              className="go block"
              disabled={busy}
              onClick={() => safeAct({ type: 'startVoting' })}
            >
              Abstimmung starten
            </button>
          )}
        </>
      )}

      {/* ------------------------------ VOTING ----------------------------- */}
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
            <p className="muted center">Du schaust zu — lehn dich zurück.</p>
          )}

          <div className="panel stack">
            <div className="row">
              <span className="eyebrow grow">Abgestimmt</span>
              <span className="dots">
                {playing.map((s) => (
                  <i key={s.id} className={s.hasVoted ? 'on' : ''} title={s.name} />
                ))}
              </span>
            </div>
            <p className="tiny">
              Sichtbar ist nur, <em>ob</em> jemand gewählt hat — nie für wen.
            </p>
          </div>

          {view.isGm && (
            <button
              className="block"
              disabled={busy || voted === 0}
              onClick={() => safeAct({ type: 'finishRound' })}
            >
              Jetzt auflösen ({voted}/{playing.length})
            </button>
          )}
        </>
      )}

      {/* ------------------------------ RESULTS ---------------------------- */}
      {view.phase === 'results' && view.results && (
        <>
          <Results results={view.results} />

          <div className="stack">
            <span className="eyebrow">Nächste Runde</span>
            <SeatChips view={view} onToggle={safeAct} onRemove={safeAct} />
            <p className="tiny">
              Antippen schaltet zwischen Mitspielen und Zuschauen um. Zuschauer sehen ab dem
              Rundenstart alle Rollen.
            </p>
          </div>

          {view.isGm && (
            <>
              <div className="panel stack">
                <span className="eyebrow">Impostor</span>
                <Stepper
                  value={impostorCount}
                  min={1}
                  max={3}
                  disabled={busy}
                  onChange={(v) => safeAct({ type: 'updateSettings', impostorCount: v })}
                />
              </div>
              <button
                className="go block"
                disabled={busy}
                onClick={() => safeAct({ type: 'nextRound' })}
              >
                Nächste Runde
              </button>
              <button className="quiet block" onClick={() => safeAct({ type: 'backToLobby' })}>
                Zurück zur Lobby
              </button>
            </>
          )}
        </>
      )}

      <div className="spacer" />

      {/* ------------------------------ sheets ----------------------------- */}
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
          onSubmit={async (json) =>
            (await act({ type: 'addCustomTopic', json })) as unknown as {
              topicName: string;
              pairCount: number;
            }
          }
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

function SeatChips({
  view,
  onToggle,
  onRemove,
}: {
  view: RoomView;
  onToggle: (p: Record<string, unknown>) => void;
  onRemove: (p: Record<string, unknown>) => void;
}) {
  const editable = view.phase === 'lobby' || view.phase === 'results';
  return (
    <div className="players">
      {view.seats.map((s) => {
        const mine = view.mySeatIds.includes(s.id);
        const canControl = mine || view.isGm;
        return (
          <span
            key={s.id}
            className={`chip-player${mine ? ' me' : ''}${s.playNextRound ? '' : ' out'}`}
            onClick={() =>
              canControl &&
              editable &&
              onToggle({ type: 'setPlayNextRound', seatId: s.id, value: !s.playNextRound })
            }
            role={canControl && editable ? 'button' : undefined}
            tabIndex={canControl && editable ? 0 : undefined}
          >
            <Avatar name={s.name} />
            <span className="nm">{s.name}</span>
            {s.isGmSeat && <span className="badge gm">GM</span>}
            {!s.playNextRound && <span className="badge watch">👀</span>}
            {view.isGm && editable && (
              <button
                className="x"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove({ type: 'removeSeat', seatId: s.id });
                }}
                aria-label={`${s.name} entfernen`}
              >
                ✕
              </button>
            )}
          </span>
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
      <button className="block" onClick={onOpenTopics}>
        + Eigenes Thema
      </button>

      {freeSeats.length > 0 && (
        <>
          <span className="eyebrow">Freie Plätze übernehmen</span>
          {freeSeats.map((s) => (
            <button
              key={s.id}
              className="block"
              onClick={() => onAction({ type: 'claimSeat', seatId: s.id })}
            >
              {s.name} übernehmen
            </button>
          ))}
        </>
      )}

      {mySeats.length > 1 && (
        <>
          <span className="eyebrow">An diesem Handy</span>
          {mySeats.map((s) => (
            <div key={s.id} className="rowline">
              <span className="grow">{s.name}</span>
              <button
                className="chip"
                onClick={() => onAction({ type: 'releaseSeat', seatId: s.id })}
              >
                freigeben
              </button>
            </div>
          ))}
        </>
      )}

      {view.isGm && otherDevices.length > 0 && (
        <>
          <span className="eyebrow">Gamemaster übergeben</span>
          {otherDevices.map((d) => (
            <button
              key={d.deviceId}
              className="block"
              onClick={() => {
                onAction({ type: 'transferGm', deviceId: d.deviceId });
                onClose();
              }}
            >
              An {d.label}
            </button>
          ))}
        </>
      )}

      <span className="eyebrow">Raum verlassen</span>
      {view.isGm && otherDevices.length > 0 && (
        <>
          <p className="tiny" style={{ margin: 0 }}>
            Du bist Gamemaster — wähle einen Nachfolger, sonst entscheidet der Zufall.
          </p>
          <select value={successor} onChange={(e) => setSuccessor(e.target.value)}>
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
          Verlassen
        </button>
      ) : (
        <button
          className="danger block"
          onClick={() => {
            onAction({ type: 'leave', successorDeviceId: successor || undefined });
            onLeave();
          }}
        >
          Wirklich?
        </button>
      )}
    </Sheet>
  );
}
