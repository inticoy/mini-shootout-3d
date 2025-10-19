import kickUrl from '../assets/audio/kick.mp3?url';
import bounceUrl from '../assets/audio/bounce.mp3?url';
import goalUrl from '../assets/audio/goal.wav?url';
import saveUrl from '../assets/audio/save.mp3?url';
import postUrl from '../assets/audio/post.mp3?url';
import resetUrl from '../assets/audio/reset.mp3?url';

const SOUND_DEFINITIONS = [
  { key: 'kick', url: kickUrl },
  { key: 'bounce', url: bounceUrl },
  { key: 'goal', url: goalUrl },
  { key: 'save', url: saveUrl },
  { key: 'post', url: postUrl },
  { key: 'reset', url: resetUrl }
] as const;

export type SoundKey = (typeof SOUND_DEFINITIONS)[number]['key'];

export class AudioManager {
  private context: AudioContext | null = null;
  private readonly buffers = new Map<SoundKey, AudioBuffer>();
  private loadingPromise: Promise<void> | null = null;

  async loadAll(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      const entries = await Promise.all(
        SOUND_DEFINITIONS.map(async ({ key, url }) => {
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.getContext().decodeAudioData(arrayBuffer.slice(0));
            return [key, buffer] as const;
          } catch (error) {
            console.warn(`Failed to load audio "${key}"`, error);
            return null;
          }
        })
      );

      entries
        .filter((entry): entry is readonly [SoundKey, AudioBuffer] => entry !== null)
        .forEach(([key, buffer]) => {
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

    try {
      source.start();
    } catch (error) {
      console.warn(`Failed to play audio "${key}"`, error);
    }
  }

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === 'suspended') {
      void this.context.resume().catch((error) => {
        console.warn('Failed to resume AudioContext', error);
      });
    }

    return this.context;
  }
}
