/**
 * Headless UI walkthrough of a complete game.
 *
 * Renders the real React components in a jsdom document and drives them with
 * real clicks against a running server. This is the closest thing to a manual
 * playthrough that can run without a browser binary.
 *
 *   npm run build && npm start     (terminal 1)
 *   npm run test:ui                (terminal 2)
 */
import { JSDOM } from 'jsdom';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// --- jsdom environment (must exist before React DOM is imported) ------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: BASE,
  pretendToBeVisual: true,
});
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.localStorage = dom.window.localStorage;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;

// Each simulated phone needs its own localStorage, otherwise all clients would
// share one session token. `use(phone)` swaps the active storage in.
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  } as Storage;
}

// Relative fetch URLs -> absolute, so the components can call /api/... as usual.
const realFetch = globalThis.fetch;
g.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/')) return realFetch(BASE + input, init);
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react') as typeof import('react');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act } = require('react') as { act: (cb: () => Promise<void> | void) => Promise<void> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require('react-dom/client') as typeof import('react-dom/client');

import RoomClient from '../src/components/RoomClient';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}${extra ? ' -> ' + extra : ''}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await realFetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { 'x-impostor-token': opts.token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, data: (await res.json().catch(() => null)) as any };
}

// --- one mounted client ("a phone") ----------------------------------------
interface Phone {
  name: string;
  storage: Storage;
  container: HTMLElement;
  text(): string;
  find(label: string | RegExp): HTMLElement | undefined;
  click(label: string | RegExp): Promise<void>;
  /** Click a ballot row by player name (ignores status tags in the same row). */
  clickCandidate(name: string): Promise<boolean>;
  settle(ms?: number): Promise<void>;
}

async function mountPhone(name: string, code: string, token: string): Promise<Phone> {
  const storage = makeStorage();
  storage.setItem(`impostor:token:${code}`, token);
  const activate = () => {
    g.localStorage = storage;
    Object.defineProperty(dom.window, 'localStorage', {
      value: storage,
      configurable: true,
    });
  };
  activate();
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(RoomClient, { code }));
  });
  await act(async () => {
    await sleep(400);
  });

  const text = () => container.textContent ?? '';
  const clickables = () =>
    [...container.querySelectorAll('button, [role="button"]')] as HTMLElement[];

  const find = (label: string | RegExp) =>
    clickables().find((el) => {
      const t = (el.textContent ?? '').trim();
      const aria = el.getAttribute('aria-label') ?? '';
      return typeof label === 'string'
        ? t.includes(label) || aria.includes(label)
        : label.test(t) || label.test(aria);
    });

  return {
    name,
    storage,
    container,
    text,
    find,
    async click(label) {
      activate();
      const el = find(label);
      if (!el) throw new Error(`[${name}] Button "${label}" nicht gefunden. Sichtbar: ${text().slice(0, 400)}`);
      await act(async () => {
        el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await act(async () => {
        await sleep(250);
      });
    },
    async clickCandidate(name) {
      activate();
      const row = [...container.querySelectorAll('.select-target')].find(
        (el) => (el.querySelector('.grow')?.textContent ?? '').trim() === name,
      ) as HTMLElement | undefined;
      if (!row) return false;
      await act(async () => {
        row.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await act(async () => {
        await sleep(150);
      });
      return true;
    },
    async settle(ms = 1200) {
      activate();
      await act(async () => {
        await sleep(ms);
      });
    },
  };
}

async function main() {
  console.log(`\nImpostor UI-Durchlauf (jsdom) gegen ${BASE}\n`);

  console.log('1) Raum anlegen und drei Geräte verbinden');
  const create = await api('/api/room', { method: 'POST' });
  const code: string = create.data.code;
  const gmToken: string = create.data.token;
  await api(`/api/room/${code}/join`, { method: 'POST', token: gmToken, body: { name: 'Jonas' } });

  const p2 = await api(`/api/room/${code}/join`, { method: 'POST', body: { name: 'Mira' } });
  const p3 = await api(`/api/room/${code}/join`, { method: 'POST', body: { name: 'Tom' } });
  // Tom's phone also covers Lena -> handoff flow must appear on that device only.
  await api(`/api/room/${code}/action`, {
    method: 'POST',
    token: p3.data.token,
    body: { type: 'addSeat', name: 'Lena' },
  });

  const gm = await mountPhone('GM', code, gmToken);
  const mira = await mountPhone('Mira', code, p2.data.token);
  const tom = await mountPhone('Tom+Lena', code, p3.data.token);

  check('GM-Lobby zeigt Raumcode', gm.text().includes(code), gm.text().slice(0, 200));
  check('GM sieht QR-Bereich', !!gm.container.querySelector('.qr'));
  check('Alle 4 Spieler in der Liste', ['Jonas', 'Mira', 'Tom', 'Lena'].every((n) => gm.text().includes(n)));
  check('Mira sieht keinen GM-Startknopf', !mira.find('Los geht'));
  check('Impostor-Anzahl in der Lobby einstellbar', !!gm.container.querySelector('.stepper'));
  check('Zahnrad nur beim GM', !!gm.find('Einstellungen') && !mira.find('Einstellungen'));

  console.log('2) Themen-Voting');
  await gm.click('Los geht');
  await mira.settle();
  await tom.settle();
  check('Mira sieht Themenliste', mira.text().includes('Welches Universum'), mira.text().slice(0, 200));
  check('One Piece steht zur Wahl', mira.text().includes('One Piece'));

  await mira.click('Naruto');
  await tom.click('Naruto');
  await gm.settle();
  // Mira = 1 seat, Tom's phone = 2 seats -> 3 votes in total.
  const narutoRow = [...gm.container.querySelectorAll('.select-target')].find(
    (el) => (el.querySelector('.grow')?.textContent ?? '').trim() === 'Naruto',
  );
  check(
    'GM sieht 3 Stimmen für Naruto',
    (narutoRow?.querySelector('.tally')?.textContent ?? '').trim() === '3',
    narutoRow?.textContent ?? 'Zeile nicht gefunden',
  );

  console.log('3) Rollen verteilen und aufdecken');
  await gm.click('Rollen verteilen');
  await mira.settle();
  await tom.settle();

  check('GM sieht verdeckte Karte', gm.text().includes('Antippen zum Aufdecken'), gm.text().slice(0, 200));
  check(
    'Gerät mit 2 Spielern zeigt Übergabe-Screen',
    tom.text().includes('Handy weitergeben an'),
    tom.text().slice(0, 300),
  );
  check(
    'Einzelnes Gerät zeigt KEINEN Übergabe-Screen',
    !mira.text().includes('Handy weitergeben an'),
    mira.text().slice(0, 200),
  );

  // GM + Mira: simple tap to reveal
  for (const phone of [gm, mira]) {
    await phone.click('Antippen zum Aufdecken');
    check(`${phone.name}: Charakter sichtbar`, phone.text().includes('Dein Charakter'), phone.text().slice(0, 200));
    check(
      `${phone.name}: Impostor-Status angezeigt`,
      /Du bist Impostor|Du bist echt/.test(phone.text()),
      phone.text().slice(0, 200),
    );
  }

  // Tom's phone: handoff -> card -> pass on -> handoff -> card -> finished
  const firstName = tom.text().includes('Tom') ? 'Tom' : 'Lena';
  await tom.click(/Ich bin .* – Karte zeigen/);
  check('Tom+Lena: erste Karte verdeckt', tom.text().includes('Antippen zum Aufdecken'));
  await tom.click('Antippen zum Aufdecken');
  const firstChar = tom.container.querySelector('.rolecard .name')?.textContent ?? '';
  check('Tom+Lena: erster Charakter sichtbar', firstChar.length > 0, firstChar);
  await tom.click('Gesehen – weitergeben');
  check(
    'Tom+Lena: Übergabe-Screen zwischen den Spielern',
    tom.text().includes('Handy weitergeben an'),
    tom.text().slice(0, 300),
  );
  check('Tom+Lena: Karte ist wieder weg', !tom.container.querySelector('.rolecard.shown'));
  await tom.click(/Ich bin .* – Karte zeigen/);
  check('Tom+Lena: zweite Karte startet verdeckt', tom.text().includes('Antippen zum Aufdecken'));
  await tom.click('Antippen zum Aufdecken');
  await tom.click('Gesehen – alle fertig');
  check('Tom+Lena: Sequenz beendet', tom.text().includes('Alle haben geschaut'), tom.text().slice(0, 200));

  await gm.settle();
  check('GM-Fortschritt 4/4', gm.text().includes('4/4'), gm.text().slice(0, 400));

  console.log('4) Diskussion und Abstimmung');
  await gm.click('Diskussion starten');
  await mira.settle();
  check('Mira sieht Diskussionsphase', mira.text().includes('Redet!'), mira.text().slice(0, 200));

  await gm.click('Abstimmung starten');
  await mira.settle();
  await tom.settle();
  check('Mira sieht Wahlzettel', mira.text().includes('Wer ist Impostor'), mira.text().slice(0, 200));
  check(
    'Tom+Lena: Übergabe-Screen auch beim Voting',
    tom.text().includes('Handy weitergeben an'),
    tom.text().slice(0, 300),
  );

  // Mira votes for two others
  const miraTargets = ['Jonas', 'Tom', 'Lena'].slice(0, 2);
  for (const t of miraTargets) check(`Mira wählt ${t}`, await mira.clickCandidate(t));
  check('Stimmen-Zähler 2/2', /2\/2/.test(mira.text()), mira.text().slice(0, 300));
  await mira.click('Abstimmen (');
  await mira.settle();
  check('Mira hat abgestimmt', mira.text().includes('Stimme steht'), mira.text().slice(0, 200));

  // GM votes
  for (const t of ['Mira', 'Tom']) await gm.clickCandidate(t);
  await gm.click('Abstimmen (');
  await gm.settle();

  // Tom's phone votes twice with a handoff in between
  await tom.click(/Ich bin .* – abstimmen/);
  for (const t of ['Jonas', 'Mira']) await tom.clickCandidate(t);
  await tom.click('Abstimmen (');
  await tom.settle();
  check(
    'Tom+Lena: zweiter Übergabe-Screen vor der zweiten Stimme',
    tom.text().includes('Handy weitergeben an'),
    tom.text().slice(0, 300),
  );
  await tom.click(/Ich bin .* – abstimmen/);
  for (const t of ['Jonas', 'Mira']) await tom.clickCandidate(t);
  await tom.click('Abstimmen (');
  await tom.settle(1500);

  console.log('5) Auflösung');
  await gm.settle(1500);
  await mira.settle(1500);
  check('Auflösung erscheint automatisch', gm.text().includes('Die Impostor waren'), gm.text().slice(0, 300));
  check('Gemeinsamkeiten sichtbar', gm.text().includes('Gemeinsamkeiten'));
  check('Stolpersteine sichtbar', gm.text().includes('Stolpersteine'));
  check('Gesamtstand sichtbar', gm.text().includes('Gesamtstand'));
  check('Mira sieht dieselbe Auflösung', mira.text().includes('Die Impostor waren'));
  const impostorBadges = [...gm.container.querySelectorAll('.badge.imp')];
  check('Zwei Impostor markiert', impostorBadges.length === 2, String(impostorBadges.length));

  console.log('6) Zahnrad-Menü und zweite Runde');
  await gm.click('Einstellungen');
  check('Zahnrad-Menü offen', gm.text().includes('Impostor wissen Bescheid'), gm.text().slice(-300));
  await mira.settle();
  check(
    'Öffnen des Zahnrads löst bei anderen keine Reaktion aus',
    !mira.text().includes('Impostor wissen Bescheid'),
  );
  await gm.click('Impostor wissen Bescheid');
  await gm.click('Fertig');
  await mira.settle();
  check('Einstellung geändert, Mitspieler merken nichts', !mira.text().includes('Einstellung'));

  await gm.click('Nächste Runde');
  await mira.settle();
  check('Runde 2: Themenwahl', mira.text().includes('Welches Universum'), mira.text().slice(0, 200));

  // Nobody has voted yet -> the GM must get a helpful error, not a crash.
  await gm.click('Rollen verteilen');
  check(
    'Ohne Themenstimmen kommt eine klare Meldung',
    gm.text().includes('Noch hat niemand für ein Thema gestimmt'),
    gm.text().slice(0, 200),
  );

  await mira.click('Attack on Titan');
  await gm.settle();
  await gm.click('Rollen verteilen');
  await mira.settle();
  await mira.click('Antippen zum Aufdecken');
  check('Runde 2: Karte da', mira.text().includes('Dein Charakter'));
  check(
    'Impostor-Wissen aus: kein Impostor-Hinweis',
    !/Du bist ein IMPOSTOR|Du bist kein Impostor/.test(mira.text()),
    mira.text().slice(0, 300),
  );

  console.log('7) Reconnect mitten in der Runde');
  const charBefore = mira.container.querySelector('.rolecard .name')?.textContent ?? '';
  // Simulate a screen lock / reload: fresh mount with the same stored token.
  const miraAgain = await mountPhone('Mira-neu', code, p2.data.token);
  await miraAgain.settle();
  check('Nach Reload wieder im Raum', !!miraAgain.container.querySelector('.rolecard'), miraAgain.text().slice(0, 120));
  check(
    'Karte startet nach Reload wieder verdeckt',
    !miraAgain.container.querySelector('.rolecard.shown'),
    miraAgain.text().slice(0, 200),
  );
  await miraAgain.click('Antippen zum Aufdecken');
  const charAfter = miraAgain.container.querySelector('.rolecard .name')?.textContent ?? '';
  check('Gleiche Rolle nach Reconnect', charBefore.length > 0 && charBefore === charAfter, `${charBefore} vs ${charAfter}`);

  console.log('8) Ein Gerät für alle (Handy herumreichen)');
  const single = await api('/api/room', { method: 'POST' });
  const sCode: string = single.data.code;
  const solo = await mountPhone('Ein Handy', sCode, single.data.token);
  check('Lobby zeigt QR und Code', !!solo.container.querySelector('.qr') && solo.text().includes(sCode));

  const input = solo.container.querySelector('input[type=text]') as HTMLInputElement;
  for (const n of ['Anna', 'Ben', 'Cem', 'Dana']) {
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        dom.window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, n);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    await solo.click('Spieler hinzufügen');
  }
  check(
    'Vier Spieler an einem Gerät',
    ['Anna', 'Ben', 'Cem', 'Dana'].every((n) => solo.text().includes(n)),
    solo.text().slice(0, 300),
  );

  await solo.click('Los geht');
  await solo.click('Harry Potter');
  await solo.click('Rollen verteilen');
  check('Übergabe-Screen zuerst', solo.text().includes('Handy weitergeben an'), solo.text().slice(0, 250));
  for (let i = 0; i < 4; i++) {
    await solo.click(/Ich bin .* – Karte zeigen/);
    check(`Karte ${i + 1} verdeckt`, !solo.container.querySelector('.rolecard.shown'));
    await solo.click('Antippen zum Aufdecken');
    check(`Karte ${i + 1} sichtbar`, solo.text().includes('Dein Charakter'));
    await solo.click(i < 3 ? 'Gesehen – weitergeben' : 'Gesehen – alle fertig');
  }
  check('Alle durch', solo.text().includes('Alle haben geschaut'), solo.text().slice(0, 200));

  await solo.click('Diskussion starten');
  await solo.click('Abstimmung starten');
  check('Übergabe vor der Abstimmung', solo.text().includes('Handy weitergeben an'));
  for (let i = 0; i < 4; i++) {
    await solo.click(/Ich bin .* – abstimmen/);
    let picked = 0;
    for (const n of ['Anna', 'Ben', 'Cem', 'Dana']) {
      if (picked >= 2) break;
      if (await solo.clickCandidate(n)) picked++;
    }
    check(`Stimme ${i + 1} hat 2 Ziele`, picked === 2, String(picked));
    await solo.click('Abstimmen (');
    await solo.settle(400);
  }
  await solo.settle(1500);
  check('Auflösung', solo.text().includes('Die Impostor waren'), solo.text().slice(0, 250));

  console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nUI-Test abgebrochen:', e);
  process.exit(1);
});
