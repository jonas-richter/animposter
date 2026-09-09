# Impostor 🎭

Ein Party-Spiel für Smartphones. Alle Spieler bekommen denselben Charakter aus einem
Anime/Serien-Universum – bis auf zwei. Die reden mit, ohne es zu wissen (oder wissend, je nach
Einstellung). Am Ende wird abgestimmt, wer die Impostor waren.

Komplett auf Deutsch, mobile-first, dunkles UI.

---

## Inhalt

1. [Schnellstart (lokal)](#1-schnellstart-lokal)
2. [Deployment auf Vercel](#2-deployment-auf-vercel)
3. [Deployment auf Netlify](#3-deployment-auf-netlify)
4. [Wie man spielt](#4-wie-man-spielt)
5. [Eigene Themen hinzufügen](#5-eigene-themen-hinzufügen)
6. [Bilder](#6-bilder)
7. [Tests](#7-tests)
8. [Technik & Entscheidungen](#8-technik--entscheidungen)

---

## 1. Schnellstart (lokal)

Vorausgesetzt ist [Node.js](https://nodejs.org) ab Version 20 (LTS reicht).

```bash
npm install
npm run dev
```

Dann im Browser `http://localhost:3000` öffnen. **Fertig – keine Datenbank, kein Account, nichts.**

Damit andere Handys im WLAN mitspielen können, brauchst du statt `localhost` die IP deines
Rechners, z.B. `http://192.168.1.42:3000`. Die findest du so:

- **macOS:** `ipconfig getifaddr en0`
- **Windows:** `ipconfig` → "IPv4-Adresse"
- **Linux:** `hostname -I`

Starte dann `npm run dev -- -H 0.0.0.0`, damit der Server auch von außen erreichbar ist.
Der QR-Code in der Lobby zeigt automatisch auf die Adresse, über die du die Seite aufgerufen hast.

> Für ein echtes Spiel unterwegs (verschiedene Mobilfunknetze) lohnt sich das Deployment –
> siehe nächster Abschnitt.

---

## 2. Deployment auf Vercel

Das ist der empfohlene Weg. Zwei Schritte: erst hochladen, dann (optional, aber empfohlen)
einen Speicher dazuklicken.

### Schritt 1: Projekt hochladen

**Variante A – über GitHub (empfohlen, erlaubt spätere Updates per Push):**

1. Lege dir einen kostenlosen Account auf [github.com](https://github.com) an, falls noch nicht vorhanden.
2. Erstelle ein neues, leeres Repository (z.B. `impostor`), **ohne** README/`.gitignore`.
3. Im Projektordner im Terminal:
   ```bash
   git init
   git add .
   git commit -m "Impostor"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/impostor.git
   git push -u origin main
   ```
4. Auf [vercel.com](https://vercel.com) mit dem GitHub-Account einloggen → **Add New… → Project**
   → das Repository auswählen → **Deploy**.
5. Vercel erkennt Next.js automatisch. Es sind **keine** Einstellungen nötig.
6. Nach ~1 Minute bekommst du eine URL wie `https://impostor-xyz.vercel.app`.

**Variante B – ohne GitHub, direkt vom Rechner:**

```bash
npm i -g vercel
vercel login
vercel            # Fragen mit Enter bestätigen -> Vorschau-Deployment
vercel --prod     # produktive URL
```

### Schritt 2: Speicher hinzufügen (wichtig für echte Partys)

Ohne externen Speicher liegt der Spielstand im Arbeitsspeicher der Serverless-Funktion. Vercel
startet bei mehreren gleichzeitigen Anfragen **mehrere Instanzen** – dann sehen zwei Handys
unterschiedliche Spielstände. Für 8 Leute, die alle gleichzeitig pollen, passiert das garantiert.

Die Lösung ist ein Klick-Vorgang und kostenlos:

1. Im Vercel-Dashboard das Projekt öffnen → Tab **Storage**.
2. **Create Database** → **Upstash for Redis** (im Marketplace) auswählen → Region in Europa
   (z.B. Frankfurt) → **Create**.
   Ein separater Upstash-Account ist nicht nötig, Vercel legt alles an.
3. **Connect to Project** → dein Impostor-Projekt auswählen → alle Environments.
4. Vercel setzt die Umgebungsvariablen `KV_REST_API_URL` und `KV_REST_API_TOKEN` automatisch.
5. Tab **Deployments** → beim neuesten Deployment auf **…** → **Redeploy**.

Die App erkennt die Variablen selbst und schaltet um. Nichts im Code ändern.
Der kostenlose Upstash-Tarif (10.000 Befehle/Tag) reicht für viele Spieleabende locker.

> **Ohne diesen Schritt läuft es trotzdem** – solange nur wenige Leute gleichzeitig spielen und
> du Glück hast. Für einen entspannten Abend: einfach machen, dauert zwei Minuten.

### „Raum nicht gefunden" / Spieler fliegen raus

Das ist **immer** dieses fehlende Storage. Ohne Redis liegt der Spielstand im Arbeitsspeicher
genau einer Serverless-Instanz. Die nächste Anfrage landet auf einer anderen Instanz, die den
Raum nicht kennt – und schon ist man draußen.

Die App merkt das selbst: Ist kein Speicher verbunden, steht auf der Startseite ein gelber
Hinweis. Prüfen kannst du es auch direkt unter `https://DEINE-URL/api/health`:

```json
{ "backend": "redis", "serverless": true, "reliable": true }
```

Steht dort `"backend": "memory"`, fehlt der Schritt oben. Nach dem Verbinden **einmal neu
deployen**, sonst kennt die laufende Version die Variablen noch nicht.

---

## 3. Deployment auf Netlify

Funktioniert ebenfalls, mit dem offiziellen Next.js-Adapter (den installiert Netlify selbst).

1. Projekt wie oben zu GitHub pushen.
2. Auf [netlify.com](https://netlify.com) → **Add new site → Import an existing project** →
   Repository auswählen.
3. Build command: `npm run build`, Publish directory: `.next` (wird meist automatisch erkannt).
4. **Deploy**.

Auch hier gilt: für synchronen Spielstand über mehrere Instanzen hinweg brauchst du Redis.
Bei Netlify legst du dazu direkt bei [upstash.com](https://upstash.com) eine kostenlose
Redis-Datenbank an und trägst unter **Site settings → Environment variables** ein:

| Variable                   | Wert                             |
| -------------------------- | -------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | aus dem Upstash-Dashboard        |
| `UPSTASH_REDIS_REST_TOKEN` | aus dem Upstash-Dashboard        |

Danach einmal neu deployen.

---

## 4. Wie man spielt

### Raum anlegen

Es gibt nur einen Knopf: **Raum erstellen**. Danach zeigt die Lobby Raumcode und QR-Code.

Wie gespielt wird, ergibt sich von selbst:

- **Jeder mit eigenem Handy** → alle scannen den QR-Code (oder tippen den Code auf der
  Startseite ein) und geben ihren Namen ein.
- **Ein Handy für alle** → niemand scannt, stattdessen trägt der Gamemaster in der Lobby unter
  „Dein Name" bzw. „Ohne eigenes Handy dabei?" alle Namen nacheinander ein.
- **Mischung aus beidem** → genau so, wie es kommt. Wer ein Handy hat, scannt; für alle anderen
  ergänzt jemand den Namen auf seinem Gerät.

Sobald ein Gerät für **mehr als einen** Spieler zuständig ist, schaltet es automatisch in den
Weitergabe-Ablauf: neutraler Übergabe-Screen („Handy weitergeben an Lena") → Karte antippen →
„Gesehen – weitergeben" → Karte dreht sich zurück → nächster Übergabe-Screen. Beim Voting genauso.

**Für den Normalfall (ein Spieler pro Handy) gibt es diese Screens nicht** – da tippt man direkt
auf die eigene Karte, sonst nichts.

Über das **⋯-Menü** lassen sich Plätze später freigeben oder von einem anderen Handy übernehmen,
falls jemand doch noch mit dem eigenen Gerät einsteigt.

### Ablauf einer Runde

1. **Lobby** – Spieler sammeln, Zuschauer festlegen.
2. **Themenwahl** – alle stimmen über das Universum ab. Der Gamemaster kann das Ergebnis
   übernehmen oder über das Auswahlfeld etwas anderes wählen.
3. **Rollen ansehen** – jeder deckt seine Karte per Tap auf (Swipe geht auch). Der Gamemaster
   sieht einen Fortschrittsbalken, wer schon geschaut hat.
4. **Diskussion** – reihum ein Satz über den eigenen Charakter. Vage genug, dass ein Impostor
   nicht sofort auffliegt, konkret genug, dass die anderen etwas merken.
5. **Abstimmung** – jeder wählt genau so viele Verdächtige, wie es Impostor gibt (Standard: 2).
   Angezeigt wird nur, **ob** jemand gewählt hat – nie, für wen.
6. **Auflösung** – wer hatte welchen Charakter, wer war Impostor, die Gemeinsamkeiten, die
   Stolpersteine, das Voting-Ergebnis und die Punkte.
7. **Nächste Runde** – Lobby bleibt bestehen, neue Auslosung.

### Punkte

- **+2** für jeden korrekt erkannten Impostor.
- **+3** für einen Impostor, der **nicht** zu den meistgewählten Spielern gehört.

### Zuschauen

Tippe in der Lobby (oder nach der Auflösung) einfach auf deinen Namen – der Platz wechselt dann
zwischen Mitspielen und Zuschauen. Zuschauer sehen **alles**, inklusive wer Impostor ist – das steht auch
deutlich im Interface. Nochmal antippen, und man ist zur nächsten Runde wieder dabei.

Ein Gamemaster, der gar keinen Namen eingetragen hat, leitet nur – er ist damit ebenfalls
Zuschauer und sieht alle Rollen.

### Anzahl der Impostor

Stellt der Gamemaster in der Lobby ein (1 bis 3) – und nach jeder Auflösung erneut für die
nächste Runde. Die Zahl bestimmt auch, wie viele Stimmen jeder in der Abstimmung hat.
Mindestens `Impostor + 2` Mitspielende werden gebraucht.

### Das Zahnrad ⚙︎

Nur der Gamemaster sieht es, oben in der Kopfzeile. Darin steckt genau eine Sache:

**Impostor wissen Bescheid** – an: die Impostor sehen auf ihrer Karte, dass sie Impostor sind.
Aus: niemand weiß es, alle sehen nur ihren Charakter. Das ist die deutlich gemeinere Variante.

Die Änderung gilt **ab der nächsten Runde** und löst bei den Mitspielern **keine sichtbare
Reaktion** aus. Niemand bekommt mit, dass du daran gedreht hast.

### Gamemaster abgeben / Raum verlassen

Im **⋯-Menü**: „Gamemaster übergeben" wählt gezielt ein anderes Gerät. Beim „Raum verlassen"
kann der Gamemaster einen Nachfolger auswählen – tut er das nicht, wird automatisch zufällig ein
verbleibendes Gerät zum Gamemaster.

### Wann verschwindet ein Raum wieder?

Drei Fälle:

- **Alle verlassen den Raum aktiv** (⋯-Menü → Verlassen): Sobald das letzte Gerät draußen ist,
  wird der Raum sofort gelöscht.
- **Alle schließen einfach den Tab:** Dann bleibt der Raum liegen und verfällt automatisch
  **8 Stunden nach der letzten Aktion**. Jede Aktion setzt die Uhr zurück, ein laufender
  Spieleabend läuft also nie ab.
- **Server ohne Redis:** Da verschwinden Räume unvorhersehbar früher — siehe Abschnitt 2.

Es sammelt sich also nichts an. Bei Upstash landen die Räume unter einem TTL, den Redis selbst
aufräumt; im In-Memory-Modus sind sie ohnehin weg, sobald der Prozess neu startet.

### Bildschirm gesperrt? Seite neu geladen?

Kein Problem. Die Session liegt im Browser des Geräts. Beim Zurückkommen landest du in derselben
Rolle. Die Karte startet dabei wieder verdeckt.

---

## 5. Eigene Themen hinzufügen

Im **⋯-Menü** oder in der Themenwahl: **„➕ Eigenes Thema hinzufügen"**.

1. **Prompt kopieren** – ein fertiger Text landet in der Zwischenablage.
2. Bei ChatGPT/Claude einfügen, das eigene Wunschthema an der markierten Stelle eintragen
   (z.B. „Herr der Ringe", „Star Wars", „Bundesliga-Trainer") und abschicken.
3. Die JSON-Antwort kopieren und im zweiten Feld einfügen → **„Thema hinzufügen"**.

Das Thema steht dann **allen im Raum** zur Wahl und wird zusätzlich auf deinem Gerät gespeichert,
damit du es beim nächsten Mal mit einem Tipp wieder laden kannst.

### Schema

```json
{
  "name": "Star Wars",
  "pairs": [
    {
      "real": { "name": "Luke Skywalker", "image": "https://…optional…" },
      "impostor": { "name": "Anakin Skywalker" },
      "similarities": [
        "Vater und Sohn, beide Jedi",
        "Beide bauten ihr eigenes Lichtschwert",
        "Beide sind herausragende Piloten"
      ],
      "traps": ["Anakin wird zu Darth Vader und trägt später schwarze Rüstung"]
    }
  ]
}
```

- `pairs`: 3 bis 60 Paare
- `similarities`: 3 bis 5 Stichpunkte
- `traps`: 1 bis 2 Stichpunkte
- `image` ist optional

### Sicherheit

Das eingefügte JSON wird als **nicht vertrauenswürdige Eingabe** behandelt:

- Nur `JSON.parse` – kein `eval`, kein `Function`-Konstruktor, keine Code-Ausführung.
- Strikte Schemaprüfung; unbekannte Felder werden verworfen, nicht übernommen.
- Längenlimits für jeden Text und jede Liste, Gesamtgröße begrenzt.
- Steuerzeichen und unsichtbare Unicode-Tricks (Zero-Width, Bidi-Overrides) werden entfernt.
- Bild-URLs: nur `https`, keine Zugangsdaten in der URL, Host muss auf der Allowlist stehen
  (`upload.wikimedia.org`, `commons.wikimedia.org`, `de/en.wikipedia.org`,
  `static.wikia.nocookie.net`, `vignette.wikia.nocookie.net`), und der Pfad muss auf eine
  Bilddatei enden.
- Alle Texte werden ausschließlich als React-Textknoten gerendert. Im gesamten Projekt gibt es
  **kein** `innerHTML` und **kein** `dangerouslySetInnerHTML`. HTML im JSON erscheint als
  sichtbarer Text, nicht als Markup.
- Bei Fehlern gibt es eine konkrete deutsche Meldung, welches Feld warum falsch ist.

Fehlerhafte Themen landen nie in der Bibliothek. Maximal 20 eigene Themen pro Raum.

---

## 6. Bilder

Jeder der 160 Charaktere hat ein echtes Bild. Die URLs stammen aus dem jeweiligen
Fandom-Wiki (dessen eigenes Infobox-Bild über die MediaWiki-API `prop=pageimages`) und wurden
anschließend im Browser einzeln daraufhin geprüft, dass sie wirklich laden — 159 Dateien, keine
kaputte dabei (zwei Paare teilen sich einen Charakter).

Sie liegen in `src/lib/images.ts`, getrennt von den Charakterdaten, und werden beim Laden der
Bibliothek automatisch angehängt. Gespeichert ist nur der Pfad; die Breite (400 px) hängt die App
zur Laufzeit an, damit auf dem Handy keine mehrere Megabyte großen Originale geladen werden.

Nachprüfen:

```bash
npm run check:images
```

Das Skript testet jede URL auf HTTP-Status und Content-Type.

**Ein Bild austauschen:** In `src/lib/images.ts` den Pfad hinter dem Charakternamen ersetzen. Den
Pfad findest du, indem du auf der Fandom-Seite das gewünschte Bild in einem neuen Tab öffnest und
alles nach `https://static.wikia.nocookie.net/` bis einschließlich der Dateiendung kopierst.

**Wenn ein Link doch mal stirbt,** zeigt die App automatisch eine generierte Karte mit Farbverlauf
und Monogramm statt eines kaputten Bild-Symbols. Es sieht also nie defekt aus.

Die Bilder sind urheberrechtlich geschützt und werden von Fandom aus eingebunden, nicht kopiert.
Für einen privaten Spieleabend ist das unproblematisch; für etwas Öffentliches solltest du eigene
oder lizenzfreie Bilder eintragen.

## 7. Tests

```bash
npm run build
npm start          # Terminal 1

npm run test:api   # Terminal 2 – Server-/Spiel-Logik + Sicherheit
npm run test:ui    # Terminal 2 – kompletter Durchlauf durch die echte UI
```

- **`test:api`** spielt zwei komplette Runden über die HTTP-API und prüft unter anderem, dass ein
  Client niemals fremde Rollen, die Impostor-Liste oder die Auflösung im Payload bekommt.
- **`test:ui`** rendert die echten React-Komponenten (drei „Handys" gleichzeitig) und klickt eine
  Runde von der Lobby bis zur Auflösung durch – inklusive Weitergabe-Screens, Zahnrad-Menü,
  Reconnect und ein Gerät, das alle vier Spieler abdeckt.

---

## 8. Technik & Entscheidungen

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript, keine UI-Bibliothek, handgeschriebenes
CSS. Läuft auf Vercel und Netlify ohne Dauerserver.

**Warum Polling statt WebSockets?**
Vercel und Netlify bieten keine dauerhaften WebSocket-Verbindungen in ihren
Standard-Serverless-Funktionen. Ein gehosteter Realtime-Dienst (Pusher, Ably, Supabase …) würde
einen zusätzlichen Account und API-Keys erfordern. Stattdessen pollt jeder Client alle **800 ms**
`GET /api/room/:code/state` – die Antwort ist wenige Kilobyte groß. Latenz damit deutlich unter
einer Sekunde, ohne dass Jonas irgendwo einen Account anlegen muss. Beim Voting wird zusätzlich
sofort aufgelöst, sobald die letzte Stimme eingeht.

**Warum optional Redis?**
Der Spielstand liegt zunächst in einer `Map` im Speicher – perfekt für lokale Entwicklung, null
Setup. Sind `KV_REST_API_URL`/`KV_REST_API_TOKEN` (oder die `UPSTASH_…`-Varianten) gesetzt,
schaltet `src/lib/store.ts` automatisch auf Upstash Redis um. So gibt es keine Setup-Hürde beim
Ausprobieren und trotzdem korrektes Verhalten im echten Betrieb. Gleichzeitige Schreibzugriffe
werden über ein kurzes Lock serialisiert, damit zwei gleichzeitige Stimmen sich nicht überschreiben.

**Der Server ist die einzige Quelle der Wahrheit.**
`src/lib/view.ts` ist die einzige Stelle, an der Serverzustand in Client-Daten übersetzt wird.
Ein normaler Spieler bekommt ausschließlich seine eigene Rolle. Die Impostor-Liste, die Rollen
der anderen, die Gemeinsamkeiten und die Stolpersteine tauchen erst in der Auflösung im Payload
auf – oder bei Zuschauern, die ausdrücklich darauf hingewiesen werden. Der Netzwerk-Tab hilft
also nicht beim Schummeln. Auch die Einstellung „Impostor wissen Bescheid" wird nur an den
Gamemaster ausgeliefert. Die Rollenauslosung nutzt `crypto.randomBytes`, ist also nicht vorhersagbar.

**Sessions:** Jedes Gerät bekommt beim Beitritt ein zufälliges Token (24 Byte), das im
`localStorage` liegt und bei jedem Request im Header `x-impostor-token` mitgeschickt wird. Ein
Gerät kann mehrere Plätze („Sitze") halten – das ist das gemeinsame Fundament für den
das Herumreichen eines Handys und jede Mischform. Räume verfallen nach 8 Stunden automatisch.

### Projektstruktur

```
src/
  app/
    page.tsx                     Startseite (Raum anlegen / beitreten)
    join/[code]/page.tsx         Beitritt per QR-Code
    room/[code]/page.tsx         Spielraum
    api/
      room/route.ts              Raum anlegen
      room/[code]/join/route.ts  Beitreten / Reconnect
      room/[code]/state/route.ts Polling-Endpunkt (+ Heartbeat)
      room/[code]/action/route.ts Alle Spielaktionen
      qr/route.ts                QR-Code als SVG
  components/                    UI (RoomClient, RevealFlow, VotingFlow, Results, …)
  lib/
    types.ts                     Domänen- und View-Typen
    characters.ts                Charakter-Bibliothek (10 Themen × 8 Paare)
    game.ts                      Spielregeln, Auslosung, Punkte
    view.ts                      Redaction – was darf welcher Client sehen
    store.ts                     Redis oder In-Memory
    validateTopic.ts             Strenge Validierung der eigenen Themen
scripts/                         Tests und Bild-Prüfung
```

### Bekannte Hinweise

- `npm audit` meldet Warnungen für `postcss` und `sharp`. Beides sind transitive
  Build-Abhängigkeiten von Next.js, die zur Laufzeit nicht im Spiel sind (die App nutzt kein
  `next/image`). Ein `npm audit fix --force` würde Next.js zerlegen – besser einfach die
  Next-Version aktuell halten.
- Beim Themen-Voting bekommt ein Gerät mit mehreren Spielern für jeden einen Orb mit den
  Initialen. Den ziehst du auf ein Thema oder tippst ihn an und dann das Thema — so zählt jede
  Stimme einzeln. Bei einem Spieler pro Gerät gibt es keine Orbs, da tippt man einfach das Thema an.
