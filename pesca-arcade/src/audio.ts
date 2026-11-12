// Áudio 100% gerado por código (Web Audio): nenhuma amostra, nenhum download.
// - Uma trilha diferente para cada mar (andamento, escala, timbre e percussão próprios).
// - A música reage ao jogo: ganha percussão durante a pescaria e acelera no chefão.
// - Efeitos com camadas (ataque + corpo + ruído) passando por compressor para não estourar.
type Wave = OscillatorType;
interface Track { bpm: number; root: number; minor: boolean; prog: number[][]; scale: number[]; lead: Wave; pad: Wave; echo: number; fb: number; perc: 'samba' | 'ondas' | 'sinos' | 'pulso'; cut: number; density: number }
const TRACKS: Track[] = [
  // Rio: alegre, maior, levada de samba leve
  { bpm: 104, root: 60, minor: false, prog: [[0, 0], [9, 1], [5, 0], [7, 0]], scale: [0, 2, 4, 7, 9], lead: 'triangle', pad: 'triangle', echo: .29, fb: .22, perc: 'samba', cut: 2600, density: .62 },
  // Mar: pôr do sol, balanço lento de ondas
  { bpm: 84, root: 62, minor: false, prog: [[0, 0], [7, 0], [9, 1], [5, 0]], scale: [0, 2, 4, 7, 9, 11], lead: 'sine', pad: 'triangle', echo: .36, fb: .32, perc: 'ondas', cut: 2000, density: .5 },
  // Gelo: sinos de cristal, menor, muito eco
  { bpm: 72, root: 57, minor: true, prog: [[0, 1], [8, 0], [3, 0], [10, 0]], scale: [0, 3, 5, 7, 10], lead: 'sine', pad: 'sine', echo: .42, fb: .46, perc: 'sinos', cut: 3200, density: .42 },
  // Abismo: grave, tenso, pulso lento
  { bpm: 60, root: 50, minor: true, prog: [[0, 1], [1, 0], [0, 1], [8, 0]], scale: [0, 1, 3, 7, 8], lead: 'sawtooth', pad: 'sawtooth', echo: .5, fb: .5, perc: 'pulso', cut: 900, density: .3 },
];

class GameAudio {
  ctx: AudioContext | null = null;
  private master!: GainNode; private mus!: GainNode; private fx!: GainNode; private delay!: DelayNode; private fbG!: GainNode; private lp!: BiquadFilterNode;
  private noiseBuf!: AudioBuffer;
  private timer = 0; private next = 0; private step = 0; private mi = 5;
  private scene = 0; private intensity = 0;
  mute = false; musicOn = true; sfxOn = true; vibOn = true;
  private started = false;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return null;
      const a: AudioContext = new AC(); this.ctx = a;
      const comp = a.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .18;
      this.master = a.createGain(); this.master.connect(comp); comp.connect(a.destination);
      this.mus = a.createGain(); this.fx = a.createGain(); this.mus.connect(this.master); this.fx.connect(this.master);
      this.lp = a.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.connect(this.mus);
      this.delay = a.createDelay(1.2); this.fbG = a.createGain(); const dlp = a.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1800;
      this.delay.connect(dlp); dlp.connect(this.fbG); this.fbG.connect(this.delay); dlp.connect(this.lp);
      const n = a.sampleRate * 2, b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; this.noiseBuf = b;
      this.applyGains(); this.applyTrack();
    } catch { this.ctx = null; }
    return this.ctx;
  }
  private applyGains() { if (!this.ctx) return; const t = this.ctx.currentTime; this.master.gain.setTargetAtTime(this.mute ? 0 : 1, t, .03); this.mus.gain.setTargetAtTime(this.musicOn ? .9 : 0, t, .08); this.fx.gain.setTargetAtTime(this.sfxOn ? 1 : 0, t, .02); }
  private applyTrack() { if (!this.ctx) return; const k = TRACKS[this.scene], t = this.ctx.currentTime; this.delay.delayTime.setTargetAtTime(k.echo, t, .2); this.fbG.gain.setTargetAtTime(k.fb, t, .2); this.lp.frequency.setTargetAtTime(k.cut * (this.intensity ? 1.5 : 1), t, .4); }

  configure(o: { mute?: boolean; music?: boolean; sfx?: boolean; vib?: boolean }) { if (o.mute !== undefined) this.mute = o.mute; if (o.music !== undefined) this.musicOn = o.music; if (o.sfx !== undefined) this.sfxOn = o.sfx; if (o.vib !== undefined) this.vibOn = o.vib; this.applyGains(); }
  setScene(i: number) { i = Math.max(0, Math.min(TRACKS.length - 1, i)); if (i === this.scene) return; this.scene = i; this.step = 0; this.applyTrack(); }
  /** 0 = barco parado, 1 = pescando, 2 = chefão */
  setIntensity(n: number) { if (n === this.intensity) return; this.intensity = n; this.applyTrack(); }
  start() { const a = this.ensure(); if (!a) return; if (a.state === 'suspended') a.resume().catch(() => {}); if (this.started) return; this.started = true;
    // som de água ao fundo
    const src = a.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; const g = a.createGain(); g.gain.value = .035; src.connect(f); f.connect(g); g.connect(this.mus); src.start();
    this.next = a.currentTime + .15; this.timer = window.setInterval(() => this.tick(), 80); }
  suspend() { try { this.ctx && this.ctx.suspend(); } catch { /* */ } }
  resume() { try { if (this.ctx && this.started && !this.mute) this.ctx.resume(); } catch { /* */ } }

  private osc(dest: AudioNode, midi: number, t: number, d: number, type: Wave, vol: number, att = .01, detune = 0) {
    const a = this.ctx!, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); o.detune.value = detune;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .05); return g;
  }
  private hit(dest: AudioNode, t: number, d: number, vol: number, freq: number, type: BiquadFilterType = 'highpass') {
    const a = this.ctx!, s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(); s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + d + .02);
  }
  private tick() {
    const a = this.ctx; if (!a || a.state !== 'running' || !this.musicOn || this.mute) { if (a) this.next = Math.max(this.next, a.currentTime + .1); return; }
    const k = TRACKS[this.scene], spb = 60 / (k.bpm * (this.intensity === 2 ? 1.25 : 1)) / 2, out = this.lp;
    if (this.next < a.currentTime - .5) this.next = a.currentTime + .05;
    while (this.next < a.currentTime + .3) {
      const t = this.next, s = this.step, bar = Math.floor(s / 8) % 4, ch = k.prog[bar], root = k.root + ch[0], third = ch[1] ? 3 : 4, in8 = s % 8;
      // acorde sustentado
      if (in8 === 0) [0, third, 7].forEach((x, i) => this.osc(out, root + x - 12, t, spb * 8.4, k.pad, k.pad === 'sawtooth' ? .012 : .022, .5, i * 4 - 4));
      // baixo
      if (k.perc === 'samba') { if (in8 === 0 || in8 === 3 || in8 === 6) this.osc(out, root - 24 + (in8 === 3 ? 7 : 0), t, spb * 1.6, 'sine', .085, .01); }
      else if (k.perc === 'pulso') { if (in8 === 0) this.osc(out, root - 24, t, spb * 7, 'sine', .11, .08); if (in8 === 4 && this.intensity) this.osc(out, root - 24, t, spb * 2, 'sine', .07, .02); }
      else { if (in8 === 0 || in8 === 4) this.osc(out, root - 24, t, spb * 3, 'sine', .075, .02); if (in8 === 6) this.osc(out, root - 12 + 7, t, spb * 1.2, 'sine', .03, .02); }
      // percussão
      if (k.perc === 'samba') { this.hit(out, t, .03, in8 % 2 ? .012 : .022, 7000); if (this.intensity && (in8 === 2 || in8 === 5 || in8 === 7)) this.hit(out, t, .06, .03, 2400, 'bandpass'); if (this.intensity && in8 % 4 === 0) this.osc(out, 36, t, .12, 'sine', .09, .004); }
      else if (k.perc === 'ondas') { if (in8 === 0) this.hit(out, t, spb * 5, .02, 900, 'lowpass'); if (this.intensity && in8 % 2 === 0) this.hit(out, t, .04, .014, 6000); if (this.intensity && in8 === 4) this.osc(out, 38, t, .14, 'sine', .07, .004); }
      else if (k.perc === 'sinos') { if (in8 === 0 || (this.intensity && in8 === 5)) { const g = this.osc(out, root + 24 + (in8 ? 7 : 0), t, 1.6, 'sine', .022, .004); g.connect(this.delay); } if (this.intensity && in8 % 4 === 2) this.hit(out, t, .05, .012, 8000); }
      else { if (this.intensity && in8 % 2 === 0) this.osc(out, 31, t, .2, 'sine', .08, .004); if (in8 === 3) this.hit(out, t, .5, .012, 300, 'lowpass'); }
      // melodia improvisada dentro da escala
      const p = k.density * (in8 % 2 === 0 ? 1 : .45) * (this.intensity === 2 ? 1.3 : 1);
      if (Math.random() < p) { this.mi = Math.max(0, Math.min(k.scale.length * 2 - 1, this.mi + Math.floor(Math.random() * 5) - 2)); const deg = k.scale[this.mi % k.scale.length] + 12 * Math.floor(this.mi / k.scale.length);
        const g = this.osc(out, k.root + 12 + deg, t, spb * (k.perc === 'sinos' ? 3.5 : 2), k.lead, k.lead === 'sawtooth' ? .014 : .034, .012); g.connect(this.delay); }
      this.next += spb; this.step++;
    }
  }

  /** Bipe simples (compatível com as chamadas antigas do jogo). */
  beep(f: number, d = .09, type: Wave = 'sine', v = .07, slide = 0) {
    if (this.mute || !this.sfxOn) return; const a = this.ensure(); if (!a) return;
    try { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(this.fx); o.start(t); o.stop(t + d + .02); } catch { /* */ }
  }
  noise(d = .3, v = .09, fq = 1400) { if (this.mute || !this.sfxOn) return; const a = this.ensure(); if (!a) return; try { this.hit(this.fx, a.currentTime, d, v, fq, 'lowpass'); } catch { /* */ } }
  jingle(arr: number[], gap = 80) { if (this.mute || !this.sfxOn) return; const a = this.ensure(); if (!a) return; const t0 = a.currentTime;
    try { arr.forEach((f, i) => { const m = 69 + 12 * Math.log2(f / 440), t = t0 + i * gap / 1000; this.osc(this.fx, m, t, .22, 'triangle', .07, .005); this.osc(this.fx, m + 12, t, .12, 'sine', .025, .005); }); } catch { /* */ } }
  /** Efeitos nomeados, com camadas. */
  play(name: string, n = 0) {
    if (this.mute || !this.sfxOn) return; const a = this.ensure(); if (!a) return; const t = a.currentTime, fx = this.fx;
    try {
      switch (name) {
        case 'catch': { const m = 72 + Math.min(n, 12) * 2; this.osc(fx, m, t, .1, 'triangle', .09, .003); this.osc(fx, m + 7, t + .04, .12, 'sine', .06, .003); this.hit(fx, t, .03, .05, 3000); break; }
        case 'gold': [84, 88, 91, 96].forEach((m, i) => { this.osc(fx, m, t + i * .055, .3, 'triangle', .07, .004); this.osc(fx, m + 12, t + i * .055, .2, 'sine', .03, .004); }); break;
        case 'junk': this.beep(520, .28, 'triangle', .08, -380); this.hit(fx, t + .05, .1, .04, 500, 'lowpass'); break;
        case 'splash': this.hit(fx, t, .32, .11, 1500, 'lowpass'); this.hit(fx, t + .02, .12, .05, 5000); this.beep(300, .2, 'sine', .05, -200); break;
        case 'cast': this.beep(620, .18, 'triangle', .07, -330); break;
        case 'reel': this.beep(380, .16, 'triangle', .07, 320); for (let i = 0; i < 5; i++) this.hit(fx, t + i * .03, .015, .03, 4000); break;
        case 'shock': this.beep(1100, .28, 'sawtooth', .07, -900); this.beep(140, .3, 'square', .05, -60); for (let i = 0; i < 6; i++) this.hit(fx, t + i * .035, .02, .06, 2500 + i * 600); break;
        case 'shield': this.osc(fx, 88, t, .25, 'sine', .08, .004); this.osc(fx, 95, t + .05, .3, 'sine', .06, .004); break;
        case 'steal': this.beep(240, .22, 'square', .06, -130); this.hit(fx, t, .08, .06, 900, 'bandpass'); break;
        case 'snap': this.beep(170, .45, 'sawtooth', .1, -120); this.hit(fx, t, .25, .1, 700, 'lowpass'); break;
        case 'near': this.beep(1200, .07, 'triangle', .04, 300); break;
        case 'coin': this.osc(fx, 96 + (n % 5), t, .06, 'square', .022, .002); this.osc(fx, 103 + (n % 5), t + .025, .08, 'square', .018, .002); break;
        case 'count': this.osc(fx, 79 + Math.min(24, n), t, .05, 'triangle', .035, .002); break;
        case 'ui': this.osc(fx, 81, t, .05, 'triangle', .04, .002); break;
        case 'buy': this.jingle([740, 988], 70); this.hit(fx, t, .04, .03, 5000); break;
        case 'boss': this.osc(fx, 33, t, .7, 'sawtooth', .1, .01); this.osc(fx, 40, t, .7, 'sawtooth', .07, .01); this.hit(fx, t, .5, .1, 200, 'lowpass'); break;
        case 'tap': this.osc(fx, 60 + Math.round(n * 24), t, .05, 'square', .035, .002); break;
        case 'miss': this.beep(200, .15, 'square', .05, -80); break;
        case 'win': [72, 76, 79, 84, 88, 91].forEach((m, i) => { this.osc(fx, m, t + i * .075, .4, 'triangle', .075, .005); this.osc(fx, m - 12, t + i * .075, .4, 'sine', .04, .005); }); break;
        case 'lose': [67, 63, 60, 55].forEach((m, i) => this.osc(fx, m, t + i * .11, .3, 'sawtooth', .04, .01)); break;
        case 'record': [72, 79, 84, 88, 96].forEach((m, i) => this.osc(fx, m, t + i * .08, .45, 'triangle', .07, .005)); break;
        case 'unlock': [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.osc(fx, m, t + i * .06, .5, 'triangle', .06, .005)); this.hit(fx, t + .4, .6, .04, 6000); break;
      }
    } catch { /* */ }
  }
  buzz(ms: number | number[]) { if (!this.vibOn) return; try { navigator.vibrate && navigator.vibrate(ms); } catch { /* */ } }
}
export const AUDIO = new GameAudio();
