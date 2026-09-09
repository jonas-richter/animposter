// Suggested player names. Used as a rotating placeholder and behind the dice
// button, so the name field is never a blank stare - and so a room full of
// people does not end up as "Spieler 1..4".
export const NAME_POOL = [
  'Jonas',
  'Ayda',
  'Mounir',
  'Vita',
  'Roxy',
  'Kira',
  'Hannat',
  'Tyrick',
  'Neal',
  'Kurosh',
  'Mehdi',
  'Mahdi',
  'Basit',
  'Giu',
];

export function randomName(exclude: string[] = []): string {
  const taken = new Set(exclude.map((n) => n.toLowerCase()));
  const free = NAME_POOL.filter((n) => !taken.has(n.toLowerCase()));
  const pool = free.length > 0 ? free : NAME_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}
