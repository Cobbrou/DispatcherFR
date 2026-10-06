import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/rng';
import { buildIncident, emptyDraft, isDraftValid, nextIncidentId, patchDraft, startCall } from './callEngine';
import { generateCall } from './scenarioGenerator';

const fresh = () => startCall(generateCall(mulberry32(1), 'POLICE'), '');

describe('fiche saisie par l\'opérateur', () => {
  it('démarre vide, sauf le numéro s\'il n\'est pas masqué', () => {
    const call = generateCall(mulberry32(1), 'POLICE');
    const shown = { ...call, callerPhoneNumber: call.truth.callerPhone };
    const hidden = { ...call, callerPhoneNumber: 'Numéro masqué' };
    expect(startCall(shown, '').draft).toEqual({ ...emptyDraft(), callerPhone: call.truth.callerPhone });
    expect(startCall(hidden, '').draft).toEqual(emptyDraft());
  });

  it('la gravité découle de la catégorie du glossaire', () => {
    let a = patchDraft(fresh(), { category: 'tapage' });
    expect(a.draft.gravity).toBe(2);
    a = patchDraft(a, { category: 'catégorie inventée' });
    expect(a.draft.gravity).toBeNull();
  });

  it('exige catégorie du glossaire et adresse', () => {
    let a = fresh();
    expect(isDraftValid(a.draft)).toBe(false);
    a = patchDraft(a, { category: 'vol avec violences' });
    expect(isDraftValid(a.draft)).toBe(false);
    a = patchDraft(a, { address: '  ' });
    expect(isDraftValid(a.draft)).toBe(false);
    a = patchDraft(a, { address: '12 rue Carnot, Melun' });
    expect(isDraftValid(a.draft)).toBe(true);
    expect(isDraftValid(patchDraft(a, { category: 'inconnue' }).draft)).toBe(false);
  });

  it('construit une fiche PENDING uniquement avec la saisie, géocodée', () => {
    const a = patchDraft(fresh(), { category: 'vol avec violences', address: ' 12 rue Carnot, Melun ', callerLastName: ' Durand ' });
    const inc = buildIncident(a.draft, 'FICH-2026-0047', 1000, 'GENDARMERIE');
    expect(inc).toMatchObject({
      status: 'PENDING', gravity: 3, callerLastName: 'Durand', address: '12 rue Carnot, Melun',
      zone: 'POLICE', assignedUnits: [], createdTimestamp: 1000,
    });
    expect(inc.coordinates).not.toBeNull();
  });

  it('adresse introuvable : pas de coordonnées, zone du poste', () => {
    const a = patchDraft(fresh(), { category: 'tapage', address: 'quelque part' });
    const inc = buildIncident(a.draft, 'X', 0, 'GENDARMERIE');
    expect(inc.coordinates).toBeNull();
    expect(inc.zone).toBe('GENDARMERIE');
  });

  it('refuse une fiche incomplète', () => {
    expect(() => buildIncident(emptyDraft(), 'X', 0, 'POLICE')).toThrow();
  });

  it('numérote à la suite', () => {
    expect(nextIncidentId(['FICH-2026-0042', 'FICH-2026-0046'], Date.parse('2026-10-06T00:00:00Z'))).toBe('FICH-2026-0047');
  });
});
