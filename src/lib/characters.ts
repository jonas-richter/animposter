import type { Topic } from './types';
import { imageFor } from './images';

// Curated character pairs.
//
// Every pair: a "real" character and an "impostor" that overlaps heavily
// (look, role, temperament, story function) but differs in 1-2 concrete details
// that a sharp player can catch ("traps").
//
// IMAGES: artwork is attached at the bottom of this file from lib/images.ts.
// Setting `image` on a pair explicitly still wins. Without any image the app
// renders a generated card, so nothing ever looks broken.
// Run `npm run check:images` to re-verify every URL.

export const BUILTIN_TOPICS: Topic[] = [
  {
    id: 'onepiece',
    name: 'One Piece',
    pairs: [
      {
        id: 'op-zoro-mihawk',
        real: { name: 'Roronoa Zoro' },
        impostor: { name: 'Dracule Mihawk' },
        similarities: [
          'Beide sind Schwertkämpfer der absoluten Spitzenklasse',
          'Stoisch, wortkarg, ernst - reden wenig, kämpfen viel',
          'Direkte Rivalität: Zoro will Mihawk vom Thron des besten Schwertkämpfers stoßen',
          'Beide haben eine hohe Toleranz für Schmerz und einen strengen Ehrenkodex',
        ],
        traps: [
          'Zoro kämpft mit drei Schwertern (eines im Mund), Mihawk nur mit einem einzigen (Yoru)',
          'Zoro gehört zur Strohhutbande, Mihawk ist Einzelgänger und war einer der Sieben Samurai der Meere',
        ],
      },
      {
        id: 'op-ace-sabo',
        real: { name: 'Portgas D. Ace' },
        impostor: { name: 'Sabo' },
        similarities: [
          'Beide sind Luffys Schwurbrüder aus Kindertagen',
          'Beide tragen die Flammen-Frucht (Mera Mera no Mi) - nacheinander',
          'Beide tragen einen auffälligen Hut und ein Rohrstück/Rohrstab-Erbe aus der Kindheit',
          'Beide sind extrem beschützerisch gegenüber Luffy',
        ],
        traps: [
          'Ace war Kommandant der 2. Division der Whitebeard-Piraten, Sabo ist Stabschef der Revolutionsarmee',
          'Sabo hat eine große Brandnarbe über dem linken Auge und blonde Haare; Ace hat Sommersprossen und dunkle Haare',
        ],
      },
      {
        id: 'op-nami-robin',
        real: { name: 'Nami' },
        impostor: { name: 'Nico Robin' },
        similarities: [
          'Beide sind Frauen der Strohhutbande und die klugen Köpfe an Bord',
          'Beide kamen über einen Umweg zur Crew, nachdem sie zuvor für Gegner gearbeitet hatten',
          'Beide haben eine schwere Vergangenheit mit Verrat und Verfolgung',
          'Beide bleiben in Krisen kühl und analytisch',
        ],
        traps: [
          'Robin hat eine Teufelsfrucht (Hana Hana no Mi, Arme sprießen lassen), Nami hat keine',
          'Nami ist Navigatorin/Kartografin und kämpft mit dem Klima-Takt; Robin ist Archäologin und die Einzige, die Poneglyphen lesen kann',
        ],
      },
      {
        id: 'op-sanji-zeff',
        real: { name: 'Sanji' },
        impostor: { name: 'Zeff' },
        similarities: [
          'Beide sind Spitzenköche mit einem heiligen Respekt vor Essen',
          'Beide kämpfen ausschließlich mit den Beinen, um die Hände fürs Kochen zu schonen',
          'Beide sind mit dem Restaurantschiff Baratie verbunden',
          'Beide sind Kettenraucher-Typen mit rauer Schale und weichem Kern',
        ],
        traps: [
          'Zeff hat ein Holzbein - er opferte sein eigenes Bein, um Sanji zu retten',
          'Sanji ist Sohn der Vinsmoke-Familie und wird bei Frauen sofort zum Trottel; Zeff ist Sanjis Ziehvater und Ex-Pirat ("Rotfuß")',
        ],
      },
      {
        id: 'op-smoker-tashigi',
        real: { name: 'Smoker' },
        impostor: { name: 'Tashigi' },
        similarities: [
          'Beide sind Marineoffiziere und jagen hartnäckig die Strohhutbande',
          'Beide haben einen eigenen Gerechtigkeitssinn, der nicht immer zur Marine passt',
          'Beide arbeiten seit Loguetown zusammen und sind praktisch unzertrennlich',
          'Beide sind grimmig, pflichtbewusst und schlecht gelaunt, wenn Piraten entkommen',
        ],
        traps: [
          'Smoker hat die Rauch-Frucht (Logia) und kaut zwei Zigarren gleichzeitig',
          'Tashigi trägt eine Brille, sammelt legendäre Schwerter und sieht Zoros verstorbener Freundin Kuina zum Verwechseln ähnlich',
        ],
      },
      {
        id: 'op-shanks-rayleigh',
        real: { name: 'Shanks' },
        impostor: { name: 'Silvers Rayleigh' },
        similarities: [
          'Beide fuhren auf der Oro Jackson unter Gol D. Roger',
          'Beide sind Haki-Meister der obersten Liga',
          'Beide traten als Mentor bzw. Wegbereiter für Luffy auf',
          'Beide sind entspannt, trinkfest und werden trotzdem von der ganzen Welt gefürchtet',
        ],
        traps: [
          'Shanks verlor seinen linken Arm, um Luffy zu retten, und schenkte ihm den Strohhut',
          'Rayleigh ist der "Dunkelkönig", war Rogers Vize und lebt als Beschichtungshandwerker auf den Sabaody-Inseln',
        ],
      },
      {
        id: 'op-crocodile-doflamingo',
        real: { name: 'Sir Crocodile' },
        impostor: { name: 'Donquixote Doflamingo' },
        similarities: [
          'Beide waren Mitglieder der Sieben Samurai der Meere',
          'Beide unterwarfen heimlich ein ganzes Königreich (Alabasta bzw. Dressrosa)',
          'Beide führten unter Decknamen ein kriminelles Netzwerk (Baroque Works bzw. "Joker")',
          'Beide sind hochmütige Manipulatoren mit Sinn für Inszenierung',
        ],
        traps: [
          'Crocodile hat die Sand-Frucht und ist gegen Wasser praktisch wehrlos; Doflamingo hat die Faden-Frucht',
          'Doflamingo ist ein abtrünniger Weltaristokrat (Tenryubito) mit rosa Federmantel; Crocodile trägt Zigarre und Hakenhand',
        ],
      },
      {
        id: 'op-aokiji-kizaru',
        real: { name: 'Aokiji (Kuzan)' },
        impostor: { name: 'Kizaru (Borsalino)' },
        similarities: [
          'Beide waren gleichzeitig Admiräle der Marine',
          'Beide haben eine Logia-Teufelsfrucht mit gewaltiger Reichweite',
          'Beide wirken träge, lässig und desinteressiert - und sind trotzdem brutal effektiv',
          'Beide sprechen langsam und gedehnt und nehmen kaum etwas ernst',
        ],
        traps: [
          'Aokiji verließ die Marine, nachdem er das Duell gegen Akainu verlor - Kizaru ist weiterhin Admiral',
          'Aokiji nutzt Eis und fährt gern Fahrrad; Kizaru nutzt Licht und trägt eine gelbe Anzugjacke plus Sonnenbrille',
        ],
      },
    ],
  },

  {
    id: 'naruto',
    name: 'Naruto',
    pairs: [
      {
        id: 'nar-sasuke-itachi',
        real: { name: 'Sasuke Uchiha' },
        impostor: { name: 'Itachi Uchiha' },
        similarities: [
          'Brüder aus dem Uchiha-Clan mit Sharingan',
          'Beide sind hochbegabte Genies, die als Kind alle Erwartungen übertrafen',
          'Beide verließen Konoha und wurden als Verräter geführt',
          'Beide sind kühl, schweigsam und schwer zu durchschauen',
        ],
        traps: [
          'Itachi löschte den eigenen Clan aus und war Mitglied von Akatsuki (rote Wolken auf schwarzem Mantel); er nutzt Krähen',
          'Sasuke gehört zu Team 7 und kämpft mit Chidori/Katana; Itachis Markenzeichen sind Tsukuyomi und Amaterasu',
        ],
      },
      {
        id: 'nar-naruto-minato',
        real: { name: 'Naruto Uzumaki' },
        impostor: { name: 'Minato Namikaze' },
        similarities: [
          'Vater und Sohn - fast identisches Gesicht, blonde Stachelhaare, blaue Augen',
          'Beide wurden Hokage von Konoha',
          'Beide beherrschen das Rasengan',
          'Beide sind strahlende Optimisten, die ihr Dorf über alles stellen',
        ],
        traps: [
          'Minato heißt "Der gelbe Blitz" und nutzt die Fliegende Götterdonner-Technik (Hiraishin); er war der 4. Hokage',
          'Naruto hat Schnurrbart-Wangen, ist Jinchuriki von Kurama und der Meister der Schattendoppelgänger',
        ],
      },
      {
        id: 'nar-kakashi-obito',
        real: { name: 'Kakashi Hatake' },
        impostor: { name: 'Obito Uchiha' },
        similarities: [
          'Teamkameraden unter Minato, zusammen mit Rin',
          'Beide besitzen ein Sharingan - dasselbe Auge, das Obito Kakashi schenkte',
          'Beide verbergen ihr Gesicht (Maske bzw. Maske/Verband)',
          'Beide sind von Schuldgefühlen wegen Rins Tod geprägt',
        ],
        traps: [
          'Obito ist Uchiha und trat später als "Tobi" bzw. falscher Madara auf; seine Technik ist Kamui-Phasing',
          'Kakashi ist der "Kopier-Ninja", wurde 6. Hokage und liest ständig die Icha-Icha-Bücher',
        ],
      },
      {
        id: 'nar-sakura-tsunade',
        real: { name: 'Sakura Haruno' },
        impostor: { name: 'Tsunade' },
        similarities: [
          'Meisterin und Schülerin - Tsunade bildete Sakura aus',
          'Beide sind Spitzen-Medizin-Ninja',
          'Beide haben monströse Nahkampfkraft durch perfekte Chakra-Kontrolle',
          'Beide sind extrem kurz angebunden, wenn man sie reizt',
        ],
        traps: [
          'Tsunade ist eine der Legendären Sannin und wurde 5. Hokage; sie ist notorische Spielerin und trinkt gern',
          'Beide tragen die Byakugo-Raute auf der Stirn - aber Tsunade zusätzlich blonde Zöpfe, Sakura hat rosa Haare und gehört zu Team 7',
        ],
      },
      {
        id: 'nar-neji-hinata',
        real: { name: 'Neji Hyuga' },
        impostor: { name: 'Hinata Hyuga' },
        similarities: [
          'Cousin und Cousine aus dem Hyuga-Clan',
          'Beide besitzen das Byakugan und kämpfen im Sanftfaust-Stil',
          'Beide haben lange dunkle Haare und blasse, pupillenlose Augen',
          'Beide mussten sich aus dem Schatten der Clan-Erwartungen befreien',
        ],
        traps: [
          'Neji gehört zum Nebenhaus und trägt das Fluchmal auf der Stirn; er stirbt im Vierten Ninja-Weltkrieg',
          'Hinata ist die Erbin des Hauptzweigs, extrem schüchtern und in Naruto verliebt',
        ],
      },
      {
        id: 'nar-orochimaru-kabuto',
        real: { name: 'Orochimaru' },
        impostor: { name: 'Kabuto Yakushi' },
        similarities: [
          'Meister und rechte Hand über viele Jahre',
          'Beide sind Schlangen-Motiv-Nutzer und beherrschen Edo Tensei (Wiederbelebung)',
          'Beide führen menschenverachtende Experimente durch',
          'Beide reden freundlich-schleimig und meinen es nie so',
        ],
        traps: [
          'Orochimaru ist einer der Sannin und wechselt für Unsterblichkeit den Körper; er hat gelbe Schlangenaugen',
          'Kabuto trägt eine runde Brille, war als Spion in Konoha und ist in erster Linie Medizin-Ninja',
        ],
      },
      {
        id: 'nar-madara-hashirama',
        real: { name: 'Madara Uchiha' },
        impostor: { name: 'Hashirama Senju' },
        similarities: [
          'Die beiden Gründerväter von Konoha',
          'Ewige Rivalen, die im Tal des Endes gegeneinander kämpften',
          'Beide gelten als die stärksten Shinobi ihrer Ära',
          'Beide haben lange dunkle Haare und eine Rüstung im alten Stil',
        ],
        traps: [
          'Hashirama ist der 1. Hokage, nutzt das Holz-Element und ist auffällig gutmütig/naiv',
          'Madara nutzt Susanoo und später das Rinnegan; sein Zeichen ist der riesige Gunbai-Fächer',
        ],
      },
      {
        id: 'nar-lee-guy',
        real: { name: 'Rock Lee' },
        impostor: { name: 'Might Guy' },
        similarities: [
          'Meister und Schüler mit identischem Look: grüner Ganzkörperanzug, Topfschnitt, dicke Augenbrauen',
          'Beide sind reine Taijutsu-Kämpfer',
          'Beide beherrschen die Acht Inneren Tore',
          'Beide sind pathetisch-motivierende Enthusiasten der "Kraft der Jugend"',
        ],
        traps: [
          'Guy ist Jonin und führt eine lebenslange Rivalität mit Kakashi (Bilanz-Zählen)',
          'Lee kann überhaupt kein Ninjutsu oder Genjutsu wirken und nutzt die "Betrunkene Faust"',
        ],
      },
    ],
  },

  {
    id: 'jjk',
    name: 'Jujutsu Kaisen',
    pairs: [
      {
        id: 'jjk-gojo-toji',
        real: { name: 'Satoru Gojo' },
        impostor: { name: 'Toji Fushiguro' },
        similarities: [
          'Beide gelten als praktisch unbesiegbar und wissen das genau',
          'Beide sind lässig, spöttisch und provozieren gern',
          'Beide sind eng mit Megumi Fushiguro verbunden',
          'Beide kämpften direkt gegeneinander im Gojos-Vergangenheit-Arc',
        ],
        traps: [
          'Toji hat null Fluchkraft ("Himmlische Restriktion") und kämpft rein körperlich mit Waffen aus einem Fluch-Inventar',
          'Gojo hat die Sechs Augen und die Grenzenlos-Technik, trägt eine Augenbinde und ist Lehrer an der Jujutsu-Schule',
        ],
      },
      {
        id: 'jjk-yuji-todo',
        real: { name: 'Yuji Itadori' },
        impostor: { name: 'Aoi Todo' },
        similarities: [
          'Beide sind Nahkampf-Kraftpakete ohne feine Technik-Spielereien',
          'Beide sind extrem muskulös und körperlich weit über dem Schnitt',
          'Beide sind beste Freunde ("Brüder") nach ihrem ersten Kampf',
          'Beide bewerten Menschen nach ihrem Frauentyp-Geschmack',
        ],
        traps: [
          'Todo besucht die Jujutsu-Schule Kyoto und nutzt Boogie Woogie (Positionstausch per Klatschen)',
          'Yuji ist Sukunas Gefäß, geht nach Tokio und hat selbst keine angeborene Technik',
        ],
      },
      {
        id: 'jjk-sukuna-mahito',
        real: { name: 'Ryomen Sukuna' },
        impostor: { name: 'Mahito' },
        similarities: [
          'Beide sind Flüche und verachten Menschen zutiefst',
          'Beide sind sadistisch verspielt und genießen das Töten',
          'Beide haben ein Erweitertes Territorium (Domain Expansion)',
          'Beide tragen markante Nähte/Muster im Gesicht',
        ],
        traps: [
          'Mahito ist aus dem Hass der Menschen auf einander geboren und formt Seelen um (Idle Transfiguration)',
          'Sukuna ist der König der Flüche, hat vier Arme und zwei Gesichter und steckt als 20 Finger versiegelt in Yuji',
        ],
      },
      {
        id: 'jjk-nobara-maki',
        real: { name: 'Nobara Kugisaki' },
        impostor: { name: 'Maki Zenin' },
        similarities: [
          'Beide sind Nahkämpferinnen mit sehr direkter, unhöflicher Art',
          'Beide gehören zur Tokioter Jujutsu-Schule',
          'Beide lassen sich von niemandem etwas sagen und hassen Standesdünkel',
          'Beide kämpfen mit greifbaren Werkzeugen statt mit abstrakten Techniken',
        ],
        traps: [
          'Maki hat fast keine Fluchkraft, sieht Flüche aber dank Brille und nutzt Fluchwerkzeuge; sie kommt aus dem Zenin-Clan',
          'Nobara nutzt die Strohpuppen-Technik mit Hammer und Nägeln',
        ],
      },
      {
        id: 'jjk-nanami-meimei',
        real: { name: 'Kento Nanami' },
        impostor: { name: 'Mei Mei' },
        similarities: [
          'Beide sind Jujutsu-Zauberer ersten Grades',
          'Beide behandeln Fluchbeschwörung betont nüchtern als Job',
          'Beide sind erwachsene Profis, die die Schüler von oben herab beraten',
          'Geld und geregelte Verhältnisse sind für beide ein zentrales Thema',
        ],
        traps: [
          'Mei Mei kontrolliert Krähen, kämpft mit einer riesigen Axt und arbeitet ausschließlich für Bezahlung',
          'Nanami trägt Anzug und Krawatte, kämpft mit einem stumpfen Schwert und nutzt die Verhältnis-Technik (7:3)',
        ],
      },
      {
        id: 'jjk-yuta-yuji',
        real: { name: 'Yuta Okkotsu' },
        impostor: { name: 'Yuji Itadori' },
        similarities: [
          'Beide sind gutherzige Außenseiter mit enormem verstecktem Potenzial',
          'Beide wurden zunächst zur Hinrichtung verurteilt und dann doch aufgenommen',
          'Beide haben schwarze Haare und ein sanftes, unauffälliges Auftreten',
          'Beide werden von Gojo persönlich protegiert',
        ],
        traps: [
          'Yuta ist Zauberer im Sonderrang, trägt Rika (den Fluchgeist seiner Kindheitsliebe) bei sich und kann Techniken kopieren',
          'Yuji beherbergt Sukuna und hat selbst keine angeborene Technik; Yuta kämpft mit einem Katana',
        ],
      },
      {
        id: 'jjk-geto-kenjaku',
        real: { name: 'Suguru Geto' },
        impostor: { name: 'Kenjaku' },
        similarities: [
          'Identisches Äußeres - Kenjaku benutzt Getos Leiche',
          'Beide manipulieren Fluchgeister und führen eine Anhängerschaft',
          'Beide agieren als ruhige, sanft sprechende Drahtzieher',
          'Beide sind Gojos Gegenspieler',
        ],
        traps: [
          'Kenjaku hat eine deutlich sichtbare Naht quer über dem Schädel und wechselt seit über 1000 Jahren die Körper',
          'Der echte Geto war Gojos bester Freund an der Schule, brach mit der Welt aus Hass auf Nicht-Zauberer und starb bereits',
        ],
      },
      {
        id: 'jjk-panda-mechamaru',
        real: { name: 'Panda' },
        impostor: { name: 'Kokichi Muta (Mechamaru)' },
        similarities: [
          'Beide sind keine gewöhnlichen Menschen, sondern konstruierte Körper',
          'Beide sind Zweitjahres-Schüler an einer Jujutsu-Schule',
          'Beide reden und handeln völlig normal, obwohl ihr Körper es nicht ist',
          'Beide stehen in direktem Bezug zu Prinzipal Yaga bzw. dessen Fluchpuppen-Handwerk',
        ],
        traps: [
          'Mechamaru gehört zur Kyoto-Schule, steuert seine Puppe aus der Ferne und verriet die Schule an Kenjaku',
          'Panda wurde von Yaga erschaffen, hat drei Kerne (u.a. Gorilla-Modus) und gehört zur Tokio-Schule',
        ],
      },
    ],
  },

  {
    id: 'aot',
    name: 'Attack on Titan',
    pairs: [
      {
        id: 'aot-eren-zeke',
        real: { name: 'Eren Jäger' },
        impostor: { name: 'Zeke Jäger' },
        similarities: [
          'Halbbrüder, beide Söhne von Grisha Jäger',
          'Beide sind Titanen-Wandler mit Königsblut-Bezug',
          'Beide verfolgen einen radikalen Plan für das Schicksal der Eldianer',
          'Beide manipulieren ihr Umfeld und spielen ein Doppelspiel',
        ],
        traps: [
          'Zeke ist der Bestien-Titan mit Affengestalt und Wurfarm; er trägt Brille und Bart und wuchs in Marley auf',
          'Eren hat den Angriffs- und den Gründer-Titan und diente im Aufklärungstrupp',
        ],
      },
      {
        id: 'aot-mikasa-levi',
        real: { name: 'Mikasa Ackerman' },
        impostor: { name: 'Levi Ackerman' },
        similarities: [
          'Beide tragen den Namen Ackerman und dessen erwachte Kampfkraft',
          'Beide sind mit Abstand die tödlichsten Soldaten des Aufklärungstrupps',
          'Beide sind wortkarg, emotional verschlossen und wirken kalt',
          'Beide haben schwarze Haare und schmale, ernste Gesichtszüge',
        ],
        traps: [
          'Levi ist Kapitän, extrem klein gewachsen, hat einen Sauberkeitsfimmel und wuchs in der Untergrundstadt auf',
          'Mikasa trägt immer den roten Schal von Eren und stammt aus dem ostasiatischen Clan',
        ],
      },
      {
        id: 'aot-reiner-bertholdt',
        real: { name: 'Reiner Braun' },
        impostor: { name: 'Bertholdt Hoover' },
        similarities: [
          'Beide sind Marley-Krieger, die als Kinder eingeschleust wurden',
          'Beide brachen gemeinsam die Mauer Maria auf',
          'Beide waren Kameraden im 104. Kadettenkorps und teilen sich dasselbe Geheimnis',
          'Beide leiden schwer an ihrer Doppelrolle',
        ],
        traps: [
          'Bertholdt ist der Koloss-Titan (riesig, dampfend), ungewöhnlich groß gewachsen und extrem schüchtern',
          'Reiner ist der Gepanzerte Titan, blond, breit gebaut und spaltet sich innerlich in "Soldat" und "Krieger"',
        ],
      },
      {
        id: 'aot-armin-erwin',
        real: { name: 'Armin Arlert' },
        impostor: { name: 'Erwin Smith' },
        similarities: [
          'Beide sind die strategischen Köpfe des Aufklärungstrupps',
          'Beide sind blond und körperlich nicht die stärksten Kämpfer',
          'Beide opfern bereitwillig sich selbst für den Plan',
          'Beide standen im Zentrum derselben Serum-Entscheidung in Shiganshina',
        ],
        traps: [
          'Erwin ist Kommandant, verlor seinen rechten Arm und hält die "Widmet eure Herzen"-Reden',
          'Armin ist ein Kadett des 104. Korps, erbt den Koloss-Titan und träumt vom Meer',
        ],
      },
      {
        id: 'aot-annie-pieck',
        real: { name: 'Annie Leonhart' },
        impostor: { name: 'Pieck Finger' },
        similarities: [
          'Beide sind Marley-Kriegerinnen mit Titankraft',
          'Beide sind ruhig, berechnend und deutlich klüger als sie tun',
          'Beide agieren als Infiltratorinnen bzw. Aufklärerinnen',
          'Beide wirken müde/gelangweilt und unterschätzen ihr Gegenüber nie',
        ],
        traps: [
          'Pieck ist der Karren-Titan, läuft auf allen vieren und raucht; sie kann Ausrüstung tragen',
          'Annie ist der Weibliche Titan, kämpft in einem Ringkampf-Stil und verschanzt sich in einem Kristall',
        ],
      },
      {
        id: 'aot-historia-frieda',
        real: { name: 'Historia Reiss' },
        impostor: { name: 'Frieda Reiss' },
        similarities: [
          'Beide stammen aus der königlichen Reiss-Blutlinie',
          'Beide sind blond, klein und wirken sanft und mütterlich',
          'Beide sind Halbschwestern und kannten sich als Kinder',
          'Beide wurden zur Königin bzw. Trägerin der königlichen Bürde bestimmt',
        ],
        traps: [
          'Frieda besaß den Gründer-Titan und wurde von Grisha getötet - Historia erinnerte sich lange nicht an sie',
          'Historia lebte als Kadettin unter dem Decknamen "Krista Lenz" und wird am Ende tatsächlich Königin',
        ],
      },
      {
        id: 'aot-jean-marco',
        real: { name: 'Jean Kirschstein' },
        impostor: { name: 'Marco Bodt' },
        similarities: [
          'Beste Freunde im 104. Kadettenkorps',
          'Beide wollten ursprünglich zur Militärpolizei ins sichere Innenland',
          'Beide haben ein starkes Gespür für Führung und Menschenkenntnis',
          'Beide sind moralische Anker in ihrer Gruppe',
        ],
        traps: [
          'Marco stirbt bereits in Trost, hat Sommersprossen und ein rundes, freundliches Gesicht',
          'Jean hat das markante längliche "Pferdegesicht", geht doch zum Aufklärungstrupp und übernimmt später Führungsverantwortung',
        ],
      },
      {
        id: 'aot-grisha-kruger',
        real: { name: 'Grisha Jäger' },
        impostor: { name: 'Eren Kruger' },
        similarities: [
          'Beide trugen nacheinander den Angriffs-Titan',
          'Beide gehörten zur eldianischen Restaurationsbewegung in Marley',
          'Beide arbeiteten verdeckt gegen das Marley-Regime',
          'Beide gaben ihre Mission an einen Nachfolger weiter',
        ],
        traps: [
          'Kruger war als Marley-Geheimdienstoffizier "Die Eule" getarnt und rettete Grisha auf Paradis',
          'Grisha ist Arzt, Vater von Eren und Zeke und lebte jahrzehntelang unauffällig in Shiganshina',
        ],
      },
    ],
  },

  {
    id: 'demonslayer',
    name: 'Demon Slayer',
    pairs: [
      {
        id: 'ds-tanjiro-giyu',
        real: { name: 'Tanjiro Kamado' },
        impostor: { name: 'Giyu Tomioka' },
        similarities: [
          'Beide nutzen die Wasseratmung',
          'Beide beschützen Nezuko gegen den Willen des Ordens',
          'Beide sind ruhig, höflich und wirken auf andere unnahbar-ernst',
          'Beide haben dunkle Haare mit rötlichem Einschlag und tragen ein auffälliges Haori',
        ],
        traps: [
          'Giyu ist Wassersäule; sein Haori ist halb einfarbig, halb geometrisch gemustert und er gilt als Einzelgänger im Orden',
          'Tanjiro hat eine Narbe auf der Stirn, Hanafuda-Ohrringe, einen übermenschlichen Geruchssinn und wechselt später zur Sonnenatmung',
        ],
      },
      {
        id: 'ds-zenitsu-inosuke',
        real: { name: 'Zenitsu Agatsuma' },
        impostor: { name: 'Inosuke Hashibira' },
        similarities: [
          'Beide sind Tanjiros ständige Begleiter im selben Jahrgang',
          'Beide sind laut, überdreht und emotional völlig ungefiltert',
          'Beide haben ein übermenschlich geschärftes Sinnesorgan',
          'Beide werden regelmäßig von Nezuko-Themen aus der Fassung gebracht',
        ],
        traps: [
          'Inosuke trägt einen Wildschweinkopf als Maske, kämpft mit zwei gezackten Klingen und nutzt die Bestienatmung',
          'Zenitsu ist blond, notorisch feige und kämpft mit Donneratmung - meistens im Schlaf',
        ],
      },
      {
        id: 'ds-rengoku-sanemi',
        real: { name: 'Kyojuro Rengoku' },
        impostor: { name: 'Sanemi Shinazugawa' },
        similarities: [
          'Beide sind Säulen (Hashira) des Dämonenjäger-Ordens',
          'Beide sind extrem laut, direkt und kompromisslos',
          'Beide haben ein schwer belastetes Verhältnis zu ihrer Familie',
          'Beide stellen die Pflicht über das eigene Leben',
        ],
        traps: [
          'Rengoku ist die Flammensäule mit rot-gelben Haaren, ruft ständig "Umai!" und stirbt im Kampf gegen Akaza',
          'Sanemi ist die Windsäule, über und über mit Narben bedeckt, hat seltenes Blut (Marechi) und stößt seinen Bruder Genya weg',
        ],
      },
      {
        id: 'ds-muzan-kokushibo',
        real: { name: 'Muzan Kibutsuji' },
        impostor: { name: 'Kokushibo' },
        similarities: [
          'Beide sind die mit Abstand mächtigsten Dämonen der Serie',
          'Beide treten kühl, elegant und arrogant auf',
          'Beide verachten ihre eigenen Untergebenen offen',
          'Beide stammen aus der Sengoku-Zeit und haben eine lange Vorgeschichte',
        ],
        traps: [
          'Kokushibo hat sechs Augen, war als Mensch Michikatsu Tsugikuni und nutzt als einziger Dämon eine Atemtechnik (Mondatmung)',
          'Muzan ist der Urdämon, wechselt seine Gestalt (auch als Frau oder Kind) und ist der Einzige, der alle anderen erschaffen hat',
        ],
      },
      {
        id: 'ds-shinobu-kanao',
        real: { name: 'Shinobu Kocho' },
        impostor: { name: 'Kanao Tsuyuri' },
        similarities: [
          'Beide leben und arbeiten im Schmetterlingsanwesen',
          'Beide sind zierlich, extrem schnell und kämpfen über Beweglichkeit statt Kraft',
          'Beide tragen Schmetterlingsschmuck im Haar',
          'Beide lächeln fast durchgehend, egal was passiert',
        ],
        traps: [
          'Shinobu ist die Insektensäule; sie kann Dämonen nicht köpfen und tötet stattdessen mit Glyzinien-Gift',
          'Kanao trifft Entscheidungen per Münzwurf und wechselt später zur Blumenatmung inklusive "Rotes Auge"',
        ],
      },
      {
        id: 'ds-akaza-douma',
        real: { name: 'Akaza' },
        impostor: { name: 'Douma' },
        similarities: [
          'Beide gehören zu den Obermonden der Zwölf Dämonenmonde',
          'Beide wirken höflich und fast freundlich, während sie töten',
          'Beide haben eine ausgeprägte Blutdämonenkunst mit Flächenwirkung',
          'Beide sind farblich sehr auffällig gestaltet',
        ],
        traps: [
          'Douma ist Obermond Zwei, nutzt Eis, hat regenbogenfarbene Augen und war Anführer einer Sekte',
          'Akaza ist Obermond Drei, kämpft mit bloßen Fäusten im Kampfkunst-Stil und frisst grundsätzlich keine Frauen',
        ],
      },
      {
        id: 'ds-nezuko-tamayo',
        real: { name: 'Nezuko Kamado' },
        impostor: { name: 'Tamayo' },
        similarities: [
          'Beide sind Dämoninnen, die keine Menschen fressen',
          'Beide stehen auf der Seite der Dämonenjäger',
          'Beide sind Muzans Kontrolle entkommen',
          'Beide haben eine eigene Blutdämonenkunst, die anderen hilft statt schadet',
        ],
        traps: [
          'Tamayo ist Ärztin, forscht an einem Heilmittel und wurde einst von Muzan selbst verwandelt',
          'Nezuko trägt einen Bambusknebel, kann ihre Körpergröße verändern und ist Tanjiros Schwester',
        ],
      },
      {
        id: 'ds-uzui-gyomei',
        real: { name: 'Tengen Uzui' },
        impostor: { name: 'Gyomei Himejima' },
        similarities: [
          'Beide sind Säulen und körperlich weit über 1,90 m groß',
          'Beide sind auf den ersten Blick furchteinflößend',
          'Beide haben eine dunkle Vergangenheit mit vielen Toten',
          'Beide zeigen sich gegenüber Schwächeren überraschend fürsorglich',
        ],
        traps: [
          'Gyomei ist blind, betet ununterbrochen mit Gebetskette, weint viel und kämpft mit Kettenbeil - er gilt als stärkste Säule',
          'Tengen ist die Klangsäule, ehemaliger Shinobi, trägt Schmuck und Make-up und hat drei Kunoichi-Ehefrauen',
        ],
      },
    ],
  },

  {
    id: 'mha',
    name: 'My Hero Academia',
    pairs: [
      {
        id: 'mha-deku-allmight',
        real: { name: 'Izuku Midoriya (Deku)' },
        impostor: { name: 'All Might' },
        similarities: [
          'Beide tragen One For All - direkte Nachfolge',
          'Beide sind im Kern rettungsbesessene Idealisten',
          'Beide zerstören sich mit ihrer eigenen Kraft die Arme',
          'Beide haben zwei markante nach oben stehende Haarsträhnen',
        ],
        traps: [
          'All Might wechselt zwischen Muskelform und ausgezehrter Skelettform und trägt eine schwere Verletzung von All For One',
          'Deku hat grüne Haare, führt manisch Helden-Notizbücher und ist Schüler der Klasse 1-A',
        ],
      },
      {
        id: 'mha-bakugo-endeavor',
        real: { name: 'Katsuki Bakugo' },
        impostor: { name: 'Endeavor' },
        similarities: [
          'Beide sind aggressive Hitzköpfe mit explosiver bzw. feuriger Quirk',
          'Beide sind besessen davon, die Nummer eins zu werden',
          'Beide haben massive Probleme, ihre Gefühle auszudrücken',
          'Beide werden von anderen wegen ihres Verhaltens gefürchtet',
        ],
        traps: [
          'Endeavor ist erwachsener Profiheld (Nummer 1 nach All Might), Vater von Shoto Todoroki und hat einen Flammenbart',
          'Bakugo ist Schüler, sein Schweiß wirkt wie Nitroglyzerin und sein Heldenname ist Dynamight',
        ],
      },
      {
        id: 'mha-todoroki-dabi',
        real: { name: 'Shoto Todoroki' },
        impostor: { name: 'Dabi' },
        similarities: [
          'Brüder aus der Todoroki-Familie, beide Söhne von Endeavor',
          'Beide haben eine Feuer-Quirk aus derselben Vererbungslinie',
          'Beide sind emotional abgestumpft und sprechen monoton',
          'Beide tragen ihren Vaterkonflikt offen mit sich herum',
        ],
        traps: [
          'Dabi (eigentlich Toya) hat blaue Flammen, verbranntes Gewebe mit Metallklammern und gehört zur Liga der Schurken',
          'Shoto ist halb Eis, halb Feuer, hat zweifarbige Haare und eine Brandnarbe über dem linken Auge',
        ],
      },
      {
        id: 'mha-afo-shigaraki',
        real: { name: 'All For One' },
        impostor: { name: 'Tomura Shigaraki' },
        similarities: [
          'Meister und auserwählter Nachfolger',
          'Beide sammeln bzw. rauben Quirks',
          'Beide wollen die Heldengesellschaft grundsätzlich zerstören',
          'Beide sprechen ruhig und theatralisch über Zerstörung',
        ],
        traps: [
          'All For One trägt eine Beatmungsmaske über einem entstellten Gesicht und ist der Bruder des OFA-Ursprungs',
          'Shigaraki zerstört alles bei Berührung mit allen fünf Fingern und trägt abgetrennte Hände im Gesicht',
        ],
      },
      {
        id: 'mha-aizawa-mic',
        real: { name: 'Shota Aizawa' },
        impostor: { name: 'Present Mic' },
        similarities: [
          'Beide sind Lehrer an der U.A. und Profihelden',
          'Beide waren gemeinsam in derselben U.A.-Klasse und sind alte Freunde',
          'Beide haben eine Verbindung zum verstorbenen Oboro Shirakumo',
          'Beide tragen extrem auffällige, unkonventionelle Heldenkostüme',
        ],
        traps: [
          'Present Mic ist ein extrem lauter Radiomoderator mit blonder Hochfrisur - seine Quirk verstärkt seine Stimme',
          'Aizawa ("Eraser Head") löscht Quirks durch Anstarren, schläft im Schlafsack und kämpft mit einem Fangband',
        ],
      },
      {
        id: 'mha-iida-ingenium',
        real: { name: 'Tenya Iida' },
        impostor: { name: 'Tensei Iida (Ingenium)' },
        similarities: [
          'Brüder mit derselben Motor-Quirk',
          'Beide sind extrem regelkonform und pflichtbewusst',
          'Beide tragen eine Brille und ein blau-weißes Panzer-Kostüm',
          'Beide führen bzw. führten ein Team an',
        ],
        traps: [
          'Tensei hat die Motoren an den Ellbogen und wurde von Stain querschnittsgelähmt',
          'Tenya hat die Motoren in den Waden, ist Klassensprecher der 1-A und gestikuliert beim Reden mit steifen Armbewegungen',
        ],
      },
      {
        id: 'mha-hawks-tokoyami',
        real: { name: 'Hawks' },
        impostor: { name: 'Fumikage Tokoyami' },
        similarities: [
          'Beide haben ein durchgehendes Vogel-Motiv',
          'Beide können fliegen bzw. sich durch ihre Quirk in die Luft bewegen',
          'Sie standen im Mentor-Praktikanten-Verhältnis',
          'Beide sind auffällig ruhig und beobachtend',
        ],
        traps: [
          'Hawks hat große rote Federflügel, war die Nummer 2 und arbeitete als Spitzel in der Liga der Schurken',
          'Tokoyami hat einen Krähenkopf, spricht theatralisch-düster und kämpft mit dem Schattenwesen Dark Shadow',
        ],
      },
      {
        id: 'mha-mirio-tamaki',
        real: { name: 'Mirio Togata (Lemillion)' },
        impostor: { name: 'Tamaki Amajiki (Suneater)' },
        similarities: [
          'Beide gehören zu den "Großen Drei" der U.A.',
          'Beide sind seit der Kindheit beste Freunde',
          'Beide waren am Einsatz gegen Overhaul beteiligt',
          'Beide sind Drittjahres-Schüler mit Kraft weit über dem Schnitt',
        ],
        traps: [
          'Tamaki ist krankhaft schüchtern, dreht sich beim Reden zur Wand und manifestiert Eigenschaften von Dingen, die er isst',
          'Mirio ist dauergrinsend-optimistisch, phast mit Permeation durch Materie und verliert dabei zwischenzeitlich seine Quirk',
        ],
      },
    ],
  },

  {
    id: 'dragonball',
    name: 'Dragon Ball',
    pairs: [
      {
        id: 'db-goku-bardock',
        real: { name: 'Son Goku' },
        impostor: { name: 'Bardock' },
        similarities: [
          'Vater und Sohn - praktisch identisches Gesicht und identische Stachelfrisur',
          'Beide sind Saiyajin der niederen Klasse, die weit über sich hinauswachsen',
          'Beide leben für den Kampf',
          'Beide stellten sich einem übermächtigen Gegner allein entgegen',
        ],
        traps: [
          'Bardock trägt ein rotes Stirnband, hat eine markante Narbe auf der linken Wange und eine Saiyajin-Kampfrüstung',
          'Goku trägt den orangen Gi mit Kame- bzw. Go-Symbol und ist notorisch gutmütig und naiv',
        ],
      },
      {
        id: 'db-gohan-goten',
        real: { name: 'Son Gohan' },
        impostor: { name: 'Son Goten' },
        similarities: [
          'Brüder, beide Söhne von Goku und Chichi',
          'Beide sind Halb-Saiyajin mit enormem verstecktem Potenzial',
          'Beide wurden von Chichi zum Lernen statt zum Kämpfen gedrängt',
          'Beide erreichten sehr früh die Super-Saiyajin-Stufe',
        ],
        traps: [
          'Goten sieht als Kind aus wie eine Mini-Kopie von Goku und fusioniert mit Trunks zu Gotenks',
          'Gohan trägt Brille, wird Wissenschaftler und trat als Great Saiyaman auf; sein Mentor war Piccolo',
        ],
      },
      {
        id: 'db-piccolo-daimao',
        real: { name: 'Piccolo' },
        impostor: { name: 'Piccolo Daimao' },
        similarities: [
          'Namekianer mit identischer grüner Haut, Antennen und spitzen Ohren',
          'Beide tragen Turban und schweren Umhang',
          'Beide waren zunächst Gegner von Son Goku',
          'Beide haben dieselbe Herkunft - Piccolo ist der Nachkomme von Daimao',
        ],
        traps: [
          'Daimao ist ein alter, faltiger Tyrann, der die Welt unterwerfen wollte und Krillin tötete',
          'Piccolo wird Gohans Mentor und Beschützer und verschmilzt später mit Nail und Kami',
        ],
      },
      {
        id: 'db-freezer-cooler',
        real: { name: 'Freezer' },
        impostor: { name: 'Cooler' },
        similarities: [
          'Brüder derselben Spezies mit demselben Körperbau',
          'Beide herrschen über ein interstellares Handelsimperium',
          'Beide können sich in mehrere Formen verwandeln',
          'Beide sprechen höflich-arrogant und verachten Saiyajin',
        ],
        traps: [
          'Cooler trägt eine Maske über dem Gesicht mit nur zwei sichtbaren Augenschlitzen und hasst seinen Bruder',
          'Freezer zerstörte den Planeten Vegeta, kämpfte auf Namek gegen Goku und erreicht später die Golden-Form',
        ],
      },
      {
        id: 'db-17-18',
        real: { name: 'C-17 (Android 17)' },
        impostor: { name: 'C-18 (Android 18)' },
        similarities: [
          'Zwillinge, beide von Dr. Gero zu Cyborgs umgebaut',
          'Beide haben unendliche Energie und ähnliche blaue Augen',
          'Beide waren zuerst Gegner und wechselten dann die Seite',
          'Beide sind trocken-sarkastisch und emotional unaufgeregt',
        ],
        traps: [
          'C-18 ist blond, trägt Jeansjacke und heiratet Krillin',
          'C-17 hat schwarze Haare mit orangefarbenem Halstuch, arbeitet als Wildhüter in einem Naturschutzgebiet und gewinnt das Turnier der Kraft',
        ],
      },
      {
        id: 'db-krillin-tenshinhan',
        real: { name: 'Krillin' },
        impostor: { name: 'Tenshinhan' },
        similarities: [
          'Beide sind reine Menschen und die stärksten Erdlinge nach den Saiyajin',
          'Beide sind kahlköpfig bzw. glatzköpfig und trainierten im klassischen Kampfsport',
          'Beide starben mehrfach und wurden mit den Dragon Balls zurückgeholt',
          'Beide kämpfen weiter mit, obwohl sie längst chancenlos sind',
        ],
        traps: [
          'Tenshinhan hat ein drittes Auge auf der Stirn, kommt von der Kranich-Schule und nutzt die Kikoho (Tri-Beam) mit Chiaotzu an seiner Seite',
          'Krillin hat sechs Punkte auf der Stirn, kommt von der Schildkröten-Schule (Muten Roshi) und nutzt die Kienzan-Scheibe',
        ],
      },
      {
        id: 'db-beerus-champa',
        real: { name: 'Beerus' },
        impostor: { name: 'Champa' },
        similarities: [
          'Zwillingsbrüder und beide Gott der Zerstörung',
          'Beide sind katzenartige ägyptisch anmutende Gottheiten',
          'Beide sind extrem verfressen und kindisch launisch',
          'Beide werden von einem Engel-Begleiter betreut',
        ],
        traps: [
          'Champa ist deutlich rundlicher, gehört zu Universum 6 und wird von Vados begleitet',
          'Beerus ist schlank und lila, gehört zu Universum 7, sein Begleiter ist Whis - und er weckte Goku mit dem Super-Saiyajin-Gott-Ritual',
        ],
      },
      {
        id: 'db-broly-kale',
        real: { name: 'Broly' },
        impostor: { name: 'Kale' },
        similarities: [
          'Beide sind "Legendäre Super-Saiyajin" mit grüner Berserker-Form',
          'Beide verlieren im Rausch komplett die Kontrolle',
          'Beide sind außerhalb des Kampfes eher scheu und zurückhaltend',
          'Beide haben eine überwältigende, unkontrollierte Kraftsteigerung',
        ],
        traps: [
          'Kale ist weiblich, stammt aus Universum 6 und hängt emotional an Caulifla',
          'Broly stammt aus Universum 7, wurde von seinem Vater Paragus mit einem Kontrollgerät gesteuert und war auf Vampa gestrandet',
        ],
      },
    ],
  },

  {
    id: 'deathnote',
    name: 'Death Note',
    pairs: [
      {
        id: 'dn-light-l',
        real: { name: 'Light Yagami' },
        impostor: { name: 'L Lawliet' },
        similarities: [
          'Beide sind hochbegabte Genies, die den anderen als einzigen ebenbürtig ansehen',
          'Beide sind bereit, Menschen zu opfern, um ihr Ziel zu erreichen',
          'Beide arbeiteten offiziell in derselben Kira-Sonderermittlung',
          'Beide führen ein permanentes psychologisches Duell mit Bluff und Gegenbluff',
        ],
        traps: [
          'L läuft barfuß, hockt im Schneidersitz auf dem Stuhl, isst nur Süßigkeiten und hat starke Augenringe',
          'Light ist ein gepflegter Musterschüler, Sohn eines Polizeichefs und Besitzer des Death Note',
        ],
      },
      {
        id: 'dn-near-mello',
        real: { name: 'Near' },
        impostor: { name: 'Mello' },
        similarities: [
          'Beide wuchsen im Wammy’s House als Nachfolgekandidaten von L auf',
          'Beide jagen Kira nach Ls Tod',
          'Beide sind direkte Rivalen um Ls Erbe',
          'Beide sind jung, extrem intelligent und emotional schwer zugänglich',
        ],
        traps: [
          'Mello ist blond, hat eine Brandnarbe im Gesicht, isst ständig Schokolade und arbeitet mit der Mafia',
          'Near ist weißhaarig, spielt beim Denken mit Puppen und Würfeln und leitet die SPK',
        ],
      },
      {
        id: 'dn-misa-takada',
        real: { name: 'Misa Amane' },
        impostor: { name: 'Kiyomi Takada' },
        similarities: [
          'Beide sind Kira-Anhängerinnen, die Light für sich benutzt',
          'Beide sind medienpräsente Persönlichkeiten',
          'Beide bekommen von Light ein Stück Death Note anvertraut',
          'Beide sterben, weil Light sie fallen lässt',
        ],
        traps: [
          'Takada ist Nachrichtensprecherin, Lights Ex-Kommilitonin und tritt kühl und elegant auf',
          'Misa ist Gothic-Lolita-Model, hat den Shinigami-Augen-Handel gemacht und war der Zweite Kira',
        ],
      },
      {
        id: 'dn-ryuk-rem',
        real: { name: 'Ryuk' },
        impostor: { name: 'Rem' },
        similarities: [
          'Beide sind Shinigami, die ein Death Note in die Menschenwelt gebracht haben',
          'Beide begleiten unsichtbar einen menschlichen Besitzer',
          'Beide erklären die Regeln des Notizbuchs',
          'Beide dürfen nicht direkt in menschliche Angelegenheiten eingreifen',
        ],
        traps: [
          'Rem ist weiß und knochendürr und opfert sich freiwillig, um Misa zu retten',
          'Ryuk ist schwarz mit grinsendem Clownsgesicht, isst zwanghaft Äpfel und tut alles nur aus Langeweile',
        ],
      },
      {
        id: 'dn-soichiro-matsuda',
        real: { name: 'Soichiro Yagami' },
        impostor: { name: 'Touta Matsuda' },
        similarities: [
          'Beide sind japanische Polizisten in der Kira-Sonderermittlung',
          'Beide bleiben bis zum Schluss loyal zur Einheit',
          'Beide glauben lange an Lights Unschuld',
          'Beide riskieren im Einsatz ihr Leben',
        ],
        traps: [
          'Matsuda ist der junge, naive Draufgänger und erschießt Light am Ende',
          'Soichiro ist Lights Vater, Leiter der Einheit und geht den Shinigami-Augen-Handel ein',
        ],
      },
      {
        id: 'dn-mikami-higuchi',
        real: { name: 'Teru Mikami' },
        impostor: { name: 'Kyosuke Higuchi' },
        similarities: [
          'Beide führten als Lights Stellvertreter ein Death Note',
          'Beide urteilten eigenmächtig über Menschen',
          'Beide wurden durch ihr eigenes Verhaltensmuster enttarnt',
          'Beide waren erfolgreiche Berufstätige im Anzug',
        ],
        traps: [
          'Higuchi war Manager der Yotsuba-Gruppe und tötete aus reiner Geschäftsgier - er wurde im Auto gestellt',
          'Mikami ist Staatsanwalt, fanatisch religiös in seinem Kira-Glauben und sagt beim Schreiben "Delete"',
        ],
      },
      {
        id: 'dn-aizawa-mogi',
        real: { name: 'Shuichi Aizawa' },
        impostor: { name: 'Kanzo Mogi' },
        similarities: [
          'Beide sind Ermittler der Kira-Sonderermittlung',
          'Beide bleiben nüchtern und misstrauen Light früher als die anderen',
          'Beide sind erfahrene Polizisten mittleren Alters',
          'Beide arbeiten später mit Near zusammen',
        ],
        traps: [
          'Mogi ist extrem schweigsam und übernimmt verdeckt die Rolle von Misas Manager',
          'Aizawa hat einen markanten Afro und verließ die Einheit zwischenzeitlich wegen seiner Familie',
        ],
      },
      {
        id: 'dn-naomi-raye',
        real: { name: 'Naomi Misora' },
        impostor: { name: 'Raye Penber' },
        similarities: [
          'Verlobtes Paar - beide mit FBI-Hintergrund',
          'Beide ermitteln unabhängig von der japanischen Polizei gegen Kira',
          'Beide kommen Light gefährlich nahe',
          'Beide werden von Light mit dem Death Note beseitigt',
        ],
        traps: [
          'Raye Penber ist der FBI-Agent, der Light beschattet und im Bus/Zug manipuliert wird',
          'Naomi ist ehemalige FBI-Agentin und durchschaut Kiras Methode als Erste - Light muss sie persönlich stoppen',
        ],
      },
    ],
  },

  {
    id: 'harrypotter',
    name: 'Harry Potter',
    pairs: [
      {
        id: 'hp-harry-neville',
        real: { name: 'Harry Potter' },
        impostor: { name: 'Neville Longbottom' },
        similarities: [
          'Beide wurden im Juli 1980 geboren und kamen als Kandidaten der Prophezeiung in Frage',
          'Beide wuchsen ohne ihre Eltern auf, weil Voldemort sie zerstörte',
          'Beide sind Gryffindors desselben Jahrgangs',
          'Beide vernichten am Ende einen Horkrux',
        ],
        traps: [
          'Neville ist Kräuterkunde-Ass, zieht das Schwert von Gryffindor aus dem Hut und tötet damit die Schlange Nagini',
          'Harry hat die Blitznarbe und die runde Brille, spielt Sucher und ist Parselmund',
        ],
      },
      {
        id: 'hp-sirius-regulus',
        real: { name: 'Sirius Black' },
        impostor: { name: 'Regulus Black' },
        similarities: [
          'Brüder aus dem Haus Black mit sehr ähnlichem Aussehen',
          'Beide brachen letztlich mit der Ideologie ihrer Familie',
          'Beide starben jung im Kampf gegen Voldemort',
          'Beide sind mit dem Haus am Grimmauldplatz 12 verbunden',
        ],
        traps: [
          'Regulus war Slytherin und Todesser, stahl als "R.A.B." das Medaillon und starb in der Höhle der Inferi',
          'Sirius war Gryffindor, Animagus (schwarzer Hund "Tatze"), saß in Askaban und ist Harrys Pate',
        ],
      },
      {
        id: 'hp-snape-slughorn',
        real: { name: 'Severus Snape' },
        impostor: { name: 'Horace Slughorn' },
        similarities: [
          'Beide unterrichteten Zaubertränke in Hogwarts',
          'Beide waren Hauslehrer von Slytherin',
          'Beide hatten eine besondere Beziehung zu Lily Evans bzw. deren Talent',
          'Beide besitzen entscheidende Informationen für Dumbledores Plan',
        ],
        traps: [
          'Slughorn ist rundlich und gesellig, sammelt talentierte Schüler im "Slug-Club" und verbirgt die Horkrux-Erinnerung',
          'Snape trägt schwarze Roben, ist Doppelagent und der "Halbblutprinz"; er unterrichtete später Verteidigung',
        ],
      },
      {
        id: 'hp-bellatrix-barty',
        real: { name: 'Bellatrix Lestrange' },
        impostor: { name: 'Barty Crouch Jr.' },
        similarities: [
          'Beide sind fanatisch ergebene Todesser',
          'Beide saßen wegen der Folterung der Longbottoms in Askaban',
          'Beide brachen aus Askaban aus und kehrten zu Voldemort zurück',
          'Beide sind offen wahnsinnig und schwärmen für ihren "Meister"',
        ],
        traps: [
          'Barty Crouch Jr. nahm mit Vielsafttrank ein Jahr lang die Gestalt von Alastor Moody an; ihn verrät ein nervöses Zungenzucken',
          'Bellatrix hat wilde schwarze Locken, ist mit den Blacks verwandt und tötet Sirius sowie Dobby',
        ],
      },
      {
        id: 'hp-dumbledore-grindelwald',
        real: { name: 'Albus Dumbledore' },
        impostor: { name: 'Gellert Grindelwald' },
        similarities: [
          'Beide gelten als die mächtigsten Zauberer ihrer Zeit',
          'Beide waren in ihrer Jugend enge Freunde mit gemeinsamen Plänen',
          'Beide sind eng mit dem Elderstab verbunden',
          'Beide sind charismatische Anführer mit einer großen Anhängerschaft',
        ],
        traps: [
          'Grindelwald prägte "Zum Wohle des Größeren Ganzen", baute Nurmengard und verlor dort 1945 das Duell',
          'Dumbledore ist Schulleiter von Hogwarts, hat den Phönix Fawkes und trägt eine halbmondförmige Brille',
        ],
      },
      {
        id: 'hp-fred-george',
        real: { name: 'Fred Weasley' },
        impostor: { name: 'George Weasley' },
        similarities: [
          'Eineiige Zwillinge - optisch nicht zu unterscheiden',
          'Beide betreiben zusammen "Weasleys Zauberhafte Zauberscherze"',
          'Beide brachen gemeinsam spektakulär aus Hogwarts aus',
          'Beide sprechen in abwechselnden Halbsätzen und beenden die Sätze des anderen',
        ],
        traps: [
          'George verliert bei der Verfolgung ein Ohr ("löchrig") und überlebt den Krieg',
          'Fred stirbt in der Schlacht um Hogwarts',
        ],
      },
      {
        id: 'hp-lupin-greyback',
        real: { name: 'Remus Lupin' },
        impostor: { name: 'Fenrir Greyback' },
        similarities: [
          'Beide sind Werwölfe und verwandeln sich bei Vollmond',
          'Beide tragen dauerhaft Narben von ihren Verwandlungen',
          'Beide wurden von der Zaubererwelt als Wesen ausgegrenzt',
          'Greyback biss Lupin als Kind - sie sind direkt verbunden',
        ],
        traps: [
          'Greyback jagt gezielt Kinder, ist Todesser und bleibt auch in Menschengestalt bestialisch',
          'Lupin unterrichtete Verteidigung gegen die dunklen Künste, nimmt den Wolfsbanntrank und war als "Moony" einer der Rumtreiber',
        ],
      },
      {
        id: 'hp-lucius-draco',
        real: { name: 'Lucius Malfoy' },
        impostor: { name: 'Draco Malfoy' },
        similarities: [
          'Vater und Sohn mit identischem platinblondem Haar und spitzem Gesicht',
          'Beide sind Slytherins aus einer Reinblut-Familie',
          'Beide sind Todesser mit dem Dunklen Mal',
          'Beide verlieren im Lauf der Geschichte ihre Überzeugung und ihren Stolz',
        ],
        traps: [
          'Lucius trägt langes Haar und einen Gehstock mit verborgenem Zauberstab und sitzt im Schulrat/Ministerium',
          'Draco ist Sucher der Slytherin-Mannschaft und repariert das Verschwindekabinett im Raum der Wünsche',
        ],
      },
    ],
  },

  {
    id: 'marvel',
    name: 'Marvel / MCU',
    pairs: [
      {
        id: 'mcu-thor-loki',
        real: { name: 'Thor' },
        impostor: { name: 'Loki' },
        similarities: [
          'Adoptivbrüder und Söhne von Odin, aufgewachsen in Asgard',
          'Beide sind Jahrtausende alt und deutlich stärker als Menschen',
          'Beide waren Anwärter auf den Thron von Asgard',
          'Beide wechseln mehrfach zwischen Verbündetem und Gegner',
        ],
        traps: [
          'Loki ist in Wahrheit ein Frostriese, kämpft mit Dolchen und Illusionen und trägt grün-gold mit gehörntem Helm',
          'Thor führt Mjölnir bzw. Stormbreaker, ruft Blitze und trägt einen roten Umhang',
        ],
      },
      {
        id: 'mcu-tony-stane',
        real: { name: 'Tony Stark' },
        impostor: { name: 'Obadiah Stane' },
        similarities: [
          'Beide führten Stark Industries',
          'Beide bauten sich einen Panzeranzug mit Arc-Reaktor',
          'Beide sind brillante Ingenieure und Geschäftsleute',
          'Beide profitierten jahrelang vom Waffenhandel',
        ],
        traps: [
          'Stane ist glatzköpfig mit Vollbart, war Tonys Mentor und wird als Iron Monger zum Verräter',
          'Tony hat den markanten Kinnbart, wird zu Iron Man und opfert sich am Ende mit dem Fingerschnippen',
        ],
      },
      {
        id: 'mcu-steve-bucky',
        real: { name: 'Steve Rogers' },
        impostor: { name: 'Bucky Barnes' },
        similarities: [
          'Beste Freunde aus Brooklyn seit der Kindheit',
          'Beide kämpften im Zweiten Weltkrieg bei den Howling Commandos',
          'Beide bekamen eine Version des Supersoldaten-Serums',
          'Beide überlebten Jahrzehnte im Eis bzw. in Stasis',
        ],
        traps: [
          'Bucky hat einen Metallarm, war als Winter Soldier von Hydra programmiert und kämpft als Scharfschütze',
          'Steve trägt den Vibranium-Schild, ist Captain America und der moralische Anführer der Avengers',
        ],
      },
      {
        id: 'mcu-vision-ultron',
        real: { name: 'Vision' },
        impostor: { name: 'Ultron' },
        similarities: [
          'Beide entstanden aus Tony Starks und Bruce Banners KI-Forschung',
          'Beide basieren auf J.A.R.V.I.S.- bzw. Infinity-Stein-Technologie',
          'Beide haben einen künstlichen Körper mit rot leuchtenden Elementen',
          'Beide wurden im selben Wiedergeburtstank von Helen Cho gebaut',
        ],
        traps: [
          'Ultron will die Menschheit auslöschen, spricht sarkastisch-philosophisch und führt eine Roboterarmee',
          'Vision trägt den Gedankenstein auf der Stirn, hat einen gelben Umhang und kann Mjölnir anheben',
        ],
      },
      {
        id: 'mcu-strange-mordo',
        real: { name: 'Doctor Strange' },
        impostor: { name: 'Karl Mordo' },
        similarities: [
          'Beide wurden in Kamar-Taj von der Ältesten ausgebildet',
          'Beide sind Meister der mystischen Künste und öffnen Portale mit Slingringen',
          'Beide kämpften zusammen gegen Kaecilius',
          'Beide sind kompromisslose Idealisten mit starren Prinzipien',
        ],
        traps: [
          'Mordo wendet sich gegen alle Zauberer ("zu viele Zauberer") und nutzt einen Stab mit grüner Energie',
          'Strange ist Ex-Neurochirurg mit zitternden Händen, trägt das Auge von Agamotto und den Umhang der Levitation',
        ],
      },
      {
        id: 'mcu-clint-natasha',
        real: { name: 'Clint Barton (Hawkeye)' },
        impostor: { name: 'Natasha Romanoff (Black Widow)' },
        similarities: [
          'Beide sind S.H.I.E.L.D.-Agenten ohne Superkräfte',
          'Beide waren jahrelang Partner - Stichwort Budapest',
          'Beide haben eine blutige Vergangenheit, die sie wiedergutmachen wollen',
          'Beide reisen gemeinsam nach Vormir zum Seelenstein',
        ],
        traps: [
          'Clint kämpft mit Bogen und Trickpfeilen, hat eine geheime Familie auf einer Farm und wurde nach dem Snap zu Ronin',
          'Natasha hat rote Haare, wurde im Red Room ausgebildet und opfert sich auf Vormir',
        ],
      },
      {
        id: 'mcu-tchalla-killmonger',
        real: { name: "T'Challa" },
        impostor: { name: 'Erik Killmonger' },
        similarities: [
          'Cousins aus der wakandanischen Königsfamilie',
          'Beide tragen das Herzkraut und werden zum Black Panther',
          'Beide kämpften im rituellen Zweikampf um den Thron',
          'Beide wollen Wakandas Isolation beenden - nur auf gegensätzliche Weise',
        ],
        traps: [
          'Killmonger ist Ex-Navy-SEAL aus Oakland, hat den ganzen Körper mit Kill-Narben übersät und trägt den goldenen Panther-Anzug',
          "T'Challa ist der rechtmäßige König, Bruder von Shuri und trägt den schwarzen Anzug mit lila Energie",
        ],
      },
      {
        id: 'mcu-wanda-agatha',
        real: { name: 'Wanda Maximoff' },
        impostor: { name: 'Agatha Harkness' },
        similarities: [
          'Beide sind mächtige Hexen und stehen sich in Westview gegenüber',
          'Beide leben unter falscher Identität in derselben Sitcom-Realität',
          'Beide sind zu Gedankenkontrolle über eine ganze Stadt fähig',
          'Beide gelten in ihrem Umfeld als gefährlich außer Kontrolle',
        ],
        traps: [
          'Agatha stammt aus Salem des 17. Jahrhunderts, ihre Magie ist violett und sie saugt anderen Hexen die Kraft ab',
          'Wandas Magie ist rot, stammt vom Gedankenstein, sie erschafft die Zwillinge Billy und Tommy und wird durch das Darkhold zur Scarlet Witch',
        ],
      },
    ],
  },
];

// Attach the verified artwork. Kept out of the big literal above so the pair
// data stays readable and the image list can be regenerated on its own.
for (const topic of BUILTIN_TOPICS) {
  for (const pair of topic.pairs) {
    pair.real.image ??= imageFor(pair.real.name);
    pair.impostor.image ??= imageFor(pair.impostor.name);
  }
}

export const BUILTIN_TOPIC_IDS = new Set(BUILTIN_TOPICS.map((t) => t.id));
