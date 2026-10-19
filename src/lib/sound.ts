let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => {
  muted = m;
};

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.04, delay = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Scanner beep — classic POS scan */
export const scanBeep = () => {
  tone(1180, 0.07, "square", 0.045);
  tone(1560, 0.09, "square", 0.04, 0.06);
};

/** Soft key tick */
export const keyTick = () => {
  tone(920, 0.03, "square", 0.014);
};

/** Confirm / select */
export const confirmBeep = () => {
  tone(880, 0.08, "square", 0.04);
  tone(1320, 0.1, "square", 0.035, 0.08);
};

/** Error buzz */
export const errorBuzz = () => {
  tone(190, 0.22, "sawtooth", 0.05);
  tone(140, 0.25, "sawtooth", 0.04, 0.12);
};

/** Big cash-register open */
export const payBeep = () => {
  tone(660, 0.1, "square", 0.05);
  tone(880, 0.1, "square", 0.05, 0.1);
  tone(1320, 0.16, "square", 0.05, 0.2);
  tone(1760, 0.3, "square", 0.045, 0.32);
};

/** Dot-matrix printer chatter */
export const printChatter = (ms: number) => {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const dur = ms / 1000;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / c.sampleRate;
    // pulse train at ~13.5 Hz to sound like print-head passes
    const gate = (t * 13.5) % 1 < 0.42 ? 1 : 0.08;
    d[i] = (Math.random() * 2 - 1) * 0.5 * gate;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 2.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.09, c.currentTime + 0.15);
  g.gain.setValueAtTime(0.09, c.currentTime + dur - 0.2);
  g.gain.linearRampToValueAtTime(0.0, c.currentTime + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start();
};

/** Paper cutter snip */
export const cutterSnip = () => {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const dur = 0.09;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4000, c.currentTime);
  lp.frequency.exponentialRampToValueAtTime(300, c.currentTime + dur);
  const g = c.createGain();
  g.gain.value = 0.22;
  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start();
  tone(220, 0.06, "square", 0.03, 0.08);
};
