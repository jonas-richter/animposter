// Verifies every image URL in the character library:
//  - host must be on the allow-list
//  - HTTP status must be 2xx
//  - Content-Type must be an image
//
//   npm run check:images
//
// Exits with code 1 if any URL is broken, so it can be used in CI.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ALLOWED_HOSTS = [
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'de.wikipedia.org',
  'en.wikipedia.org',
  'static.wikia.nocookie.net',
  'vignette.wikia.nocookie.net',
];

// The library is TypeScript, so pull the URLs out textually instead of
// compiling it. Good enough: every image lives in an `image: '...'` field.
function collectUrls() {
  const file = readFileSync(path.join(root, 'src', 'lib', 'characters.ts'), 'utf8');
  const urls = [];
  const re = /image:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(file)) !== null) urls.push(m[1]);
  const extra = process.argv.slice(2).filter((a) => a.startsWith('http'));
  return [...urls, ...extra];
}

async function checkUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { url, ok: false, reason: 'keine gültige URL' };
  }
  if (parsed.protocol !== 'https:') return { url, ok: false, reason: 'kein https' };
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return { url, ok: false, reason: `Host nicht erlaubt (${parsed.hostname})` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'impostor-image-check/1.0' },
    });
    // Some CDNs do not answer HEAD -> retry with a ranged GET.
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'impostor-image-check/1.0', Range: 'bytes=0-1024' },
      });
    }
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok) return { url, ok: false, reason: `HTTP ${res.status}` };
    if (!type.startsWith('image/')) return { url, ok: false, reason: `Content-Type ${type || '?'}` };
    return { url, ok: true, reason: `HTTP ${res.status}, ${type}` };
  } catch (e) {
    return { url, ok: false, reason: e.name === 'AbortError' ? 'Timeout' : String(e.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}

const urls = collectUrls();
if (urls.length === 0) {
  console.log(
    '\nKeine Bild-URLs in der Bibliothek gefunden.\n' +
      'Die App zeigt für jeden Charakter eine generierte Karte - das ist der Normalfall.\n' +
      'Wenn du eigene Bilder einträgst (Feld "image"), prüft dieses Skript sie.\n' +
      `Erlaubte Hosts: ${ALLOWED_HOSTS.join(', ')}\n`,
  );
  process.exit(0);
}

console.log(`\nPrüfe ${urls.length} Bild-URLs …\n`);
const results = [];
for (let i = 0; i < urls.length; i += 6) {
  results.push(...(await Promise.all(urls.slice(i, i + 6).map(checkUrl))));
}

let bad = 0;
for (const r of results) {
  if (r.ok) console.log(`  ok   ${r.url}  (${r.reason})`);
  else {
    bad++;
    console.log(`  FAIL ${r.url}  -> ${r.reason}`);
  }
}
console.log(`\n${results.length - bad} erreichbar, ${bad} kaputt.\n`);
if (bad > 0) {
  console.log('Kaputte URLs am besten aus characters.ts entfernen – die App zeigt dann');
  console.log('automatisch die generierte Karte statt eines kaputten Bildes.\n');
}
process.exit(bad === 0 ? 0 : 1);
