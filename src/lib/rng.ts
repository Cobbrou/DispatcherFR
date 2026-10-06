/** Générateur aléatoire : `Math.random` en jeu, `mulberry32(seed)` dans les tests. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

/** Entier dans [min, max] inclus. */
export const int = (rng: Rng, [min, max]: readonly [number, number]): number =>
  min + Math.floor(rng() * (max - min + 1));

export const chance = (rng: Rng, p: number): boolean => rng() < p;

export function weighted<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  let r = rng() * items.reduce((sum, i) => sum + i.weight, 0);
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}
