import kickUrl from '../assets/audio/kick.mp3?url';
import bounceUrl from '../assets/audio/kick.mp3?url';
import goalUrl from '../assets/audio/goal.wav?url';
import saveUrl from '../assets/audio/woosh-effect-12-255591.mp3?url';
import postUrl from '../assets/audio/post.mp3?url';
import resetUrl from '../assets/audio/re-verse-dj-fx-344132.mp3?url';

export type SoundKey = 'kick' | 'bounce' | 'goal' | 'save' | 'post' | 'reset';

const SOUND_MAP: Record<SoundKey, string> = {
  kick: kickUrl,
  bounce: bounceUrl,
  goal: goalUrl,
  save: saveUrl,
  post: postUrl,
  reset: resetUrl
};

export class AudioManager {
  private context: AudioContext | null = null;
  private buffers = new Map<SoundKey, AudioBuffer>();
  private loadingPromise: Promise<void> | null = null;

  async loadAll(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      const entries = await Promise.all(
        (Object.entries(SOUND_MAP) as Array<[SoundKey, string]>).map(async ([key, url]) => {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.getContext().decodeAudioData(arrayBuffer.slice(0));
          return [key, audioBuffer] as const;
        })
      );
      entries.forEach(([key, buffer]) => {
        this.buffers.set(key, buffer);
      });
    })();
    return this.loadingPromise;
  }

  play(key: SoundKey, options: { volume?: number } = {}) {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = options.volume ?? 1;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  }

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => {
        // ignore resume errors; playback will retry on next interaction
      });
    }
    return this.context;
  }
}
