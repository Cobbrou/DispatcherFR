import { expect, it } from 'vitest';
import { suggestAddresses } from './geocode';

it('propose des adresses, numéro conservé', () => {
  expect(suggestAddresses('12 car')).toContain('12 rue Carnot, Melun');
  expect(suggestAddresses('chateau')).toContain('rue du Château, Melun');
  expect(suggestAddresses('')).toEqual([]);
  expect(suggestAddresses('zzzz')).toEqual([]);
});
