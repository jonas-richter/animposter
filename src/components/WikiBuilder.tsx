'use client';

import { useState } from 'react';
import { KNOWN_WIKIS } from '@/lib/wiki';
import { proxied } from './CharacterArt';

// Assisted topic building, no AI involved.
//
// The wiki supplies names, artwork and categories; the judgement of "similar
// enough to bluff with, different enough to trip over" stays with the person.
// Shared categories are offered as ready-made bullet points, categories only
// one of the two has become trap candidates.
//
// The result is assembled into exactly the same JSON the paste field accepts,
// so it goes through the identical strict validation on the server.

interface Detail {
  title: string;
  image?: string;
  categories: string[];
}
interface Draft {
  real: { name: string; image?: string };
  impostor: { name: string; image?: string };
  similarities: string[];
  traps: string[];
}

export default function WikiBuilder({
  onSubmit,
  busy,
}: {
  onSubmit: (json: string) => Promise<{ topicName: string; pairCount: number; pending?: boolean }>;
  busy: boolean;
}) {
  const [wiki, setWiki] = useState(KNOWN_WIKIS[0].slug);
  const [customWiki, setCustomWiki] = useState('');
  const [topicName, setTopicName] = useState(KNOWN_WIKIS[0].label);

  const [qa, setQa] = useState('');
  const [qb, setQb] = useState('');
  const [hitsA, setHitsA] = useState<{ title: string; image?: string }[]>([]);
  const [hitsB, setHitsB] = useState<{ title: string; image?: string }[]>([]);
  const [pickA, setPickA] = useState<string | null>(null);
  const [pickB, setPickB] = useState<string | null>(null);

  const [detail, setDetail] = useState<{
    a: Detail;
    b: Detail;
    shared: string[];
    onlyA: string[];
    onlyB: string[];
  } | null>(null);
  const [sims, setSims] = useState<string[]>([]);
  const [traps, setTraps] = useState<string[]>([]);
  const [freeSim, setFreeSim] = useState('');
  const [freeTrap, setFreeTrap] = useState('');

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const slug = wiki === '__custom' ? customWiki.trim().toLowerCase() : wiki;

  async function call(params: Record<string, string>) {
    const qs = new URLSearchParams({ wiki: slug, ...params });
    const res = await fetch(`/api/wiki?${qs}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Fehler');
    return data;
  }

  async function search(which: 'a' | 'b') {
    setMsg('');
    setLoading(true);
    try {
      const data = await call({ action: 'search', q: which === 'a' ? qa : qb });
      if (which === 'a') setHitsA(data.hits);
      else setHitsB(data.hits);
      if (data.hits.length === 0) setMsg('Nichts gefunden. Anders schreiben?');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  async function compare(a: string, b: string) {
    setMsg('');
    setLoading(true);
    try {
      const data = await call({ action: 'detail', a, b });
      setDetail(data);
      setSims(data.shared.slice(0, 4).map((c: string) => `Beide: ${c}`));
      setTraps(data.onlyB.slice(0, 1).map((c: string) => `Nur ${data.b.title}: ${c}`));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  function toggle(list: string[], set: (v: string[]) => void, value: string, max: number) {
    if (list.includes(value)) set(list.filter((v) => v !== value));
    else if (list.length < max) set([...list, value]);
  }

  function addPair() {
    if (!detail) return;
    if (sims.length < 3) return setMsg('Mindestens 3 Gemeinsamkeiten.');
    if (traps.length < 1) return setMsg('Mindestens 1 Stolperstein.');
    setDrafts((d) => [
      ...d,
      {
        real: { name: detail.a.title, image: detail.a.image },
        impostor: { name: detail.b.title, image: detail.b.image },
        similarities: sims.slice(0, 5),
        traps: traps.slice(0, 2),
      },
    ]);
    setDetail(null);
    setPickA(null);
    setPickB(null);
    setHitsA([]);
    setHitsB([]);
    setQa('');
    setQb('');
    setSims([]);
    setTraps([]);
    setMsg('');
  }

  async function finish() {
    setMsg('');
    try {
      const res = await onSubmit(JSON.stringify({ name: topicName.trim(), pairs: drafts }));
      setMsg(
        res.pending
          ? `"${res.topicName}" ist als Vorschlag eingereicht.`
          : `"${res.topicName}" mit ${res.pairCount} Paaren steht zur Wahl.`,
      );
      setDrafts([]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Fehler');
    }
  }

  return (
    <div className="stack">
      <p className="tiny" style={{ margin: 0 }}>
        Namen, Bilder und Stichpunkte kommen aus dem Wiki — du entscheidest nur, was davon passt.
        Keine KI, kein Konto.
      </p>

      <span className="eyebrow">Universum</span>
      <select
        value={wiki}
        onChange={(e) => {
          setWiki(e.target.value);
          const found = KNOWN_WIKIS.find((w) => w.slug === e.target.value);
          if (found) setTopicName(found.label);
          setDetail(null);
          setHitsA([]);
          setHitsB([]);
        }}
      >
        {KNOWN_WIKIS.map((w) => (
          <option key={w.slug} value={w.slug}>
            {w.label}
          </option>
        ))}
        <option value="__custom">Anderes Fandom-Wiki …</option>
      </select>
      {wiki === '__custom' && (
        <input
          type="text"
          placeholder="z.B. rickandmorty (aus rickandmorty.fandom.com)"
          value={customWiki}
          onChange={(e) => setCustomWiki(e.target.value)}
        />
      )}
      <input
        type="text"
        placeholder="Name des Themas"
        value={topicName}
        maxLength={60}
        onChange={(e) => setTopicName(e.target.value)}
        aria-label="Name des Themas"
      />

      {msg && <div className="note info">{msg}</div>}

      {!detail && (
        <>
          <span className="eyebrow">Der echte Charakter</span>
          <div className="row">
            <input
              className="grow"
              type="text"
              placeholder="suchen …"
              value={qa}
              onChange={(e) => setQa(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search('a')}
            />
            <button className="chip" onClick={() => search('a')} disabled={loading || qa.length < 2}>
              Suchen
            </button>
          </div>
          {hitsA.length > 0 && (
            <div className="wiki-hits">
              {hitsA.map((h) => (
                <button
                  key={h.title}
                  className={`wiki-hit${pickA === h.title ? ' sel' : ''}`}
                  onClick={() => setPickA(h.title)}
                >
                  {h.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxied(h.image)} alt="" />
                  ) : (
                    <span className="ph" />
                  )}
                  <span className="nm">{h.title}</span>
                </button>
              ))}
            </div>
          )}

          <span className="eyebrow">Der Impostor</span>
          <div className="row">
            <input
              className="grow"
              type="text"
              placeholder="suchen …"
              value={qb}
              onChange={(e) => setQb(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search('b')}
            />
            <button className="chip" onClick={() => search('b')} disabled={loading || qb.length < 2}>
              Suchen
            </button>
          </div>
          {hitsB.length > 0 && (
            <div className="wiki-hits">
              {hitsB.map((h) => (
                <button
                  key={h.title}
                  className={`wiki-hit${pickB === h.title ? ' sel' : ''}`}
                  onClick={() => setPickB(h.title)}
                >
                  {h.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxied(h.image)} alt="" />
                  ) : (
                    <span className="ph" />
                  )}
                  <span className="nm">{h.title}</span>
                </button>
              ))}
            </div>
          )}

          <button
            className="grad primary block"
            disabled={!pickA || !pickB || loading}
            onClick={() => pickA && pickB && compare(pickA, pickB)}
          >
            {loading ? 'Hole Daten …' : 'Gemeinsamkeiten suchen'}
          </button>
        </>
      )}

      {detail && (
        <>
          <div className="versus">
            <div className="face-card real">
              <div className="pic">
                {detail.a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxied(detail.a.image)} alt="" />
                ) : (
                  <span className="ph" />
                )}
              </div>
              <div className="nm">{detail.a.title}</div>
            </div>
            <span className="vs">VS</span>
            <div className="face-card imp">
              <div className="pic">
                {detail.b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxied(detail.b.image)} alt="" />
                ) : (
                  <span className="ph" />
                )}
              </div>
              <div className="nm">{detail.b.title}</div>
            </div>
          </div>

          <span className="eyebrow">Gemeinsamkeiten ({sims.length}/5, mind. 3)</span>
          <div className="tagcloud">
            {detail.shared.map((c) => {
              const v = `Beide: ${c}`;
              return (
                <button
                  key={c}
                  className={`tagpick${sims.includes(v) ? ' on' : ''}`}
                  onClick={() => toggle(sims, setSims, v, 5)}
                >
                  {c}
                </button>
              );
            })}
            {detail.shared.length === 0 && (
              <span className="tiny">
                Keine gemeinsamen Kategorien gefunden — schreib sie selbst.
              </span>
            )}
          </div>
          <div className="row">
            <input
              className="grow"
              type="text"
              placeholder="Eigene Gemeinsamkeit"
              value={freeSim}
              maxLength={200}
              onChange={(e) => setFreeSim(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && freeSim.trim() && sims.length < 5) {
                  setSims([...sims, freeSim.trim()]);
                  setFreeSim('');
                }
              }}
            />
            <button
              className="chip"
              disabled={!freeSim.trim() || sims.length >= 5}
              onClick={() => {
                setSims([...sims, freeSim.trim()]);
                setFreeSim('');
              }}
            >
              +
            </button>
          </div>
          <ul className="bullets">
            {sims.map((s) => (
              <li key={s}>
                {s}{' '}
                <button className="chip danger" onClick={() => setSims(sims.filter((x) => x !== s))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <span className="eyebrow">Stolpersteine ({traps.length}/2, mind. 1)</span>
          <div className="tagcloud">
            {[
              ...detail.onlyA.map((c) => `Nur ${detail.a.title}: ${c}`),
              ...detail.onlyB.map((c) => `Nur ${detail.b.title}: ${c}`),
            ]
              .slice(0, 14)
              .map((v) => (
                <button
                  key={v}
                  className={`tagpick${traps.includes(v) ? ' on' : ''}`}
                  onClick={() => toggle(traps, setTraps, v, 2)}
                >
                  {v}
                </button>
              ))}
          </div>
          <div className="row">
            <input
              className="grow"
              type="text"
              placeholder="Eigener Stolperstein"
              value={freeTrap}
              maxLength={200}
              onChange={(e) => setFreeTrap(e.target.value)}
            />
            <button
              className="chip"
              disabled={!freeTrap.trim() || traps.length >= 2}
              onClick={() => {
                setTraps([...traps, freeTrap.trim()]);
                setFreeTrap('');
              }}
            >
              +
            </button>
          </div>
          <ul className="bullets">
            {traps.map((s) => (
              <li key={s}>
                {s}{' '}
                <button
                  className="chip danger"
                  onClick={() => setTraps(traps.filter((x) => x !== s))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button className="grad go block" onClick={addPair}>
            Paar übernehmen
          </button>
          <button className="quiet block" onClick={() => setDetail(null)}>
            Andere wählen
          </button>
        </>
      )}

      {drafts.length > 0 && (
        <>
          <span className="eyebrow">Fertige Paare ({drafts.length}, mind. 3)</span>
          {drafts.map((d, i) => (
            <div key={i} className="rowline">
              <span className="grow">
                {d.real.name} <span className="tiny">vs</span> {d.impostor.name}
              </span>
              <button
                className="chip danger"
                onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="grad primary block"
            disabled={busy || drafts.length < 3 || !topicName.trim()}
            onClick={finish}
          >
            {drafts.length < 3
              ? `Noch ${3 - drafts.length} Paar${3 - drafts.length === 1 ? '' : 'e'}`
              : `Thema mit ${drafts.length} Paaren anlegen`}
          </button>
        </>
      )}
    </div>
  );
}
