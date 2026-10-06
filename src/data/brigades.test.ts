import { expect, it } from 'vitest';
import { initialGameState } from './mock';
import { brigades, vehiclesOf } from './brigades';

it('une patrouille numérotée par véhicule de chaque brigade, au format COMMUNE.NUMERO', () => {
  const units = Object.values(initialGameState.units);
  for (const b of brigades) {
    const mine = units.filter((u) => u.sectorId === b.id);
    expect(mine.map((u) => u.callsign), b.label).toEqual(Array.from({ length: vehiclesOf(b) }, (_, i) => `${b.label}.${101 + i}`));
    expect(mine.every((u) => u.service === 'GENDARMERIE')).toBe(true);
  }
  expect(new Set(units.map((u) => u.callsign)).size).toBe(units.length);
  expect(units.every((u) => /^[^.]+\.\d{3}$/.test(u.callsign))).toBe(true);
});

it("les brigades sont dans le Val-d'Oise", () => {
  for (const b of brigades) {
    expect(b.lat, b.label).toBeGreaterThan(48.9);
    expect(b.lat, b.label).toBeLessThan(49.25);
    expect(b.lng, b.label).toBeGreaterThan(1.6);
    expect(b.lng, b.label).toBeLessThan(2.6);
  }
});
