// Procedural Web Audio API sound effects & ambient noise generator

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlayingAmbient = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playXpChime(isBonus: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isBonus ? 587.33 : 523.25, now); // D5 or C5
      osc.frequency.exponentialRampToValueAtTime(isBonus ? 880 : 659.25, now + 0.14);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch {
      // Ignore audio errors
    }
  }

  public playLevelUpFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const now = ctx.currentTime + i * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      });
    } catch {
      // Ignore audio errors
    }
  }

  public toggleAmbientSound(soundName: string, volumePercent: number, shouldPlay: boolean) {
    this.stopAmbient();
    if (!shouldPlay || volumePercent <= 0) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.5;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (soundName.includes('Lluvia')) {
        filter.frequency.value = 850;
      } else if (soundName.includes('Café')) {
        filter.frequency.value = 500;
      } else if (soundName.includes('Lo-Fi')) {
        filter.frequency.value = 380;
      } else {
        filter.frequency.value = 1100;
      }

      const gain = ctx.createGain();
      gain.gain.value = (volumePercent / 100) * 0.06;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(0);
      this.noiseNode = whiteNoise;
      this.gainNode = gain;
      this.isPlayingAmbient = true;
    } catch {
      // Ignore audio errors
    }
  }

  public setAmbientVolume(volumePercent: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime((volumePercent / 100) * 0.06, this.ctx.currentTime);
    }
  }

  public stopAmbient() {
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
        this.noiseNode.disconnect();
      } catch {
        // Ignore
      }
      this.noiseNode = null;
    }
    this.isPlayingAmbient = false;
  }

  public isAmbientActive(): boolean {
    return this.isPlayingAmbient;
  }
}

export const soundEngine = new SoundEngine();
