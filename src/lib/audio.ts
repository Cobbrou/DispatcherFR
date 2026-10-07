import type { GameState } from '../types';

// Sons synthétisés (Web Audio) : aucun fichier à servir ni à licencier.
let ctx: AudioContext | null = null;
let muted = false;

export const isMuted = () => muted;
export const setMuted = (m: boolean) => {
  muted = m;
};

/** Le navigateur n'autorise le son qu'après un geste de l'utilisateur : à appeler au premier clic ou à la première touche. */
export function unlockAudio() {
  ctx ??= new AudioContext();
  void ctx.resume();
}

const ready = () => !muted && ctx?.state === 'running';

function tone(freq: number, at: number, dur: number, type: OscillatorType, peak: number) {
  const c = ctx!;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.01);
  gain.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

/** Sonnerie du téléphone : double tonalité, deux fois. */
export function ring() {
  if (!ready()) return;
  for (const at of [0, 0.5]) {
    tone(440, at, 0.35, 'sine', 0.1);
    tone(480, at, 0.35, 'sine', 0.1);
  }
}

/** Triple bip : demande de renfort, de secours, message urgent. */
export function alertBeep() {
  if (!ready()) return;
  for (const at of [0, 0.2, 0.4]) tone(880, at, 0.12, 'square', 0.06);
}

/** Grésillement de la radio : bruit blanc qui s'éteint. */
export function squelch() {
  if (!ready()) return;
  const c = ctx!;
  const buf = c.createBuffer(1, Math.round(c.sampleRate * 0.15), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buf;
  gain.gain.value = 0.06;
  src.connect(gain).connect(c.destination);
  src.start();
}

export type Sound = 'ring' | 'alert' | 'squelch';
export const PLAY: Record<Sound, () => void> = { ring, alert: alertBeep, squelch };

/**
 * Son déclenché par un changement d'état : un appel entre dans la file, ou un message radio paraît.
 * ponytail: la sonnerie ne retentit qu'une fois par appel ; la répéter tant que la file n'est pas vide si besoin.
 */
export function soundFor(prev: Pick<GameState, 'callQueue' | 'radio'>, next: Pick<GameState, 'callQueue' | 'radio'>): Sound | null {
  if (next.callQueue.length > prev.callQueue.length) return 'ring';
  const last = next.radio.at(-1);
  if (last && last.id !== prev.radio.at(-1)?.id) return last.urgent ? 'alert' : 'squelch';
  return null;
}
