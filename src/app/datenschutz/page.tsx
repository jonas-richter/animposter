import Link from 'next/link';

export const metadata = {
  title: 'Datenschutz — Impostor',
};

// Plain, honest and short. The app is designed so that this page can stay this
// short: no analytics, no third-party embeds, no advertising, no consent banner.
export default function PrivacyPage() {
  return (
    <main className="shell prose">
      <h1 style={{ fontSize: 38 }}>Datenschutz</h1>

      <p className="lead">
        Dieses Spiel sammelt so wenig wie möglich. Es gibt keine Werbung, keine Analyse-Werkzeuge
        und keine Weitergabe an Dritte — deshalb auch keinen Cookie-Banner.
      </p>

      <h2>Was im Browser gespeichert wird</h2>
      <p className="muted">
        Beim Beitritt legt die App eine zufällige Kennung im lokalen Speicher deines Browsers ab.
        Sie enthält keinen Namen und dient nur dazu, dich nach einem Neuladen oder gesperrtem
        Bildschirm derselben Spielrolle zuzuordnen. Ohne sie könnte das Spiel nicht funktionieren.
        Du löschst sie, indem du den Raum verlässt oder die Browserdaten der Seite löschst.
      </p>

      <h2>Was auf dem Server gespeichert wird</h2>
      <ul className="bullets">
        <li>Der Spielername, den du selbst eingibst.</li>
        <li>Der Spielverlauf des Raums (Thema, Rollen, Punkte).</li>
        <li>Das Land deiner Verbindung, zweistellig, z.B. „DE“.</li>
        <li>Die Browserkennung (User-Agent), z.B. „iPhone · Safari“.</li>
      </ul>
      <p className="muted">
        <strong>Deine IP-Adresse wird nicht gespeichert.</strong> Sie wird kurzzeitig im
        Arbeitsspeicher verwendet, um Missbrauch zu begrenzen (etwa das massenhafte Anlegen von
        Räumen), und nirgends abgelegt.
      </p>

      <h2>Wie lange</h2>
      <p className="muted">
        Ein Raum verschwindet automatisch spätestens acht Stunden nach der letzten Aktion, oder
        sofort, wenn alle ihn verlassen. Der Rundenverlauf für die Moderation wird nach sieben
        Tagen automatisch gelöscht.
      </p>

      <h2>Moderation</h2>
      <p className="muted">
        Der Betreiber kann laufende Räume einsehen und einem Raum als unsichtbarer Beobachter
        beitreten, um bei Missbrauch eingreifen zu können. Es gibt keinen Chat und keine
        Sprachübertragung; sichtbar sind nur die Spielernamen und der Spielstand.
      </p>

      <h2>Bilder</h2>
      <p className="muted">
        Die Charakterbilder stammen aus öffentlichen Fandom-Wikis und werden über diesen Server
        ausgeliefert. Dein Gerät baut dabei keine Verbindung zu Fandom auf.
      </p>

      <h2>Rechte und Kontakt</h2>
      <p className="muted">
        Du kannst Auskunft und Löschung verlangen. Da wir keine Konten führen, hilft dabei der
        Raumcode. Bei Fragen wende dich an den Betreiber dieser Seite.
      </p>

      <div className="spacer" />
      <Link className="quiet block" href="/" style={{ textAlign: 'center' }}>
        Zurück zum Spiel
      </Link>
    </main>
  );
}
