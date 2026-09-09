'use client';

import { useState } from 'react';
import { Sheet } from './ui';
import {
  deleteSavedTopic,
  loadSavedTopics,
  saveTopicLocally,
  type SavedTopic,
} from '@/lib/client';
import { CUSTOM_TOPIC_PROMPT } from '@/lib/validateTopic';
import type { TopicMeta } from '@/lib/types';

export default function CustomTopicSheet({
  onClose,
  onSubmit,
  onRemove,
  topics,
  isGm,
}: {
  onClose: () => void;
  onSubmit: (json: string) => Promise<{
    topicName: string;
    pairCount: number;
    pending?: boolean;
  }>;
  onRemove: (topicId: string) => Promise<void>;
  topics: TopicMeta[];
  isGm: boolean;
}) {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<SavedTopic[]>(() =>
    typeof window === 'undefined' ? [] : loadSavedTopics(),
  );

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(CUSTOM_TOPIC_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Kopieren hat nicht geklappt – bitte den Text manuell markieren.');
    }
  }

  async function add(text: string) {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await onSubmit(text);
      setOk(
        res.pending
          ? `"${res.topicName}" ist als Vorschlag eingereicht — der Gamemaster gibt ihn frei.`
          : `"${res.topicName}" mit ${res.pairCount} Paaren steht jetzt zur Wahl.`,
      );
      saveTopicLocally({ name: res.topicName, json: text, addedAt: Date.now() });
      setSaved(loadSavedTopics());
      setJson('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setBusy(false);
    }
  }

  const customTopics = topics.filter((t) => t.custom);

  return (
    <Sheet title={isGm ? 'Eigenes Thema' : 'Thema vorschlagen'} onClose={onClose}>
      <div className="stack">
        <p className="tiny" style={{ margin: 0 }}>
          Schritt 1: Prompt kopieren, bei ChatGPT/Claude einfügen und das Wunschthema eintragen.
          Schritt 2: die JSON-Antwort hier einfügen.
        </p>

        <button className="block" onClick={copyPrompt}>
          {copied ? '✅ Prompt kopiert' : '📋 Prompt kopieren'}
        </button>

        <details>
          <summary className="muted" style={{ cursor: 'pointer', padding: '8px 0' }}>
            Prompt anzeigen
          </summary>
          <textarea readOnly value={CUSTOM_TOPIC_PROMPT} style={{ minHeight: 200 }} />
        </details>

        <span className="eyebrow">JSON einfügen</span>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='{ "name": "Star Wars", "pairs": [ … ] }'
          spellCheck={false}
        />
        {error && <div className="note err">{error}</div>}
        {ok && <div className="note ok">{ok}</div>}
        <button className="grad primary block" onClick={() => add(json)} disabled={busy || !json.trim()}>
          {busy ? 'Prüfe …' : isGm ? 'Thema hinzufügen' : 'Vorschlag abschicken'}
        </button>

        {saved.length > 0 && (
          <>
            <span className="eyebrow">Auf diesem Gerät gespeichert</span>
            <div className="stack">
              {saved.map((t) => (
                <div key={t.name} className="rowline">
                  <span className="grow">{t.name}</span>
                  <button className="chip" onClick={() => add(t.json)} disabled={busy}>
                    In den Raum laden
                  </button>
                  <button
                    className="chip danger"
                    onClick={() => {
                      deleteSavedTopic(t.name);
                      setSaved(loadSavedTopics());
                    }}
                    aria-label={`${t.name} löschen`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {customTopics.length > 0 && (
          <>
            <span className="eyebrow">Eigene Themen in diesem Raum</span>
            <div className="stack">
              {customTopics.map((t) => (
                <div key={t.id} className="rowline">
                  <span className="grow">
                    {t.name}{' '}
                    <span className="tiny">· {t.pairCount} Paare</span>
                  </span>
                  {isGm && (
                    <button
                      className="chip danger"
                      onClick={() => onRemove(t.id)}
                      aria-label={`${t.name} entfernen`}
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="tiny" style={{ margin: 0 }}>
          Sicherheit: Das JSON wird streng geprüft (Struktur, Längen, erlaubte Bild-Hosts). Texte
          werden immer als reiner Text angezeigt, nie als HTML ausgeführt.
        </p>
      </div>
    </Sheet>
  );
}
