// Pure-function checks that need no server: the parts of the wiki assistant
// that decide what is safe and what is useful.
import {
  cleanSlug,
  cleanQuery,
  compareCategories,
  normaliseImage,
  usefulCategories,
  WikiError,
} from '../src/lib/wiki';
import { parseCustomTopic, TopicValidationError } from '../src/lib/validateTopic';

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
function throws(label: string, fn: () => unknown) {
  try {
    fn();
    check(label, false, 'kein Fehler geworfen');
  } catch (e) {
    check(label, e instanceof WikiError || e instanceof TopicValidationError, String(e));
  }
}

console.log('\nUnit-Tests\n');

console.log('1) Wiki-Name geht in den Hostnamen — muss streng sein');
check('normaler Name ok', cleanSlug('onepiece') === 'onepiece');
check('Bindestriche ok', cleanSlug('jujutsu-kaisen') === 'jujutsu-kaisen');
check('Großschreibung wird normalisiert', cleanSlug('OnePiece') === 'onepiece');
throws('Punkt abgelehnt (Host-Wechsel)', () => cleanSlug('evil.example.com'));
throws('Schrägstrich abgelehnt', () => cleanSlug('one/piece'));
throws('@ abgelehnt', () => cleanSlug('a@b'));
throws('leer abgelehnt', () => cleanSlug(''));
throws('zu kurz abgelehnt', () => cleanSlug('x'));
throws('Suche zu kurz', () => cleanQuery('a'));

console.log('2) Bild-URLs');
const raw =
  'https://static.wikia.nocookie.net/onepiece/images/5/52/Zoro.png/revision/latest/scale-to-width-down/188?cb=2024';
check(
  'Fandom-Thumbnail wird auf feste Breite normiert',
  normaliseImage(raw) ===
    'https://static.wikia.nocookie.net/onepiece/images/5/52/Zoro.png/revision/latest/scale-to-width-down/400',
  String(normaliseImage(raw)),
);
check('fremder Host wird verworfen', normaliseImage('https://evil.example.com/x.png') === undefined);
check('kein Bild wird verworfen', normaliseImage('https://static.wikia.nocookie.net/a/b/c.txt') === undefined);
check('Unsinn wird verworfen', normaliseImage(42) === undefined);

console.log('3) Kategorien');
const cats = usefulCategories([
  { title: 'Category:Swordsmen' },
  { title: 'Category:Pirates' },
  { title: 'Category:Article stubs' },
  { title: 'Category:Images needing categories' },
  { title: 'Category:Characters' },
  { title: 'Category:A' },
]);
check('brauchbare Kategorien bleiben', cats.includes('Swordsmen') && cats.includes('Pirates'), cats.join(','));
check('Wiki-Verwaltungskram fliegt raus', !cats.some((c) => /stub|needing|^Characters$/i.test(c)), cats.join(','));
check('zu kurze fliegen raus', !cats.includes('A'));

const cmp = compareCategories(['Swordsmen', 'Pirates', 'Bounty'], ['Swordsmen', 'Marines']);
check('Gemeinsame erkannt', cmp.shared.join(',') === 'Swordsmen');
check('Nur A erkannt', cmp.onlyA.join(',') === 'Pirates,Bounty');
check('Nur B erkannt', cmp.onlyB.join(',') === 'Marines');

console.log('4) Der Assistent baut JSON, das dieselbe Prüfung besteht');
const built = JSON.stringify({
  name: 'One Piece Test',
  pairs: [1, 2, 3].map((i) => ({
    real: {
      name: `Held ${i}`,
      image:
        'https://static.wikia.nocookie.net/onepiece/images/5/52/Zoro.png/revision/latest/scale-to-width-down/400',
    },
    impostor: { name: `Fälschung ${i}` },
    similarities: ['Beide: Swordsmen', 'Beide: Pirates', 'Beide: laut'],
    traps: ['Nur B: Marines'],
  })),
});
const topic = parseCustomTopic(built);
check('Assistenten-JSON wird akzeptiert', topic.pairs.length === 3);
check(
  'Bild mit Fandom-Suffix überlebt die Validierung',
  topic.pairs[0].real.image?.endsWith('/400') === true,
  String(topic.pairs[0].real.image),
);

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen\n`);
process.exit(failed === 0 ? 0 : 1);
