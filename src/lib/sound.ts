let ctx: AudioContext | null = null;
let muted = false;

/* master bus -> reverb -> loa (mọi âm đi qua đây để có chiều sâu điện ảnh) */
let masterBus: GainNode | null = null;
let verbSend: GainNode | null = null;

export const setMuted = (m: boolean) => {
  muted = m;
  if (masterBus && !muted) {
    // trường hợp bật lại tiếng sau khi im
  }
};

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();

  // dựng bus 1 lần
  if (ctx && !masterBus) {
    masterBus = ctx.createGain();
    masterBus.gain.value = 1;

    // reverb phản xạ thật bằng Convolution — cho âm thanh "lan rộng" trong rạp
    const conv = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * 1.7); // 1.7s tail
    const ir = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    conv.buffer = ir;

    // lượng reverb nhỏ vừa đủ — không ngộp
    verbSend = ctx.createGain();
    verbSend.gain.value = 0.16;

    masterBus.connect(ctx.destination);
    masterBus.connect(verbSend);
    verbSend.connect(conv);
    conv.connect(ctx.destination);
  }
  return ctx;
}

function out(): GainNode | null {
  const c = ac();
  if (!c || !masterBus) return null;
  return masterBus;
}

/* ---------- lõi phát: tone & noise (đảm bảo đi qua bus có reverb) ---------- */

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.04,
  delay = 0,
  glide?: number,
  pan = 0
) {
  if (muted) return;
  const c = ac();
  const o = out();
  if (!c || !o) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  if (pan !== 0) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(g);
    g.connect(p);
    p.connect(o);
  } else {
    osc.connect(g);
    g.connect(o);
  }
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function noise(
  dur: number,
  vol: number,
  filterType: BiquadFilterType,
  freq: number,
  freqEnd: number | undefined,
  q: number,
  delay = 0,
  gateHz = 0,
  pan = 0
) {
  if (muted) return;
  const c = ac();
  const o = out();
  if (!c || !o) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    if (gateHz > 0) {
      const tm = i / c.sampleRate;
      const gate = ((tm * gateHz) % 1) < 0.45 ? 1 : 0.05;
      d[i] = (Math.random() * 2 - 1) * 0.5 * gate;
    } else {
      const env = Math.pow(1 - i / len, 1.4);
      d[i] = (Math.random() * 2 - 1) * env;
    }
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(freq, c.currentTime + delay);
  if (freqEnd !== undefined)
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), c.currentTime + delay + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime + delay);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
  src.connect(f);
  f.connect(g);

  if (pan !== 0) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    p.connect(o);
  } else {
    g.connect(o);
  }
  src.start(c.currentTime + delay);
}

/** iOS yêu cầu mở khóa AudioContext bằng một cú chạm thật */
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const b = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = b;
  src.connect(c.destination);
  src.start(0);
}

/** rung trên mobile */
export function buzz(pattern: number | number[] = 12) {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}

/* ============================================================
   LỚP NỀN HẬU TRƯỜNG — ấm, mỏng, không ghê, thở đều như phòng tối
   (thay drone lạnh cũ bằng nền hợp âm trần mềm, ít rung hơn)
   ============================================================ */

let bedNodes: { oscs: OscillatorNode[]; g: GainNode; breath: OscillatorNode } | null = null;

export function startBed(level = 0.5) {
  if (muted) return;
  const c = ac();
  const o = out();
  if (!c || !o || bedNodes) return;

  const g = c.createGain();
  g.gain.value = 0;

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  lp.Q.value = 0.6;

  // hợp âm trần: A2, C3, E3 — mỏng, thẳng chứ không chồng nhiễu
  const freqs = [110, 130.81, 164.81];
  const oscs = freqs.map((f) => {
    const x = c.createOscillator();
    x.type = "sine";
    x.frequency.value = f;
    x.detune.value = (Math.random() - 0.5) * 4; // hơi lệch tự nhiên
    x.connect(lp);
    x.start();
    return x;
  });

  // an sớ nhấp nhô chậm — giống hơi thở của căn phòng
  const breath = c.createOscillator();
  const bg = c.createGain();
  breath.frequency.value = 0.05;
  bg.gain.value = level * 0.012;
  breath.connect(bg);
  bg.connect(g.gain);
  breath.start();

  lp.connect(g);
  g.gain.linearRampToValueAtTime(level * 0.02, c.currentTime + 3);
  g.connect(o);

  bedNodes = { oscs, g, breath };
}

export function bedFadeDown(to = 0.006, sec = 2) {
  const c = ac();
  if (c && bedNodes) {
    bedNodes.g.gain.linearRampToValueAtTime(to, c.currentTime + sec);
  }
}
export function stopBed() {
  const c = ac();
  if (c && bedNodes) {
    bedNodes.g.gain.linearRampToValueAtTime(0, c.currentTime + 1.2);
    const n = bedNodes;
    bedNodes = null;
    setTimeout(() => {
      try {
        n.oscs.forEach((x) => x.stop());
        n.breath.stop();
      } catch {
        /* noop */
      }
    }, 1600);
  }
}

/* ============================================================
   BỘ HIỂU ỨNG ĐIỆN ẢNH — rèm mở, whip-pan, cận cảnh, trailer hit
   ============================================================ */

/** 3·2·1: đòn máy chiếu LỚN — boom + vang reverb + tia */
export const leaderStomp = (n: number) => {
  buzz(22);
  tone(56 - n * 6, 0.32, "sine", 0.2, 0, 28, 0.06);
  tone(180 - n * 16, 0.2, "triangle", 0.05, 0, 90, -0.1);
  noise(0.13, 0.1, "highpass", 3000, 800, 1, 0.024, 0, 0.15);
  noise(0.1, 0.06, "bandpass", 1600, 500, 6, 0.02, 0, -0.1);
};

/** whip-pan: SIOO gió vút qua — quang cảnh trượt nhanh */
export const whipPan = (dir: 1 | -1 = 1) => {
  buzz(8);
  noise(0.16, 0.1, "bandpass", 1200, 5200, 5, 0, 0, dir * 0.7);
  tone(300 * (dir > 0 ? 1 : 0.6), 0.12, "sine", 0.02, 0.02, 900, dir * 0.7);
};

/** cắt cảnh sắc: XEEN ngắn + dứt khoát */
export const sichtCut = () => {
  buzz(6);
  noise(0.04, 0.08, "bandpass", 5000, 900, 4, 0);
  tone(2400, 0.035, "sine", 0.02, 0.015, 2400);
};

/** xoáy vào cận cảnh: wûu-zoom */
export const dollyIn = () => {
  tone(120, 0.6, "sine", 0.04, 0, 400);
  noise(0.5, 0.02, "lowpass", 800, 300, 1, 0.05);
};

/** thẻ chương: TRỘNG HÔ + xáo giấy */
export const chapterSting = () => {
  buzz(30);
  tone(130, 0.5, "sine", 0.12, 0, 65, 0.08);     // trống ngâm lớn
  tone(66, 0.7, "sine", 0.08, 0.05, 40, -0.1);
  noise(0.6, 0.03, "lowpass", 1200, 350, 1, 0.08);
  noise(0.09, 0.05, "bandpass", 3500, 1000, 8, 0.5, 0, 0.2); // xáo giấy
};

/** nhịp tim LỚN — thồng thồng có echo */
export const heartbeat = () => {
  buzz([20, 100, 36]);
  tone(52, 0.28, "sine", 0.16, 0, 34);
  tone(40, 0.36, "sine", 0.12, 0.21, 26);
  noise(0.06, 0.03, "lowpass", 300, 120, 1, 0.02);
};

/** chọn người: NHẤC ĐIỆN THOẠI QUAY SỐ xác nhận */
export const dialKey = (n: number) => {
  buzz(13);
  const map: Record<number, [number, number]> = {
    1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336],
  };
  const [f1, f2] = map[n] ?? map[1];
  tone(f1, 0.14, "sine", 0.06);
  tone(f2, 0.14, "sine", 0.06);
  tone(f1 / 2, 0.02, "sine", 0.02, 0.006, undefined, 0.15);
};

/** chạm chip: TRÒN RẢNH trên dây đồng */
export const chipTap = () => {
  buzz(7);
  tone(1100, 0.035, "sine", 0.022, 0, 1112);
  noise(0.018, 0.03, "highpass", 6500, 7000, 2, 0.004);
};

/** lên/xuống nấc — thước kim loại cọ */
export const rulerUp = () => {
  buzz(6);
  noise(0.03, 0.03, "bandpass", 4200, 5600, 9, 0, 0, 0.1);
  tone(1200, 0.04, "square", 0.015, 0.01, 1700);
};
export const rulerDown = () => {
  buzz(6);
  noise(0.03, 0.03, "bandpass", 4200, 2500, 9, 0, 0, -0.1);
  tone(1700, 0.04, "square", 0.015, 0.01, 1200);
};

/** khắc dấu bước — đóng tráng đã xong */
export const stepStamp = () => {
  buzz(11);
  tone(120, 0.09, "sine", 0.1, 0, 70);
  noise(0.07, 0.07, "lowpass", 600, 150, 1, 0.01);
  tone(1400, 0.06, "square", 0.018, 0.06);
};

/** quét vào phiếu — kém dot-matrix một đoạn */
export const scanLine = () => {
  buzz(17);
  noise(0.18, 0.07, "highpass", 2300, 2300, 1, 0, 15, 0.1); // z̵                  z̵t
  tone(2000, 0.025, "square", 0.015, 0.16);
  tone(2000, 0.025, "square", 0.015, 0.19);
};

/** nhịp lặng: đồng ngân rất nhẹ — không gian yên */
export const reflectBreath = () => {
  tone(880, 2, "sine", 0.016, 0, 879);
  tone(1318, 2.4, "sine", 0.008, 0.03, 1316);
  noise(0.6, 0.015, "highpass", 9000, 6000, 1, 0.1);
};

/** còi từ chối LỚN — lỗi */
export const denyKlaxon = () => {
  buzz([45, 65, 45]);
  tone(200, 0.34, "sawtooth", 0.11, 0, 150);
  tone(300, 0.2, "square", 0.04, 0.34, 200);
};

/** [THANH TOÁN] — kém tay quay + dingdong két mở TO rèo */
export const cashRegister = () => {
  buzz([30, 80, 55]);
  noise(0.13, 0.08, "bandpass", 800, 2600, 8, 0, 0, -0.1);
  tone(170, 0.11, "square", 0.06, 0, 340);
  tone(1244, 0.1, "square", 0.06, 0.38);
  tone(1244, 0.1, "square", 0.06, 0.52);
  tone(1864, 0.3, "triangle", 0.08, 0.65);
  tone(932, 0.3, "sine", 0.03, 0.65, undefined, 0.12);
  noise(0.09, 0.06, "highpass", 8000, 6000, 1, 0.7);
};

/** máy in: dot-matrix rền rì dài */
export const printChatter = (ms: number) => {
  if (muted) return;
  const c = ac();
  const o = out();
  if (!c || !o) return;
  const dur = ms / 1000;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / c.sampleRate;
    const gate = ((t * 13.5) % 1) < 0.43 ? 1 : 0.06;
    const wobble = 0.88 + 0.12 * Math.sin(t * 47);
    d[i] = (Math.random() * 2 - 1) * 0.6 * gate * wobble;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 2.1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.13, c.currentTime + 0.2);
  g.gain.setValueAtTime(0.13, c.currentTime + dur - 0.3);
  g.gain.linearRampToValueAtTime(0.0, c.currentTime + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(o);
  src.start();
};

/** cắt giấy: SẾP, cảm giác rộng */
export const cutterSnip = () => {
  buzz([14, 45, 80]);
  noise(0.08, 0.18, "highpass", 7500, 1600, 0.55, 0);
  noise(0.1, 0.11, "bandpass", 2800, 750, 3.5, 0.05);
  tone(170, 0.07, "square", 0.04, 0.13);
};

/** chụp ảnh: cửa sập film lớn */
export const shutterClick = () => {
  buzz(18);
  tone(300, 0.055, "square", 0.05);
  noise(0.055, 0.11, "highpass", 6000, 1600, 1, 0.005);
  tone(1100, 0.025, "sine", 0.03, 0.1);
};

/** sao chép: stamp cao su bịch */
export const rubberStamp = () => {
  buzz(14);
  noise(0.07, 0.09, "lowpass", 550, 180, 1);
  tone(130, 0.09, "sine", 0.1);
  tone(1046, 0.1, "triangle", 0.022, 0.08);
};

/** hoàn thành / khai trương: khóa khen lên */
export const lockClick = () => {
  buzz(11);
  tone(720, 0.065, "square", 0.045);
  noise(0.045, 0.045, "bandpass", 2100, 1100, 8, 0.02);
  tone(1100, 0.055, "square", 0.032, 0.08);
  tone(1568, 0.09, "sine", 0.018, 0.15);
};

/** kết phim: phim chạy trục cạch cạch rồi tắt dần */
export const reelEnd = () => {
  buzz(36);
  for (let i = 0; i < 5; i++) {
    noise(0.05, 0.045, "bandpass", 2300, 1100, 10, i * 0.095);
  }
  tone(196, 0.8, "sine", 0.05, 0.5, 70);
  noise(1.5, 0.02, "lowpass", 700, 180, 1, 0.65);
};

/* ---------- alias giữ tương thích nhẹ (không ai gọi thì không sao) ---------- */
export const projectorTick = (n = 2) => leaderStomp(n);
export const scanBeep = scanLine;
export const confirmBeep = chipTap;
export const errorBuzz = denyKlaxon;
export const payBeep = cashRegister;
export const sceneCut = sichtCut;
export const pickTick = chipTap;
export const stepTick = rulerUp;
export const keyTick = chipTap;
export const chapterCard = chapterSting;
/** alias của whip/cut để các component cũ vẫn gọi đúng */
export const filmCut = sichtCut;
/** alias nhịp lặng */
export const reflectChime = reflectBreath;
export function pageTurn() {
  chapterSting();
}
export function startAmbient() {}
export function stopAmbient() {}
export function setAmbient() {}
