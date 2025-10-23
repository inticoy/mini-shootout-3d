import kickUrl from '../assets/audio/kick.mp3?url';
import bounceUrl from '../assets/audio/bounce.mp3?url';
import goalUrl from '../assets/audio/goal.mp3?url';
import saveUrl from '../assets/audio/save.mp3?url';
import postUrl from '../assets/audio/post.mp3?url';
import resetUrl from '../assets/audio/reset.mp3?url';
import netUrl from '../assets/audio/net.mp3?url';
import chantUrl from '../assets/audio/chant.wav?url';
import bg1Url from '../assets/audio/bg1.mp3?url';
import bg2Url from '../assets/audio/bg2.mp3?url';
import bg3Url from '../assets/audio/bg3.mp3?url';

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

  // 배경음악 관련 (chant.wav)
  private backgroundBuffer: AudioBuffer | null = null;
  private backgroundSource: AudioBufferSourceNode | null = null;
  private backgroundGain: GainNode | null = null;

  // BG 음악 관련 (bg1.mp3 ~ bg3.mp3)
  private bgBuffers: AudioBuffer[] = [];
  private bgVolumes: number[] = [0.3, 0.1, 0.5]; // 각 음악별 볼륨 (bg1, bg2, bg3 순서)
  private bgSource: AudioBufferSourceNode | null = null;
  private bgGain: GainNode | null = null;
  private currentBgIndex = 0;

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
      // BG 음악 로드
      await this.loadBackgroundMusics();
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

  private async loadBackgroundMusics(): Promise<void> {
    const bgUrls = [bg1Url, bg2Url, bg3Url];
    try {
      const buffers = await Promise.all(
        bgUrls.map(async (url) => {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          return await this.getContext().decodeAudioData(arrayBuffer.slice(0));
        })
      );
      this.bgBuffers = buffers;
      console.log('BG musics loaded successfully');
    } catch (error) {
      console.warn('Failed to load BG musics', error);
    }
  }

  playBackgroundMusic(volume: number = 0.3, fadeIn: boolean = true): void {
    console.log('🎵 [CHANT] Starting chant music, volume:', volume, 'fadeIn:', fadeIn);
    if (!this.backgroundBuffer) return;

    this.pauseBackgroundMusic(); // 기존 재생 중지

    const context = this.getContext();
    console.log('🎵 [CHANT] AudioContext state:', context.state);
    
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

  playBGMusic(volume?: number): void {
    if (this.bgBuffers.length === 0) return;

    console.log('🎵 [BG] Starting BG music, volume:', volume ?? this.bgVolumes[0]);
    // 랜덤 시작 인덱스
    this.currentBgIndex = Math.floor(Math.random() * this.bgBuffers.length);

    this.playNextBGMusic(volume);
  }

  private playNextBGMusic(volume?: number): void {
    if (this.bgBuffers.length === 0) return;

    // 기존 재생 중지
    this.pauseBGMusic();

    const context = this.getContext();
    if (context.state === 'suspended') {
      void context.resume().then(() => {
        this.startBGMusic(context, volume);
      }).catch((error) => {
        console.warn('Failed to resume AudioContext for BG music', error);
      });
    } else {
      this.startBGMusic(context, volume);
    }
  }

  private startBGMusic(context: AudioContext, volume?: number): void {
    console.log('🎵 [BG] AudioContext state:', context.state);
    this.bgSource = context.createBufferSource();
    this.bgGain = context.createGain();

    this.bgSource.buffer = this.bgBuffers[this.currentBgIndex];
    // 개별 볼륨 사용, 기본값은 bgVolumes[currentBgIndex]
    const currentVolume = volume ?? this.bgVolumes[this.currentBgIndex];
    this.bgGain.gain.value = currentVolume;
    console.log('🎵 [BG] Setting volume to:', currentVolume);

    this.bgSource.connect(this.bgGain);
    this.bgGain.connect(context.destination);

    // 다음 곡으로 이동 (순차 반복)
    this.bgSource.onended = () => {
      this.currentBgIndex = (this.currentBgIndex + 1) % this.bgBuffers.length;
      this.playNextBGMusic(volume);
    };

    try {
      this.bgSource.start();
      console.log('🎵 [BG] BG music started successfully');
    } catch (error) {
      console.warn('Failed to play BG music', error);
    }
  }

  pauseBGMusic(): void {
    if (this.bgSource) {
      try {
        this.bgSource.stop();
      } catch (error) {
        // 이미 중지된 경우 무시
      }
      this.bgSource = null;
    }
  }

  setBGMusicVolume(index: number, volume: number): void {
    if (index >= 0 && index < this.bgVolumes.length) {
      this.bgVolumes[index] = Math.max(0, Math.min(1, volume));
      // 현재 재생 중인 음악이면 즉시 적용
      if (this.bgGain && this.currentBgIndex === index) {
        this.bgGain.gain.value = this.bgVolumes[index];
      }
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
