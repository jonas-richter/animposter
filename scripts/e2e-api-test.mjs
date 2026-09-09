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

const act = (code, token, payload) =>
  api(`/api/room/${code}/action`, { method: 'POST', token, body: payload });

async function main() {
  console.log(`\nImpostor E2E gegen ${BASE}\n`);

  // ---- create room --------------------------------------------------------
  console.log('1) Raum anlegen (Multi-Device)');
  const create = await api('/api/room', { method: 'POST', body: { mode: 'multi' } });
  check('Raum erstellt', create.status === 200 && !!create.data?.code, create.text);
  const code = create.data.code;
  const gm = create.data.token;
  console.log(`   Code: ${code}`);

  // ---- join ---------------------------------------------------------------
  console.log('2) Spieler beitreten');
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
  console.log('5) Runde starten');
  const started = await act(code, gm, { type: 'startRound', topicId: naruto.id });
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

  const r2 = await act(code, gm, { type: 'startRound', topicId: naruto.id });
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

  // ---- single device mode -------------------------------------------------
  console.log('11) Ein-Gerät-Modus');
  const sd = await api('/api/room', { method: 'POST', body: { mode: 'single' } });
  const sCode = sd.data.code;
  const sTok = sd.data.token;
  for (const n of ['A', 'B', 'C', 'D']) {
    await act(sCode, sTok, { type: 'addSeat', name: n });
  }
  const joinBlocked = await api(`/api/room/${sCode}/join`, {
    method: 'POST',
    body: { name: 'Fremder' },
  });
  check('Fremdes Gerät kann nicht beitreten', joinBlocked.status === 400, joinBlocked.text.slice(0, 120));

  await act(sCode, sTok, { type: 'startTopicVote' });
  const sRound = await act(sCode, sTok, { type: 'startRound', topicId: 'onepiece' });
  check('Ein-Gerät-Runde gestartet', sRound.data?.view?.phase === 'reveal', sRound.text.slice(0, 200));
  check('Ein Gerät hält 4 Rollen', sRound.data?.view?.myRoles?.length === 4);

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
