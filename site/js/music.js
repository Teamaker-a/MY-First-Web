// 原型用的示例背景音乐：WebAudio 合成的音乐盒循环。
// 之后可以替换成用户提供的 MP3 / OGG，保留 start / stop / toggle 接口即可。

export class MusicBox {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.timer = null;
    this.playing = false;
    this.step = 0;
    this.melody = [72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 72, 76, 79, 84];
    this.bass = [48, 53, 55, 48];
  }

  ensure() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return false;
      this.ctx = new AudioCtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0001;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  start() {
    try {
      if (!this.ensure()) return false;
      if (this.playing) return true;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
      this.master.gain.linearRampToValueAtTime(0.1, now + 1.1);
      this.playing = true;
      this.step = 0;
      this.tick();
      this.timer = window.setInterval(() => this.tick(), 420);
      return true;
    } catch (error) {
      this.playing = false;
      return false;
    }
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    window.clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + 0.45);
  }

  toggle() {
    if (this.playing) this.stop();
    else this.start();
    return this.playing;
  }

  tick() {
    if (!this.ctx || !this.playing) return;
    const now = this.ctx.currentTime + 0.02;
    const midi = this.melody[this.step % this.melody.length];
    this.note(midi, now, 0.95, 0.085, 'triangle');
    this.note(midi + 12, now, 0.45, 0.018, 'sine');
    if (this.step % 4 === 0) {
      const bassIndex = Math.floor(this.step / 4) % this.bass.length;
      this.note(this.bass[bassIndex], now, 1.9, 0.05, 'sine');
    }
    this.step += 1;
  }

  note(midi, time, duration, peak, type) {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}
