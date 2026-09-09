// Server-side helper for the "build a topic from a wiki" assistant.
//
// Why server-side: calling Fandom straight from the browser would hand every
// player's IP to a third party (and the cookie-banner-free setup depends on not
// doing that). The proxy also lets us pin the host, cap the response and keep
// the client free of API details.

export const KNOWN_WIKIS: { slug: string; label: string }[] = [
  { slug: 'onepiece', label: 'One Piece' },
  { slug: 'naruto', label: 'Naruto' },
  { slug: 'jujutsu-kaisen', label: 'Jujutsu Kaisen' },
  { slug: 'attackontitan', label: 'Attack on Titan' },
  { slug: 'kimetsu-no-yaiba', label: 'Demon Slayer' },
  { slug: 'myheroacademia', label: 'My Hero Academia' },
  { slug: 'dragonball', label: 'Dragon Ball' },
  { slug: 'deathnote', label: 'Death Note' },
  { slug: 'harrypotter', label: 'Harry Potter' },
  { slug: 'marvelcinematicuniverse', label: 'Marvel / MCU' },
  { slug: 'starwars', label: 'Star Wars' },
  { slug: 'lotr', label: 'Herr der Ringe' },
  { slug: 'pokemon', label: 'Pokémon' },
  { slug: 'gameofthrones', label: 'Game of Thrones' },
  { slug: 'simpsons', label: 'Die Simpsons' },
];

const CDN = 'https://static.wikia.nocookie.net/';
const THUMB_WIDTH = 400;

export class WikiError extends Error {}

/** Only a plain wiki slug may be used - it goes straight into the hostname. */
export function cleanSlug(raw: unknown): string {
  const slug = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
    throw new WikiError('Ungültiger Wiki-Name. Erlaubt sind Buchstaben, Zahlen und Bindestriche.');
  }
  return slug;
}

export function cleanQuery(raw: unknown): string {
  const q = String(raw ?? '').trim().slice(0, 80);
  if (q.length < 2) throw new WikiError('Bitte mindestens zwei Zeichen suchen.');
  return q;
}

async function callApi(slug: string, params: Record<string, string>) {
  const url = new URL(`https://${slug}.fandom.com/api.php`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'impostor-party-game/1.0 (topic builder)' },
    });
    if (!res.ok) throw new WikiError(`Das Wiki antwortet nicht (HTTP ${res.status}).`);
    const text = await res.text();
    if (text.length > 800_000) throw new WikiError('Antwort des Wikis ist zu groß.');
    return JSON.parse(text);
  } catch (e) {
    if (e instanceof WikiError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new WikiError('Das Wiki hat zu lange gebraucht.');
    }
    throw new WikiError(`Wiki "${slug}" nicht erreichbar. Stimmt der Name?`);
  } finally {
    clearTimeout(timer);
  }
}

export interface WikiHit {
  title: string;
  image?: string;
}

/** Turn Fandom's thumbnail URL into the stable, width-capped form we store. */
export function normaliseImage(source: unknown): string | undefined {
  if (typeof source !== 'string' || !source.startsWith(CDN)) return undefined;
  const path = source.slice(CDN.length).split('?')[0].replace(/\/revision\/latest.*$/, '');
  if (!/\.(png|jpe?g|gif|webp)$/i.test(path)) return undefined;
  return `${CDN}${path}/revision/latest/scale-to-width-down/${THUMB_WIDTH}`;
}

/** Category titles without the "Category:" prefix, minus wiki housekeeping. */
export function usefulCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const NOISE =
    /(stub|article|images?|galler|navigation|template|disambig|candidates|browse|pages?|needing|cleanup|unreferenced|characters$)/i;
  return raw
    .map((c) => String((c as { title?: string })?.title ?? '').replace(/^Category:/, '').trim())
    .filter((c) => c.length > 2 && c.length < 48 && !NOISE.test(c))
    .slice(0, 24);
}

export async function searchCharacters(slug: string, query: string): Promise<WikiHit[]> {
  const data = await callApi(slug, {
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '8',
    gsrnamespace: '0',
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
  });
  const pages: unknown[] = data?.query?.pages ?? [];
  return pages
    .map((p) => {
      const page = p as { title?: string; thumbnail?: { source?: string } };
      return {
        title: String(page.title ?? ''),
        image: normaliseImage(page.thumbnail?.source),
      };
    })
    .filter((h) => h.title.length > 0);
}

export interface WikiDetail {
  title: string;
  image?: string;
  categories: string[];
}

export async function characterDetail(slug: string, title: string): Promise<WikiDetail> {
  const data = await callApi(slug, {
    action: 'query',
    titles: title.slice(0, 120),
    redirects: '1',
    prop: 'pageimages|categories',
    pithumbsize: String(THUMB_WIDTH),
    cllimit: '60',
    clshow: '!hidden',
  });
  const page = (data?.query?.pages ?? [])[0] as
    | { title?: string; missing?: boolean; thumbnail?: { source?: string }; categories?: unknown }
    | undefined;
  if (!page || page.missing) throw new WikiError(`"${title}" gibt es in diesem Wiki nicht.`);
  return {
    title: String(page.title ?? title),
    image: normaliseImage(page.thumbnail?.source),
    categories: usefulCategories(page.categories),
  };
}

/** What the two have in common, and what only one of them has. */
export function compareCategories(a: string[], b: string[]) {
  const setB = new Set(b.map((c) => c.toLowerCase()));
  const setA = new Set(a.map((c) => c.toLowerCase()));
  return {
    shared: a.filter((c) => setB.has(c.toLowerCase())),
    onlyA: a.filter((c) => !setB.has(c.toLowerCase())),
    onlyB: b.filter((c) => !setA.has(c.toLowerCase())),
  };
}
