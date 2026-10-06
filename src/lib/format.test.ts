import { expect, it } from 'vitest';
import { formatDistance, formatWait } from './format';
import { estimateEtaMs } from './route';

it("formate durée d'attente et distance", () => {
  expect(formatWait(125_000)).toBe('2:05');
  expect(formatDistance(430)).toBe('430 m');
  expect(formatDistance(3240)).toBe('3,2 km');
});

it('estime un trajet à ~60 km/h avec détour', () => {
  expect(estimateEtaMs(10_000) / 60_000).toBeCloseTo(13, 0); // 13 km à 60 km/h
});
