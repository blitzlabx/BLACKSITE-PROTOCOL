class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterVolume = 0.85;
    this.sfxVolume = 0.9;
    this.noiseBuffer = null;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.noiseBuffer = this._createNoiseBuffer(1.0);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  applySettings(settings) {
    if (!settings) return;
    this.muted = Boolean(settings.muted);
    this.masterVolume = Number.isFinite(settings.masterVolume) ? settings.masterVolume : 0.85;
    this.sfxVolume = Number.isFinite(settings.sfxVolume) ? settings.sfxVolume : 0.9;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setMuted(val) {
    this.muted = Boolean(val);
  }

  _gainScale() {
    return Math.max(0, Math.min(1.2, this.masterVolume * this.sfxVolume));
  }

  _createNoiseBuffer(seconds) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _ready() {
    return !this.muted && this._gainScale() > 0.005 && this.ctx && this.ctx.state === 'running';
  }

  playShot(weaponId, distance = 0) {
    if (!this._ready()) return;
    const atten = Math.max(0.06, 1 / (1 + distance * 0.08));
    const now = this.ctx.currentTime;
    const pitchJitter = 0.94 + Math.random() * 0.12;

    const profiles = {
      kestrel: { freq: 340, drop: 90, dur: 0.11, filter: 2200, gain: 0.26 },
      vektor9: { freq: 420, drop: 130, dur: 0.08, filter: 2900, gain: 0.2 },
      hawk12: { freq: 155, drop: 42, dur: 0.24, filter: 1350, gain: 0.38 },
      arx17: { freq: 270, drop: 75, dur: 0.14, filter: 2400, gain: 0.28 },
      m4k: { freq: 310, drop: 82, dur: 0.17, filter: 3100, gain: 0.31 },
      longshot: { freq: 190, drop: 48, dur: 0.32, filter: 2800, gain: 0.42 },
    };

    const p = profiles[weaponId] || profiles.arx17;
    const vol = p.gain * atten * this._gainScale();

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = weaponId === 'hawk12' || weaponId === 'longshot' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(p.freq * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(p.drop, now + p.dur * 0.85);
    oscGain.gain.setValueAtTime(vol * 0.85, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + p.dur);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + p.dur);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(p.filter * pitchJitter, now);
      filter.Q.value = 0.85;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(vol, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + p.dur);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + p.dur);
    }
  }

  playDryClick() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.03);
    gain.gain.setValueAtTime(0.07 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playHitmarker(isHeadshot = false) {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isHeadshot ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isHeadshot ? 1560 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 2240 : 520, now + 0.065);
    gain.gain.setValueAtTime((isHeadshot ? 0.19 : 0.13) * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playKillConfirm() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.setValueAtTime(940, now + 0.045);
    gain.gain.setValueAtTime(0.14 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playPlayerHurt() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.14);
    gain.gain.setValueAtTime(0.22 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playReload(stage = 'out') {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    if (stage === 'in') {
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(760, now + 0.05);
    } else {
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
    }
    gain.gain.setValueAtTime(0.095 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playSwap() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(510, now + 0.05);
    gain.gain.setValueAtTime(0.07 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playFootstep() {
    if (!this._ready() || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300 + Math.random() * 90;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.045 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
    src.stop(now + 0.07);
  }

  playPlantTick(progress = 0) {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(720 + progress * 640, now);
    gain.gain.setValueAtTime(0.065 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playSpikeBeep(urgency = 0) {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 + urgency * 460, now);
    gain.gain.setValueAtTime(0.095 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playBuyClick() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.setValueAtTime(1040, now + 0.035);
    gain.gain.setValueAtTime(0.085 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  playUiTick() {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    gain.gain.setValueAtTime(0.04 * this._gainScale(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playRoundHorn(won) {
    if (!this._ready()) return;
    const now = this.ctx.currentTime;
    const freqs = won ? [330, 440, 660] : [260, 210, 155];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.09);
      gain.gain.setValueAtTime(0.11 * this._gainScale(), now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.3);
    });
  }
}

export const audio = new SoundEngine();
