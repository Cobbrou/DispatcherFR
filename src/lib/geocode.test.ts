import { expect, it } from 'vitest';
import { suggestAddresses } from './geocode';

it('propose des adresses, numéro conservé', () => {
  expect(suggestAddresses('12 pasteur lou')).toContain('12 rue Pasteur, Louvres');
  expect(suggestAddresses('grande rue persan')).toContain('Grande Rue, Persan');
  expect(suggestAddresses('')).toEqual([]);
  expect(suggestAddresses('zzzz')).toEqual([]);
});
