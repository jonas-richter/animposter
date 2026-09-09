import type { CharacterPair, Topic } from './types';

// Strict validation for user-supplied topic JSON.
//
// This input is UNTRUSTED (pasted from an LLM answer, a chat, whatever).
// Rules enforced here:
//  - plain JSON only, parsed with JSON.parse (never eval / new Function)
//  - fixed shape, unknown keys are dropped, not merged
//  - hard length limits on every string and array
//  - image URLs: https only, host must be on the allow-list, no credentials,
//    no query-string smuggling of javascript:, must look like an image path
//  - every string is returned as plain text; the UI renders it via React text
//    nodes only (no innerHTML / dangerouslySetInnerHTML anywhere in this app)

export const ALLOWED_IMAGE_HOSTS = [
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'de.wikipedia.org',
  'en.wikipedia.org',
  'static.wikia.nocookie.net',
  'vignette.wikia.nocookie.net',
];

export const LIMITS = {
  topicName: 60,
  charName: 60,
  bullet: 200,
  url: 500,
  minPairs: 3,
  maxPairs: 60,
  minSimilarities: 3,
  maxSimilarities: 5,
  minTraps: 1,
  maxTraps: 2,
  maxJsonChars: 200_000,
  maxCustomTopicsPerRoom: 20,
};

export class TopicValidationError extends Error {}

function fail(msg: string): never {
  throw new TopicValidationError(msg);
}

function asString(value: unknown, max: number, where: string): string {
  if (typeof value !== 'string') fail(`${where}: muss ein Text sein.`);
  const trimmed = value.trim();
  if (trimmed.length === 0) fail(`${where}: darf nicht leer sein.`);
  if (trimmed.length > max) fail(`${where}: maximal ${max} Zeichen (aktuell ${trimmed.length}).`);
  // Strip control characters; keep normal punctuation and umlauts.
  // eslint-disable-next-line no-control-regex
  return trimmed
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function asBulletList(
  value: unknown,
  min: number,
  max: number,
  where: string,
): string[] {
  if (!Array.isArray(value)) fail(`${where}: muss eine Liste sein.`);
  if (value.length < min) fail(`${where}: mindestens ${min} Einträge nötig.`);
  if (value.length > max) fail(`${where}: höchstens ${max} Einträge erlaubt.`);
  return value.map((v, i) => asString(v, LIMITS.bullet, `${where}[${i + 1}]`));
}

/** Returns a sanitised https image URL, or undefined when no image was given. */
export function validateImageUrl(value: unknown, where: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') fail(`${where}: Bild-URL muss ein Text sein.`);
  const raw = value.trim();
  if (raw.length > LIMITS.url) fail(`${where}: Bild-URL ist zu lang.`);

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    fail(`${where}: "${raw.slice(0, 60)}" ist keine gültige URL.`);
  }
  if (url.protocol !== 'https:') fail(`${where}: nur https-URLs sind erlaubt.`);
  if (url.username || url.password) fail(`${where}: URLs mit Login-Daten sind nicht erlaubt.`);
  if (!ALLOWED_IMAGE_HOSTS.includes(url.hostname)) {
    fail(
      `${where}: Host "${url.hostname}" ist nicht erlaubt. Erlaubt sind: ${ALLOWED_IMAGE_HOSTS.join(', ')}.`,
    );
  }
  if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(url.pathname)) {
    fail(`${where}: die URL muss direkt auf eine Bilddatei zeigen (.png, .jpg, .webp, .gif, .svg).`);
  }
  return url.toString();
}

function validatePair(value: unknown, index: number): CharacterPair {
  const where = `Paar ${index + 1}`;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${where}: muss ein Objekt sein.`);
  }
  const p = value as Record<string, unknown>;

  for (const k of ['real', 'impostor']) {
    if (typeof p[k] !== 'object' || p[k] === null || Array.isArray(p[k])) {
      fail(`${where}: Feld "${k}" fehlt oder ist kein Objekt.`);
    }
  }
  const real = p.real as Record<string, unknown>;
  const imp = p.impostor as Record<string, unknown>;

  const realName = asString(real.name, LIMITS.charName, `${where} → real.name`);
  const impName = asString(imp.name, LIMITS.charName, `${where} → impostor.name`);
  if (realName.toLowerCase() === impName.toLowerCase()) {
    fail(`${where}: real und impostor dürfen nicht denselben Namen haben.`);
  }

  return {
    id: `custom-${index}-${realName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`,
    real: {
      name: realName,
      image: validateImageUrl(real.image, `${where} → real.image`),
    },
    impostor: {
      name: impName,
      image: validateImageUrl(imp.image, `${where} → impostor.image`),
    },
    similarities: asBulletList(
      p.similarities,
      LIMITS.minSimilarities,
      LIMITS.maxSimilarities,
      `${where} → similarities`,
    ),
    traps: asBulletList(p.traps, LIMITS.minTraps, LIMITS.maxTraps, `${where} → traps`),
  };
}

/**
 * Parse + validate a pasted topic JSON string.
 * Throws TopicValidationError with a German message on any problem.
 */
export function parseCustomTopic(jsonText: string): Topic {
  if (typeof jsonText !== 'string') fail('Kein Text empfangen.');
  const text = jsonText.trim();
  if (!text) fail('Das JSON-Feld ist leer.');
  if (text.length > LIMITS.maxJsonChars) {
    fail(`Das JSON ist zu groß (max. ${LIMITS.maxJsonChars} Zeichen).`);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    fail(
      'Das ist kein gültiges JSON. Häufige Ursachen: Text vor/nach dem JSON (z.B. "```json"), ein fehlendes Komma oder "schlaue" Anführungszeichen. Fehler: ' +
        (e instanceof Error ? e.message : String(e)),
    );
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    fail('Die oberste Ebene muss ein Objekt mit "name" und "pairs" sein.');
  }
  const obj = data as Record<string, unknown>;

  const name = asString(obj.name, LIMITS.topicName, 'name');
  if (!Array.isArray(obj.pairs)) fail('"pairs" fehlt oder ist keine Liste.');
  if (obj.pairs.length < LIMITS.minPairs) {
    fail(`"pairs": mindestens ${LIMITS.minPairs} Paare nötig (aktuell ${obj.pairs.length}).`);
  }
  if (obj.pairs.length > LIMITS.maxPairs) {
    fail(`"pairs": höchstens ${LIMITS.maxPairs} Paare erlaubt.`);
  }

  const pairs = obj.pairs.map((p, i) => validatePair(p, i));

  const seen = new Set<string>();
  for (const p of pairs) {
    const k = `${p.real.name.toLowerCase()}|${p.impostor.name.toLowerCase()}`;
    if (seen.has(k)) fail(`Doppeltes Paar: "${p.real.name}" / "${p.impostor.name}".`);
    seen.add(k);
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return {
    id: `custom-${slug || 'thema'}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    custom: true,
    pairs,
  };
}

/** The copy-paste prompt shown in the UI. */
export const CUSTOM_TOPIC_PROMPT = `Du hilfst mir, Charakter-Paare für ein Partyspiel namens "Impostor" zu erstellen.

Thema: <<< HIER DEIN THEMA EINSETZEN, z.B. "Star Wars" oder "Herr der Ringe" >>>

Erstelle 8 Charakter-Paare aus diesem Universum. Jedes Paar besteht aus einem "echten" Charakter und einem "Impostor"-Charakter, der ihm SEHR ähnlich ist: optisch, charakterlich, von der Rolle in der Geschichte her. Die Ähnlichkeit muss so groß sein, dass jemand, der den Impostor-Charakter hat, in einer Diskussion über den echten Charakter mitreden kann, ohne sofort aufzufliegen.

Für jedes Paar:
- "similarities": 3 bis 5 kurze Stichpunkte, was die beiden gemeinsam haben.
- "traps": 1 bis 2 subtile Unterschiede, an denen der Impostor auffliegen kann.

Wichtige Regeln:
- Alle Texte auf Deutsch.
- Nur Fakten, die wirklich stimmen. Keine erfundenen Details.
- Keine identischen Namen im selben Paar.
- Bild-URLs sind optional. Wenn du welche angibst, müssen es direkte https-Links auf eine Bilddatei (.png/.jpg/.webp) von einem dieser Hosts sein: upload.wikimedia.org, commons.wikimedia.org, static.wikia.nocookie.net. Wenn du dir bei einer URL nicht sicher bist, lass das Feld komplett weg.
- Antworte AUSSCHLIESSLICH mit dem JSON. Kein Fließtext davor oder danach, keine Code-Fences.

Format (exakt so):
{
  "name": "Star Wars",
  "pairs": [
    {
      "real": { "name": "Luke Skywalker" },
      "impostor": { "name": "Anakin Skywalker" },
      "similarities": [
        "Vater und Sohn, beide Jedi",
        "Beide bauten sich ihr eigenes Lichtschwert",
        "Beide sind herausragende Piloten",
        "Beide wurden von Obi-Wan Kenobi ausgebildet"
      ],
      "traps": [
        "Anakin wird zu Darth Vader und trägt später schwarze Rüstung",
        "Luke verliert die rechte Hand, Anakin zuerst die rechte, später alle Gliedmaßen"
      ]
    }
  ]
}`;
