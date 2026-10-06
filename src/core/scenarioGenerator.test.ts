import { describe, expect, it } from 'vitest';
import { categoryByLabel } from '../data/categories';
import { templates } from '../data/generatorData';
import { geocode } from '../lib/geocode';
import { mulberry32 } from '../lib/rng';
import { generateCall } from './scenarioGenerator';

describe('glossaire', () => {
  it('contient 313 catégories avec un niveau 1 à 5', () => {
    expect(categoryByLabel.size).toBe(313);
    for (const c of categoryByLabel.values()) expect([1, 2, 3, 4, 5]).toContain(c.level);
  });

  it('couvre toutes les catégories des modèles d\'appels', () => {
    for (const t of templates) expect(categoryByLabel.has(t.category), t.category).toBe(true);
  });
});

describe('generateCall', () => {
  it('est reproductible avec une graine et varié entre graines', () => {
    expect(generateCall(mulberry32(1), 'POLICE')).toEqual(generateCall(mulberry32(1), 'POLICE'));
    const sigs = new Set(Array.from({ length: 30 }, (_, i) => generateCall(mulberry32(i), 'POLICE').truth.opening));
    expect(sigs.size).toBeGreaterThan(15);
  });

  it('produit des appels cohérents dans la zone demandée', () => {
    for (let i = 0; i < 200; i++) {
      const { truth, callerStressLevel, callerPhoneNumber } = generateCall(mulberry32(i), i % 2 ? 'POLICE' : 'GENDARMERIE');
      expect(categoryByLabel.has(truth.category)).toBe(true);
      expect(truth.zone).toBe(i % 2 ? 'POLICE' : 'GENDARMERIE');
      expect(geocode(truth.address)?.zone).toBe(truth.zone);
      expect(callerStressLevel).toBeGreaterThanOrEqual(0);
      expect(callerStressLevel).toBeLessThan(100);
      expect(truth.suspects === 0).toBe(truth.suspectDescription === '');
      expect([truth.callerPhone, 'Numéro masqué']).toContain(callerPhoneNumber);
    }
  });
});

describe('geocode', () => {
  it('retrouve une rue malgré accents et casse', () => {
    expect(geocode('12 RUE SAINT BARTHELEMY melun')?.zone).toBe('POLICE');
    expect(geocode("3 boulevard de l'Almont")?.zone).toBe('POLICE');
    expect(geocode('4 rue inconnue, Paris')).toBeNull();
  });
});
