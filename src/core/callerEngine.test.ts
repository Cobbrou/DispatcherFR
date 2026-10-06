import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/rng';
import { applyReply, hangUp, operatorSays, startCall } from './callEngine';
import { createProceduralCaller, detectTopics } from './callerEngine';
import { generateCall } from './scenarioGenerator';
import type { ActiveCall, CallerPersonality, IncomingCall } from '../types';

/** Appel dont la personnalité est forcée. */
function callWith(personality: CallerPersonality, seed = 1): IncomingCall {
  const c = generateCall(mulberry32(seed), 'POLICE');
  return { ...c, truth: { ...c.truth, personality } };
}

async function ask(caller: ReturnType<typeof createProceduralCaller>, a: ActiveCall, text: string) {
  const asked = operatorSays(a, text);
  return applyReply(asked, await caller.reply(asked, text));
}

describe('detectTopics : faux positifs', () => {
  it('« respirez » et « j\'envoie les pompiers » rassurent, ils ne questionnent pas sur les blessés', () => {
    expect(detectTopics('Respirez calmement')).toEqual(['REASSURE']);
    expect(detectTopics("J'envoie les pompiers")).not.toContain('VICTIMS');
    expect(detectTopics('Est-ce qu\'il respire ?')).toContain('VICTIMS');
  });

  it('« dépêchez-vous » n\'est pas une insulte', () => {
    expect(detectTopics('Dépêchez-vous de me donner votre adresse')).not.toContain('RUDE');
  });
});

describe('detectTopics', () => {
  it.each([
    ['Quelle est votre adresse ?', 'ADDRESS'],
    ['Où êtes-vous exactement ?', 'ADDRESS'],
    ['Comment vous appelez-vous ?', 'NAME'],
    ['Y a-t-il des blessés ?', 'VICTIMS'],
    ['Combien sont-ils ?', 'SUSPECT_COUNT'],
    ['Ils ont une arme ?', 'WEAPON'],
    ['Restez en ligne, une patrouille arrive', 'REASSURE'],
    ['Bonne soirée, au revoir', 'CLOSE'],
    ['Vous êtes un idiot', 'RUDE'],
    ['blabla zzz', 'UNKNOWN'],
  ])('« %s » → %s', (text, topic) => {
    expect(detectTopics(text)).toContain(topic);
  });

  it('distingue victimes et auteurs', () => {
    expect(detectTopics('Combien de blessés ?')).toEqual(['VICTIMS']);
  });

  it('un simple bonjour demande le récit', () => {
    expect(detectTopics('Police secours, j\'écoute')).toEqual(['WHAT']);
  });
});

describe('appelant procédural', () => {
  it('donne la vérité sur l\'adresse et le nom (appelant calme)', async () => {
    const call = callWith('CALME');
    const caller = createProceduralCaller(mulberry32(7));
    let a = startCall(call, caller.opening(call));
    a = await ask(caller, a, 'Quelle est votre adresse ?');
    expect(a.transcript.at(-1)?.text).toContain(call.truth.address);
    a = await ask(caller, a, 'Votre nom et prénom ?');
    expect(a.transcript.at(-1)?.text).toContain(call.truth.callerLastName);
  });

  it('n\'invente rien : pas d\'arme si la vérité n\'en contient pas', async () => {
    const base = callWith('CALME');
    const call = { ...base, truth: { ...base.truth, weapons: '', suspects: 1 } };
    const caller = createProceduralCaller(mulberry32(3));
    const a = await ask(caller, startCall(call, ''), 'Y a-t-il une arme ?');
    expect(a.transcript.at(-1)?.text).toMatch(/non|pas d'arme/i);
  });

  it('s\'agace des répétitions et raccroche si on est désagréable', async () => {
    const call = callWith('CALME');
    const caller = createProceduralCaller(mulberry32(5));
    let a = startCall(call, '');
    a = await ask(caller, a, 'Quelle est votre adresse ?');
    const before = a.stress;
    a = await ask(caller, a, 'Quelle est votre adresse ?');
    expect(a.transcript.at(-1)?.text).toMatch(/déjà dit|viens de vous le dire/);
    expect(a.stress).toBeGreaterThan(before - 1);
    for (let i = 0; i < 6 && !a.endReason; i++) a = await ask(caller, a, 'Vous êtes un idiot');
    expect(a.endReason).toBe('RACCROCHE');
  });

  it('un appelant évasif peut refuser son nom puis le donner', async () => {
    const call = callWith('EVASIF');
    let refusals = 0;
    for (let seed = 0; seed < 40; seed++) {
      const caller = createProceduralCaller(mulberry32(seed));
      let a = startCall(call, '');
      a = await ask(caller, a, 'Votre nom ?');
      if (!a.transcript.at(-1)?.text.includes(call.truth.callerLastName)) refusals++;
      a = await ask(caller, a, 'Votre nom ?');
      expect(a.transcript.at(-1)?.text).toContain(call.truth.callerLastName);
    }
    expect(refusals).toBeGreaterThan(10);
  });

  it('conclut l\'appel quand l\'opérateur dit au revoir', async () => {
    const caller = createProceduralCaller(mulberry32(1));
    const a = await ask(caller, startCall(callWith('CALME'), ''), 'Bien reçu, au revoir.');
    expect(a.endReason).toBe('FIN');
  });

  it('raccrocher est idempotent', () => {
    const a = hangUp(startCall(callWith('CALME'), ''));
    expect(a.endReason).toBe('OPERATEUR');
    expect(hangUp(a)).toBe(a);
  });
});
