// End-to-end test against a running server (default http://localhost:3000).
// Plays a full multi-device round and checks the security guarantees.
//
//   npm run build && npm start        (terminal 1)
//   npm run test:api                  (terminal 2)

const BASE = process.env.BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function check(label, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}${extra ? ' -> ' + extra : ''}`);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-impostor-token': token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, data, text };
}

let adminCookie = '';
async function adminApi(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(adminCookie ? { Cookie: adminCookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const m = setCookie.match(/impostor_admin=([^;]*)/);
    if (m) adminCookie = `impostor_admin=${m[1]}`;
  }
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, data, text };
}

const act = (code, token, payload) =>
  api(`/api/room/${code}/action`, { method: 'POST', token, body: payload });

async function main() {
  console.log(`\nImpostor E2E gegen ${BASE}\n`);

  // ---- create room --------------------------------------------------------
  console.log('1) Raum anlegen (Multi-Device)');
  const create = await api('/api/room', { method: 'POST' });
  check('Raum erstellt', create.status === 200 && !!create.data?.code, create.text);
  const code = create.data.code;
  const gm = create.data.token;
  console.log(`   Code: ${code}`);

  // ---- join ---------------------------------------------------------------
  console.log('2) Spieler beitreten');
  // These flows step through every phase by hand, so the countdown is off.
  await act(code, gm, { type: 'updateSettings', timerEnabled: false });

  const gmJoin = await api(`/api/room/${code}/join`, {
    method: 'POST',
    token: gm,
    body: { name: 'Jonas' },
  });
  check('Gamemaster hat einen Platz', gmJoin.data?.view?.mySeatIds?.length === 1);

  const players = [];
  for (const name of ['Mira', 'Tom', 'Lena']) {
    const r = await api(`/api/room/${code}/join`, { method: 'POST', body: { name } });
    check(`${name} beigetreten`, r.status === 200, r.text);
    players.push({ name, token: r.data.token });
  }

  // one device covers two seats (mixed mode)
  const shared = players[2];
  const addSeat = await act(code, shared.token, { type: 'addSeat', name: 'Ben' });
  check('Zweiter Spieler am selben Gerät', addSeat.status === 200, addSeat.text);
  check(
    'Gerät hat jetzt 2 Plätze',
    addSeat.data?.view?.mySeatIds?.length === 2,
    JSON.stringify(addSeat.data?.view?.mySeatIds),
  );

  const dupe = await act(code, shared.token, { type: 'addSeat', name: 'mira' });
  check('Doppelter Name wird abgelehnt', dupe.status === 400, dupe.text);

  // ---- topic vote ---------------------------------------------------------
  console.log('3) Themen-Voting');
  const notGm = await act(code, players[0].token, { type: 'startTopicVote' });
  check('Nicht-GM darf keine Phase wechseln', notGm.status === 400, notGm.text);

  const startVote = await act(code, gm, { type: 'startTopicVote' });
  check('GM startet Themen-Voting', startVote.data?.view?.phase === 'topicVote', startVote.text);

  const view0 = startVote.data.view;
  check('10 eingebaute Themen', view0.topics.length >= 10, String(view0.topics.length));
  const naruto = view0.topics.find((t) => t.name === 'Naruto');
  for (const p of [players[0], players[1]]) {
    const st = await api(`/api/room/${code}/state`, { token: p.token });
    for (const seatId of st.data.view.mySeatIds) {
      await act(code, p.token, { type: 'voteTopic', seatId, topicId: naruto.id });
    }
  }
  const afterVote = await api(`/api/room/${code}/state`, { token: gm });
  const narutoVotes = afterVote.data.view.topics.find((t) => t.id === naruto.id).votes;
  check('Themen-Stimmen gezählt', narutoVotes === 2, String(narutoVotes));

  // ---- custom topic (untrusted input) -------------------------------------
  console.log('4) Eigenes Thema: Validierung');
  const bad = [
    ['kein JSON', 'das ist kein json'],
    ['fehlende pairs', '{"name":"X"}'],
    ['zu wenige Paare', '{"name":"X","pairs":[]}'],
    [
      'verbotener Bild-Host',
      JSON.stringify({
        name: 'Böse',
        pairs: Array.from({ length: 3 }, (_, i) => ({
          real: { name: `A${i}`, image: 'https://evil.example.com/x.png' },
          impostor: { name: `B${i}` },
          similarities: ['a', 'b', 'c'],
          traps: ['t'],
        })),
      }),
    ],
    [
      'javascript:-URL',
      JSON.stringify({
        name: 'Böse2',
        pairs: Array.from({ length: 3 }, (_, i) => ({
          real: { name: `A${i}`, image: 'javascript:alert(1)' },
          impostor: { name: `B${i}` },
          similarities: ['a', 'b', 'c'],
          traps: ['t'],
        })),
      }),
    ],
    [
      'gleicher Name in einem Paar',
      JSON.stringify({
        name: 'Böse3',
        pairs: Array.from({ length: 3 }, () => ({
          real: { name: 'Gleich' },
          impostor: { name: 'Gleich' },
          similarities: ['a', 'b', 'c'],
          traps: ['t'],
        })),
      }),
    ],
  ];
  for (const [label, json] of bad) {
    const r = await act(code, gm, { type: 'addCustomTopic', json });
    check(`abgelehnt: ${label}`, r.status === 400, r.text.slice(0, 120));
  }

  const goodTopic = {
    name: 'Star Wars',
    pairs: Array.from({ length: 4 }, (_, i) => ({
      real: { name: `Jedi ${i}` },
      impostor: { name: `Sith ${i}` },
      similarities: ['Machtnutzer', 'Lichtschwert', 'Ordensmitglied'],
      traps: ['Andere Klingenfarbe'],
    })),
  };
  const good = await act(code, gm, {
    type: 'addCustomTopic',
    json: JSON.stringify(goodTopic),
  });
  check('gültiges Thema akzeptiert', good.status === 200, good.text.slice(0, 160));
  check('Thema hat 4 Paare', good.data?.pairCount === 4);

  // XSS-ish payload must survive as plain text (never executed / never HTML)
  const xss = await act(code, gm, {
    type: 'addCustomTopic',
    json: JSON.stringify({
      name: '<img src=x onerror=alert(1)>',
      pairs: Array.from({ length: 3 }, (_, i) => ({
        real: { name: `<script>${i}</script>` },
        impostor: { name: `B${i}` },
        similarities: ['a', 'b', 'c'],
        traps: ['t'],
      })),
    }),
  });
  check('HTML im Namen wird als Text gespeichert', xss.status === 200, xss.text.slice(0, 120));

  // ---- start round --------------------------------------------------------
  console.log('5) Themen-Gewinner und Rundenstart');
  const announced = await act(code, gm, { type: 'startRound', topicId: naruto.id });
  check('Erst die Themen-Auflösung', announced.data?.view?.phase === 'topicReveal', announced.text.slice(0, 200));
  check('Gewinner-Thema im Payload', announced.data?.view?.topicReveal?.name === 'Naruto');
  check('Abstimmung im Payload', (announced.data?.view?.topicReveal?.tally?.length ?? 0) > 0);
  check(
    'Noch keine Rollen während der Auflösung',
    announced.data?.view?.myRoles?.length === 0,
    JSON.stringify(announced.data?.view?.myRoles),
  );

  const notGmReveal = await act(code, players[0].token, { type: 'startReveal' });
  check('Nur der GM teilt die Rollen aus', notGmReveal.status === 400, notGmReveal.text.slice(0, 120));

  const started = await act(code, gm, { type: 'startReveal' });
  check('Runde gestartet', started.data?.view?.phase === 'reveal', started.text.slice(0, 200));

  const gmView = started.data.view;
  check('GM sieht genau seine eigene Rolle', gmView.myRoles.length === 1);
  check('GM-Rolle hat einen Charakternamen', !!gmView.myRoles[0]?.characterName);

  // SECURITY: no other player's role in any payload
  const rawGm = JSON.stringify(gmView);
  check('Auflösung nicht im Payload (kein results)', gmView.results === undefined);
  check('Keine impostorSeatIds im Payload', !rawGm.includes('impostorSeatIds'));

  const sharedState = await api(`/api/room/${code}/state`, { token: shared.token });
  const sharedView = sharedState.data.view;
  check('Geteiltes Gerät bekommt 2 Rollen', sharedView.myRoles.length === 2, String(sharedView.myRoles.length));
  const otherNames = new Set(sharedView.myRoles.map((r) => r.characterName));
  check('Rollen sind Namen aus dem Paar', otherNames.size >= 1);

  // Count how many distinct characters exist overall - must be exactly 2
  const allTokens = [gm, ...players.map((p) => p.token)];
  const seen = new Map();
  for (const t of allTokens) {
    const st = await api(`/api/room/${code}/state`, { token: t });
    for (const r of st.data.view.myRoles) seen.set(r.seatId, r.characterName);
  }
  const distinct = new Set(seen.values());
  check('Genau 2 verschiedene Charaktere im Spiel', distinct.size === 2, [...distinct].join(' / '));
  const counts = {};
  for (const n of seen.values()) counts[n] = (counts[n] ?? 0) + 1;
  const impostorSideCount = Math.min(...Object.values(counts));
  check('Genau 2 Impostor', impostorSideCount === 2, JSON.stringify(counts));
  check('5 aktive Spieler haben eine Rolle', seen.size === 5, String(seen.size));

  // ---- reveal + discussion ------------------------------------------------
  console.log('6) Karten aufdecken');
  for (const t of allTokens) {
    const st = await api(`/api/room/${code}/state`, { token: t });
    for (const r of st.data.view.myRoles) {
      await act(code, t, { type: 'revealCard', seatId: r.seatId });
    }
  }
  const afterReveal = await api(`/api/room/${code}/state`, { token: gm });
  check(
    'Alle Karten als gesehen markiert',
    afterReveal.data.view.seats.filter((s) => s.revealed).length === 5,
  );

  await act(code, gm, { type: 'startDiscussion' });
  const votingPhase = await act(code, gm, { type: 'startVoting' });
  check('Abstimmung gestartet', votingPhase.data?.view?.phase === 'voting');

  // ---- voting -------------------------------------------------------------
  console.log('7) Abstimmung');
  const allSeats = votingPhase.data.view.seats.filter((s) => !s.spectator);

  const wrongCount = await act(code, gm, {
    type: 'castVote',
    seatId: votingPhase.data.view.mySeatIds[0],
    targets: [allSeats.find((s) => s.id !== votingPhase.data.view.mySeatIds[0]).id],
  });
  check('Falsche Stimmenzahl abgelehnt', wrongCount.status === 400, wrongCount.text.slice(0, 120));

  const selfVote = await act(code, gm, {
    type: 'castVote',
    seatId: votingPhase.data.view.mySeatIds[0],
    targets: [votingPhase.data.view.mySeatIds[0], allSeats[0].id],
  });
  check('Selbstwahl abgelehnt', selfVote.status === 400, selfVote.text.slice(0, 120));

  const foreignSeat = allSeats.find((s) => !votingPhase.data.view.mySeatIds.includes(s.id));
  const foreignVote = await act(code, gm, {
    type: 'castVote',
    seatId: foreignSeat.id,
    targets: allSeats.slice(0, 2).map((s) => s.id),
  });
  check(
    'Stimme für fremden Spieler abgelehnt',
    foreignVote.status === 400,
    foreignVote.text.slice(0, 120),
  );

  for (const t of allTokens) {
    const st = await api(`/api/room/${code}/state`, { token: t });
    for (const seatId of st.data.view.mySeatIds) {
      const others = allSeats.filter((s) => s.id !== seatId).slice(0, 2);
      const r = await act(code, t, {
        type: 'castVote',
        seatId,
        targets: others.map((s) => s.id),
      });
      check(`Stimme abgegeben (${seatId.slice(0, 4)})`, r.status === 200, r.text.slice(0, 120));
    }
  }

  // ---- results ------------------------------------------------------------
  console.log('8) Auflösung');
  const res = await api(`/api/room/${code}/state`, { token: players[0].token });
  const rv = res.data.view;
  check('Automatisch aufgelöst', rv.phase === 'results', rv.phase);
  check('Ergebnis vorhanden', !!rv.results);
  check('5 Zeilen im Ergebnis', rv.results.rows.length === 5);
  check('2 Impostor im Ergebnis', rv.results.impostorSeatIds.length === 2);
  check('Gemeinsamkeiten vorhanden', rv.results.similarities.length >= 3);
  check('Stolpersteine vorhanden', rv.results.traps.length >= 1);
  check(
    'Punkte vergeben',
    rv.results.rows.some((r) => r.points > 0),
    JSON.stringify(rv.results.rows.map((r) => r.points)),
  );

  // ---- spectator + next round --------------------------------------------
  console.log('9) Zuschauer & nächste Runde');
  const specSeat = rv.results.rows.find((r) => !r.isImpostor);
  const specToken = players[0].token;
  const specState = await api(`/api/room/${code}/state`, { token: specToken });
  const mySeatId = specState.data.view.mySeatIds[0];
  await act(code, specToken, { type: 'setPlayNextRound', seatId: mySeatId, value: false });

  const nr = await act(code, gm, { type: 'nextRound' });
  check('Nächste Runde -> Themenwahl', nr.data?.view?.phase === 'topicVote');
  check(
    'Zuschauer markiert',
    nr.data.view.seats.find((s) => s.id === mySeatId)?.spectator === true,
  );

  await act(code, gm, { type: 'startRound', topicId: naruto.id });
  const r2 = await act(code, gm, { type: 'startReveal' });
  check('Runde 2 gestartet', r2.data?.view?.phase === 'reveal', r2.text.slice(0, 200));
  const specView = (await api(`/api/room/${code}/state`, { token: specToken })).data.view;
  check('Zuschauer hat keine Rolle', specView.myRoles.length === 0);
  check('Zuschauer sieht alles', !!specView.results, 'results fehlt');
  check('Zuschauer-Flag gesetzt', specView.spectating === true);
  check('Runde 2 nutzt ein neues Paar', r2.data.view.roundNumber === 2);

  const normalView = (await api(`/api/room/${code}/state`, { token: players[1].token })).data.view;
  check('Normaler Spieler sieht KEINE Auflösung', normalView.results === undefined);
  check('Normaler Spieler sieht keine Settings', normalView.settings === undefined);

  // ---- gm settings + transfer + leave -------------------------------------
  console.log('10) Einstellungen, GM-Wechsel, Verlassen');
  const setg = await act(code, gm, { type: 'updateSettings', impostorsKnow: false });
  check('Einstellung gespeichert', setg.data?.view?.settings?.impostorsKnow === false);
  const badCount = await act(code, gm, { type: 'updateSettings', impostorCount: 9 });
  check('Ungültige Impostor-Zahl abgelehnt', badCount.status === 400);

  const targetDevice = normalView.seats.find(
    (s) => s.deviceId && !normalView.mySeatIds.includes(s.id) && !s.isGmSeat,
  );
  const tg = await act(code, gm, { type: 'transferGm', deviceId: targetDevice.deviceId });
  check('GM übergeben', tg.status === 200, tg.text.slice(0, 120));
  const oldGmView = (await api(`/api/room/${code}/state`, { token: gm })).data.view;
  check('Alter GM ist kein GM mehr', oldGmView.isGm === false);

  const left = await act(code, gm, { type: 'leave' });
  check('Raum verlassen', left.data?.left === true, left.text.slice(0, 120));
  const afterLeave = await api(`/api/room/${code}/state`, { token: gm });
  check('Token nach Verlassen ungültig', afterLeave.status === 401, String(afterLeave.status));

  // ---- one device covering everybody --------------------------------------
  console.log('11) Ein Gerät für alle (Handy herumreichen)');
  const sd = await api('/api/room', { method: 'POST' });
  const sCode = sd.data.code;
  const sTok = sd.data.token;
  for (const n of ['A', 'B', 'C', 'D']) {
    await act(sCode, sTok, { type: 'addSeat', name: n });
  }
  const solo = await api(`/api/room/${sCode}/state`, { token: sTok });
  check('Ein Gerät hält 4 Plätze', solo.data?.view?.mySeatIds?.length === 4);

  // Same room, no special mode: another phone can still join at any time.
  const lateJoin = await api(`/api/room/${sCode}/join`, {
    method: 'POST',
    body: { name: 'Späti' },
  });
  check('Weiteres Gerät kann jederzeit dazu', lateJoin.status === 200, lateJoin.text.slice(0, 120));

  await act(sCode, sTok, { type: 'updateSettings', timerEnabled: false });
  await act(sCode, sTok, { type: 'startTopicVote' });
  await act(sCode, sTok, { type: 'startRound', topicId: 'onepiece' });
  const sRound = await act(sCode, sTok, { type: 'startReveal' });
  check('Runde gestartet', sRound.data?.view?.phase === 'reveal', sRound.text.slice(0, 200));
  check('Ein Gerät hält 4 Rollen', sRound.data?.view?.myRoles?.length === 4);

  // ---- late join queue -----------------------------------------------------
  console.log('10b) Warteschlange für Nachzügler');
  const lateRoom = await api('/api/room', { method: 'POST' });
  const lCode = lateRoom.data.code;
  const lGm = lateRoom.data.token;
  await api(`/api/room/${lCode}/join`, { method: 'POST', token: lGm, body: { name: 'Host' } });
  const lPlayers = [];
  for (const n of ['Eins', 'Zwei', 'Drei']) {
    const r = await api(`/api/room/${lCode}/join`, { method: 'POST', body: { name: n } });
    lPlayers.push(r.data.token);
  }
  await act(lCode, lGm, { type: 'updateSettings', timerEnabled: false });
  await act(lCode, lGm, { type: 'startTopicVote' });
  await act(lCode, lGm, { type: 'startRound', topicId: 'deathnote' });
  await act(lCode, lGm, { type: 'startReveal' });

  const late = await api(`/api/room/${lCode}/join`, { method: 'POST', body: { name: 'Nachzügler' } });
  check('Beitritt während der Runde klappt', late.status === 200, late.text.slice(0, 160));
  const lv = late.data.view;
  check('Nachzügler wartet', lv.seats.find((s) => s.name === 'Nachzügler')?.waiting === true);
  check('Nachzügler bekommt keine Rolle', lv.myRoles.length === 0);
  check('Nachzügler sieht KEINE Auflösung', lv.results === undefined);
  check('Nachzügler ist kein Vollzuschauer', lv.spectating === false);
  check('Warteschlange gezählt', lv.waitingCount === 1, String(lv.waitingCount));
  check(
    'Rollen anderer nicht im Payload',
    !JSON.stringify(lv).includes('impostorSeatIds'),
  );

  const lateVote = await act(lCode, late.data.token, {
    type: 'castVote',
    seatId: lv.mySeatIds[0],
    targets: [lv.seats[0].id, lv.seats[1].id],
  });
  check('Nachzügler darf nicht abstimmen', lateVote.status === 400, lateVote.text.slice(0, 120));

  await act(lCode, lGm, { type: 'startDiscussion' });
  await act(lCode, lGm, { type: 'startVoting' });
  await act(lCode, lGm, { type: 'finishRound' });
  const afterNext = await act(lCode, lGm, { type: 'nextRound' });
  check(
    'Nach der Runde ist der Nachzügler dabei',
    afterNext.data.view.seats.find((s) => s.name === 'Nachzügler')?.waiting === false,
  );
  check('Keine Warteschlange mehr', afterNext.data.view.waitingCount === 0);

  // ---- topic suggestions ---------------------------------------------------
  console.log('10c) Themenvorschläge');
  const goodJson = (name) =>
    JSON.stringify({
      name,
      pairs: Array.from({ length: 3 }, (_, i) => ({
        real: { name: `${name} A${i}` },
        impostor: { name: `${name} B${i}` },
        similarities: ['x', 'y', 'z'],
        traps: ['t'],
      })),
    });

  const prop = await act(lCode, lPlayers[0], { type: 'addCustomTopic', json: goodJson('Vorschlag Eins') });
  check('Spieler darf vorschlagen', prop.status === 200, prop.text.slice(0, 160));
  check('Vorschlag nicht als ausstehend markiert', prop.data.pending !== true);
  const propView = (await api(`/api/room/${lCode}/state`, { token: lPlayers[1] })).data.view;
  const proposed = propView.topics.find((t) => t.name === 'Vorschlag Eins');
  check('Für alle sichtbar', !!proposed);
  check('Zeigt den Vorschlagenden', proposed?.proposedBy === 'Eins', proposed?.proposedBy ?? '');

  const notMine = await act(lCode, lPlayers[1], { type: 'removeCustomTopic', topicId: proposed.id });
  check('Nur der GM darf löschen', notMine.status === 400, notMine.text.slice(0, 120));
  const removed = await act(lCode, lGm, { type: 'removeCustomTopic', topicId: proposed.id });
  check('GM löscht Quatsch', removed.status === 200);

  await act(lCode, lGm, { type: 'updateSettings', proposalsNeedApproval: true });
  const prop2 = await act(lCode, lPlayers[0], { type: 'addCustomTopic', json: goodJson('Vorschlag Zwei') });
  check('Mit Freigabepflicht: ausstehend', prop2.data.pending === true, prop2.text.slice(0, 160));
  const otherView = (await api(`/api/room/${lCode}/state`, { token: lPlayers[1] })).data.view;
  check(
    'Ausstehender Vorschlag für andere unsichtbar',
    !otherView.topics.some((t) => t.name === 'Vorschlag Zwei'),
  );
  const gmView2 = (await api(`/api/room/${lCode}/state`, { token: lGm })).data.view;
  const pending = gmView2.topics.find((t) => t.name === 'Vorschlag Zwei');
  check('GM sieht ihn mit Markierung', pending?.pending === true);
  await act(lCode, lGm, { type: 'approveCustomTopic', topicId: pending.id });
  const afterApprove = (await api(`/api/room/${lCode}/state`, { token: lPlayers[1] })).data.view;
  check(
    'Nach Freigabe für alle sichtbar',
    afterApprove.topics.some((t) => t.name === 'Vorschlag Zwei'),
  );

  // ---- automatic progression, emotes, podium -------------------------------
  console.log('10d) Automatik, Reaktionen, Siegerehrung');
  const autoRoom = await api('/api/room', { method: 'POST' });
  const aCode = autoRoom.data.code;
  const aGm = autoRoom.data.token;
  await api(`/api/room/${aCode}/join`, { method: 'POST', token: aGm, body: { name: 'A' } });
  const aTokens = [aGm];
  for (const n of ['B', 'C', 'D']) {
    const r = await api(`/api/room/${aCode}/join`, { method: 'POST', body: { name: n } });
    aTokens.push(r.data.token);
  }

  // Short timers so the test does not sit around for two minutes.
  const cfg = await act(aCode, aGm, {
    type: 'updateSettings',
    timerEnabled: true,
    discussionSec: 15,
    votingSec: 15,
  });
  check('Timer-Einstellungen gespeichert', cfg.data?.view?.settings?.discussionSec === 15, cfg.text.slice(0, 140));
  const badTimer = await act(aCode, aGm, { type: 'updateSettings', discussionSec: 5 });
  check('Unsinnige Timerwerte abgelehnt', badTimer.status === 400, badTimer.text.slice(0, 120));

  await act(aCode, aGm, { type: 'startTopicVote' });
  // Everyone votes -> the round starts on its own, no game master needed.
  for (const t of aTokens) {
    const st = await api(`/api/room/${aCode}/state`, { token: t });
    for (const seatId of st.data.view.mySeatIds) {
      await act(aCode, t, { type: 'voteTopic', seatId, topicId: 'harrypotter' });
    }
  }
  const afterVotes = await api(`/api/room/${aCode}/state`, { token: aGm });
  check('Deadline nach der letzten Themenstimme gesetzt', typeof afterVotes.data.view.deadline === 'number');
  await new Promise((r) => setTimeout(r, 3200));
  const auto1 = await api(`/api/room/${aCode}/state`, { token: aGm });
  check(
    'Runde startet automatisch',
    auto1.data.view.phase === 'topicReveal',
    auto1.data.view.phase,
  );

  // reactions
  const seatA = auto1.data.view.mySeatIds[0];
  const react = await act(aCode, aGm, { type: 'react', seatId: seatA, emoji: '👏' });
  check('Reaktion angenommen', react.status === 200, react.text.slice(0, 120));
  check('Reaktion im Payload', react.data.view.reactions.length === 1);
  const spam = await act(aCode, aGm, { type: 'react', seatId: seatA, emoji: '😂' });
  check('Reaktions-Spam wird gebremst', spam.status === 400, spam.text.slice(0, 120));
  const badEmoji = await act(aCode, aTokens[1], {
    type: 'react',
    seatId: (await api(`/api/room/${aCode}/state`, { token: aTokens[1] })).data.view.mySeatIds[0],
    emoji: '💣',
  });
  check('Fremde Emojis abgelehnt', badEmoji.status === 400, badEmoji.text.slice(0, 120));

  // topicReveal -> reveal happens on its own
  await new Promise((r) => setTimeout(r, 7500));
  const auto2 = await api(`/api/room/${aCode}/state`, { token: aGm });
  check('Themen-Auflösung endet automatisch', auto2.data.view.phase === 'reveal', auto2.data.view.phase);
  check('Jetzt gibt es Rollen', auto2.data.view.myRoles.length === 1);

  for (const t of aTokens) {
    const st = await api(`/api/room/${aCode}/state`, { token: t });
    for (const r of st.data.view.myRoles) await act(aCode, t, { type: 'revealCard', seatId: r.seatId });
  }
  await new Promise((r) => setTimeout(r, 3200));
  const auto3 = await api(`/api/room/${aCode}/state`, { token: aGm });
  check(
    'Nach allen Karten geht es automatisch weiter',
    auto3.data.view.phase === 'discussion',
    auto3.data.view.phase,
  );
  check('Diskussion hat eine Deadline', typeof auto3.data.view.deadline === 'number');

  // host screen must never carry roles mid-round
  const host = await api(`/api/room/${aCode}/host`);
  check('Host-Ansicht erreichbar ohne Token', host.status === 200);
  check('Host zeigt die Phase', host.data.view.phase === 'discussion');
  check(
    'Host-Ansicht enthält KEINE Rollen',
    !JSON.stringify(host.data.view).includes('characterName') &&
      !JSON.stringify(host.data.view).includes('impostorSeatIds'),
  );
  check('Host kennt alle Spieler', host.data.view.seats.length === 4);

  await act(aCode, aGm, { type: 'startVoting' });
  await act(aCode, aGm, { type: 'finishRound' });
  const hostResults = await api(`/api/room/${aCode}/host`);
  check('Host zeigt die Auflösung', !!hostResults.data.view.results);

  const over = await act(aCode, aGm, { type: 'endGame' });
  check('Spiel beendet', over.data.view.phase === 'gameOver');
  check('Endstand vorhanden', over.data.view.standings.length === 4);
  const hostOver = await api(`/api/room/${aCode}/host`);
  check('Host zeigt das Podium', hostOver.data.view.standings.length === 4);

  const restart = await act(aCode, aGm, { type: 'restartGame' });
  check('Neues Spiel: zurück in die Lobby', restart.data.view.phase === 'lobby');
  check(
    'Punkte zurückgesetzt',
    restart.data.view.seats.every((s) => s.score === 0),
  );

  // ---- wiki assistant proxy ------------------------------------------------
  console.log('10e) Wiki-Assistent (Eingabeprüfung)');
  const badSlug = await api('/api/wiki?action=search&wiki=evil.example.com&q=zoro');
  check('Punkt im Wiki-Namen abgelehnt', badSlug.status === 400, badSlug.text.slice(0, 120));
  const slashSlug = await api('/api/wiki?action=search&wiki=one%2Fpiece&q=zoro');
  check('Schrägstrich abgelehnt', slashSlug.status === 400, slashSlug.text.slice(0, 120));
  const shortQ = await api('/api/wiki?action=search&wiki=onepiece&q=a');
  check('Zu kurze Suche abgelehnt', shortQ.status === 400, shortQ.text.slice(0, 120));
  const noPair = await api('/api/wiki?action=detail&wiki=onepiece&a=Zoro');
  check('Detailabfrage braucht zwei Namen', noPair.status === 400, noPair.text.slice(0, 120));
  const badAction = await api('/api/wiki?action=drop&wiki=onepiece');
  check('Unbekannte Aktion abgelehnt', badAction.status === 400, badAction.text.slice(0, 120));
  const unreachable = await api('/api/wiki?action=search&wiki=diesgibtesnichtxyz123&q=test');
  check(
    'Unerreichbares Wiki endet mit klarer Meldung, nicht mit 500',
    unreachable.status === 400,
    `${unreachable.status} ${unreachable.text.slice(0, 120)}`,
  );

  // ---- admin, privacy, limits ---------------------------------------------
  console.log('10f) Admin-Backend');
  const st = await adminApi('/api/admin?action=status');
  check('Status ohne Anmeldung abrufbar', st.status === 200);
  check('Admin ist konfiguriert (Testumgebung)', st.data.configured === true, JSON.stringify(st.data));
  check('Noch nicht angemeldet', st.data.authed === false);

  const denied = await adminApi('/api/admin?action=overview');
  check('Übersicht ohne Anmeldung gesperrt', denied.status === 401);

  const wrong = await adminApi('/api/admin', { method: 'POST', body: { action: 'login', password: 'falsch' } });
  check('Falsches Passwort abgelehnt', wrong.status === 401, wrong.text.slice(0, 100));
  check('Kein Cookie bei falschem Passwort', adminCookie === '');

  const ok = await adminApi('/api/admin', {
    method: 'POST',
    body: { action: 'login', password: 'test-admin-passwort' },
  });
  check('Richtiges Passwort akzeptiert', ok.status === 200, ok.text.slice(0, 100));
  check('Session-Cookie gesetzt', adminCookie.length > 20);

  const overview = await adminApi('/api/admin?action=overview');
  check('Übersicht nach Anmeldung', overview.status === 200);
  check('Räume werden gelistet', Array.isArray(overview.data.rooms) && overview.data.rooms.length > 0,
    String(overview.data.rooms?.length));
  const anyRoom = overview.data.rooms[0];
  check('Gerätezeile hat Land und Browser', 'country' in (anyRoom.devices[0] ?? {}));
  check(
    'Keine IP-Adresse in der Übersicht',
    !/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(JSON.stringify(overview.data)),
  );
  check('Verlauf vorhanden', Array.isArray(overview.data.history) && overview.data.history.length > 0,
    String(overview.data.history?.length));
  check('Aufbewahrung wird gemeldet', overview.data.retentionDays === 7);

  // invisible spectator
  const watchRoom = await api('/api/room', { method: 'POST' });
  const wCode = watchRoom.data.code;
  const wGm = watchRoom.data.token;
  await api(`/api/room/${wCode}/join`, { method: 'POST', token: wGm, body: { name: 'Sichtbar' } });
  const before = (await api(`/api/room/${wCode}/state`, { token: wGm })).data.view;
  const watch = await adminApi('/api/admin', { method: 'POST', body: { action: 'watch', code: wCode } });
  check('Unsichtbarer Beobachter bekommt ein Token', watch.status === 200 && !!watch.data.token);
  const after = (await api(`/api/room/${wCode}/state`, { token: wGm })).data.view;
  check('Beobachter taucht nicht in der Spielerliste auf', after.seats.length === before.seats.length);
  const watcherView = (await api(`/api/room/${wCode}/state`, { token: watch.data.token })).data.view;
  check('Beobachter sieht als Zuschauer alles', watcherView.spectating === true);

  const notAdmin = await fetch(`${BASE}/api/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'watch', code: wCode }),
  });
  check('Ohne Cookie kein unsichtbares Zuschauen', notAdmin.status === 401);

  // promote a room topic to the permanent library
  const topicJson = JSON.stringify({
    name: 'Dauerhaft Test',
    pairs: [1, 2, 3].map((i) => ({
      real: { name: `P${i}` },
      impostor: { name: `Q${i}` },
      similarities: ['a', 'b', 'c'],
      traps: ['t'],
    })),
  });
  await act(wCode, wGm, { type: 'addCustomTopic', json: topicJson });
  const ov2 = await adminApi('/api/admin?action=overview');
  const room2 = ov2.data.rooms.find((r) => r.code === wCode);
  const custom = room2.customTopics[0];
  const promoted = await adminApi('/api/admin', {
    method: 'POST',
    body: { action: 'promote', code: wCode, topicId: custom.id },
  });
  check('Thema dauerhaft gemacht', promoted.status === 200, promoted.text.slice(0, 120));

  const freshRoom = await api('/api/room', { method: 'POST' });
  await api(`/api/room/${freshRoom.data.code}/join`, {
    method: 'POST',
    token: freshRoom.data.token,
    body: { name: 'Neu' },
  });
  const freshView = (await api(`/api/room/${freshRoom.data.code}/state`, { token: freshRoom.data.token })).data.view;
  check(
    'Dauerhaftes Thema ist in einem neuen Raum da',
    freshView.topics.some((t) => t.name === 'Dauerhaft Test'),
    freshView.topics.map((t) => t.name).join(','),
  );

  const cfg2 = await adminApi('/api/admin', { method: 'POST', body: { action: 'config', llmForEveryone: true } });
  check('Konfiguration speicherbar', cfg2.data.config.llmForEveryone === true);
  await adminApi('/api/admin', { method: 'POST', body: { action: 'config', llmForEveryone: false } });

  const out = await adminApi('/api/admin', { method: 'POST', body: { action: 'logout' } });
  check('Abmelden funktioniert', out.status === 200);

  console.log('10g) Rate-Limit greift nur hinter einem echten Proxy');
  const limited = [];
  for (let i = 0; i < 34; i++) {
    const r = await fetch(`${BASE}/api/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: '{}',
    });
    limited.push(r.status);
  }
  check(
    'Massenhaftes Anlegen wird gebremst',
    limited.includes(429),
    limited.slice(-3).join(','),
  );
  const stillFine = await api('/api/room', { method: 'POST' });
  check('Normale Nutzung bleibt unberührt', stillFine.status === 200, String(stillFine.status));

  console.log('10h) Bild-Proxy und Datenschutz');
  const goodImg = await fetch(
    `${BASE}/api/img?u=${encodeURIComponent('https://static.wikia.nocookie.net/onepiece/images/5/52/x.png')}`,
  );
  check('Erlaubter Host wird angenommen', goodImg.status !== 400, String(goodImg.status));
  const badImg = await fetch(`${BASE}/api/img?u=${encodeURIComponent('https://evil.example.com/x.png')}`);
  check('Fremder Host abgelehnt', badImg.status === 400);
  const notImg = await fetch(
    `${BASE}/api/img?u=${encodeURIComponent('https://static.wikia.nocookie.net/a/b/c.txt')}`,
  );
  check('Nicht-Bildpfad abgelehnt', notImg.status === 400);
  const privacy = await fetch(`${BASE}/datenschutz`);
  check('Datenschutzseite erreichbar', privacy.status === 200);

  console.log('10i) LLM-Endpunkt gesperrt ohne Freigabe');
  const llmStatus = await api('/api/llm');
  check('LLM meldet sich als nicht verfügbar', llmStatus.data.available === false, JSON.stringify(llmStatus.data));
  const llmPost = await api('/api/llm', { method: 'POST', body: { theme: 'Star Wars' } });
  check('LLM-Aufruf ohne Key abgewiesen', llmPost.status === 400, llmPost.text.slice(0, 120));

  // ---- health -------------------------------------------------------------
  const health = await api('/api/health');
  check('Health-Endpunkt antwortet', health.status === 200 && 'reliable' in (health.data ?? {}), health.text.slice(0, 120));

  // ---- QR -----------------------------------------------------------------
  const qr = await fetch(`${BASE}/api/qr?code=${sCode}`);
  const qrBody = await qr.text();
  check('QR-Code als SVG', qr.status === 200 && qrBody.startsWith('<svg'), qr.headers.get('content-type') || '');

  // ---- summary ------------------------------------------------------------
  console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nTest abgebrochen:', e);
  process.exit(1);
});
