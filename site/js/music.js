// 背景音乐：线上用 WebAudio 合成的音乐盒循环；本地开发时优先播放 assets/audio/paper-hearts.mp3。
// 这首商业歌曲只用于本地试听，不提交仓库、不上传线上；文件缺失时自动回退到合成音乐。

const LOCAL_AUDIO_PATH = new URL('../assets/audio/paper-hearts.mp3', import.meta.url).href;
const LOCAL_AUDIO_VOLUME = 0.45;

function isLocalPreview() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export class MusicBox {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.timer = null;
    this.playing = false;
    this.step = 0;
    this.melody = [72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 72, 76, 79, 84];
    this.bass = [48, 53, 55, 48];
    this.audio = null;
    this.audioFailed = false;
    this.audioFadeTimer = null;
    this.audioStopTimer = null;
  }

  shouldUseLocalAudio() {
    return isLocalPreview() && !this.audioFailed;
  }

  ensureAudio() {
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.id = 'travelThemeAudio';
    audio.src = LOCAL_AUDIO_PATH;
    audio.loop = true;
    audio.preload = 'metadata';
    audio.volume = 0;
    audio.hidden = true;
    audio.setAttribute('aria-hidden', 'true');
    audio.addEventListener('error', () => {
      this.audioFailed = true;
      if (this.playing && this.audio && this.audio.paused) {
        this.playing = false;
        this.startSynth();
      }
    });
    document.body.appendChild(audio);
    this.audio = audio;
    return audio;
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
    if (this.playing) return true;
    if (this.shouldUseLocalAudio()) return this.startAudio();
    return this.startSynth();
  }

  startAudio() {
    try {
      const audio = this.ensureAudio();
      this.cancelAudioStop();
      this.playing = true;
      audio.loop = true;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (!this.playing) return;
          this.playing = false;
          this.startSynth();
        });
      }
      this.fadeAudioTo(LOCAL_AUDIO_VOLUME, 900);
      return true;
    } catch (error) {
      this.audioFailed = true;
      return this.startSynth();
    }
  }

  startSynth() {
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
    if (!this.playing) return;
    this.playing = false;
    if (this.audio && !this.audio.paused) {
      this.fadeAudioTo(0, 380);
      this.cancelAudioStop();
      this.audioStopTimer = window.setTimeout(() => {
        if (!this.playing && this.audio) this.audio.pause();
      }, 420);
      return;
    }
    this.stopSynth();
  }

  stopSynth() {
    if (!this.ctx || !this.timer) return;
    window.clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + 0.45);
  }

  cancelAudioStop() {
    if (this.audioStopTimer) {
      window.clearTimeout(this.audioStopTimer);
      this.audioStopTimer = null;
    }
  }

  fadeAudioTo(target, duration) {
    const audio = this.audio;
    if (!audio) return;
    if (this.audioFadeTimer) {
      window.clearInterval(this.audioFadeTimer);
      this.audioFadeTimer = null;
    }
    const from = audio.volume;
    const started = performance.now();
    if (duration <= 0) {
      audio.volume = Math.min(1, Math.max(0, target));
      return;
    }
    this.audioFadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      audio.volume = Math.min(1, Math.max(0, from + (target - from) * progress));
      if (progress >= 1) {
        window.clearInterval(this.audioFadeTimer);
        this.audioFadeTimer = null;
      }
    }, 30);
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
