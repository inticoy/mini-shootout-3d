import kickUrl from '../assets/audio/kick.mp3?url';
import bounceUrl from '../assets/audio/bounce.mp3?url';
import goalUrl from '../assets/audio/goal.mp3?url';
import saveUrl from '../assets/audio/save.mp3?url';
import postUrl from '../assets/audio/post.mp3?url';
import resetUrl from '../assets/audio/reset.mp3?url';
import netUrl from '../assets/audio/net.mp3?url';
import chantUrl from '../assets/audio/chant.wav?url';

const SOUND_DEFINITIONS = [
  { key: 'kick', url: kickUrl },
  { key: 'bounce', url: bounceUrl },
  { key: 'goal', url: goalUrl },
  { key: 'save', url: saveUrl },
  { key: 'post', url: postUrl },
  { key: 'reset', url: resetUrl },
  { key: 'net', url: netUrl }
] as const;

export type SoundKey = (typeof SOUND_DEFINITIONS)[number]['key'];

export class AudioManager {
  private context: AudioContext | null = null;
  private readonly buffers = new Map<SoundKey, AudioBuffer>();
  private loadingPromise: Promise<void> | null = null;

  // 배경음악 관련
  private backgroundBuffer: AudioBuffer | null = null;
  private backgroundSource: AudioBufferSourceNode | null = null;
  private backgroundGain: GainNode | null = null;

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

      // 배경음악 로드
      await this.loadBackgroundMusic(chantUrl);
    })();
    return this.loadingPromise;
  }

  private async loadBackgroundMusic(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.backgroundBuffer = await this.getContext().decodeAudioData(arrayBuffer.slice(0));
      console.log('Background music loaded successfully');
    } catch (error) {
      console.warn('Failed to load background music', error);
    }
  }

  playBackgroundMusic(volume: number = 0.3, fadeIn: boolean = true): void {
    console.log('Attempting to play background music, buffer exists:', !!this.backgroundBuffer);
    if (!this.backgroundBuffer) return;

    this.pauseBackgroundMusic(); // 기존 재생 중지

    const context = this.getContext();
    console.log('AudioContext state:', context.state);
    
    // AudioContext가 suspended이면 resume 시도
    if (context.state === 'suspended') {
      console.log('Resuming AudioContext...');
      void context.resume().then(() => {
        console.log('AudioContext resumed, starting music');
        this.startBackgroundMusic(context, volume, fadeIn);
      }).catch((error) => {
        console.warn('Failed to resume AudioContext for background music', error);
      });
    } else {
      console.log('AudioContext is running, starting music');
      this.startBackgroundMusic(context, volume, fadeIn);
    }
  }

  private startBackgroundMusic(context: AudioContext, volume: number, fadeIn: boolean = false): void {
    this.backgroundSource = context.createBufferSource();
    this.backgroundGain = context.createGain();

    this.backgroundSource.buffer = this.backgroundBuffer!;
    this.backgroundSource.loop = true;

    if (fadeIn) {
      // 페이드인: 0에서 volume까지 1.5초
      this.backgroundGain.gain.setValueAtTime(0, context.currentTime);
      this.backgroundGain.gain.linearRampToValueAtTime(volume, context.currentTime + 1.5);
    } else {
      this.backgroundGain.gain.value = volume;
    }

    this.backgroundSource.connect(this.backgroundGain);
    this.backgroundGain.connect(context.destination);

    try {
      this.backgroundSource.start();
    } catch (error) {
      console.warn('Failed to play background music', error);
    }
  }

  pauseBackgroundMusic(): void {
    if (this.backgroundSource) {
      try {
        this.backgroundSource.stop();
      } catch (error) {
        // 이미 중지된 경우 무시
      }
      this.backgroundSource = null;
    }
  }

  setBackgroundVolume(volume: number): void {
    if (this.backgroundGain) {
      this.backgroundGain.gain.value = Math.max(0, Math.min(1, volume));
    }
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
