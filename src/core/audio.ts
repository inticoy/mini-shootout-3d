import { AUDIO_CONFIG, type SoundKey, type MusicTrack } from '../config/audio';

export class AudioManager {
  private context: AudioContext | null = null;
  private loadingPromise: Promise<void> | null = null;

  // 효과음 버퍼
  private readonly soundBuffers = new Map<SoundKey, AudioBuffer>();

  // 음악 버퍼
  private readonly musicBuffers = new Map<MusicTrack, AudioBuffer[]>();

  // 현재 재생 중인 음악 (멀티 트랙 지원)
  private readonly currentMusic = new Map<MusicTrack, {
    source: AudioBufferSourceNode;
    gain: GainNode;
    currentIndex: number;
  }>();

  async loadAll(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      // 효과음 로드
      const soundEntries = await Promise.all(
        Object.entries(AUDIO_CONFIG.sounds).map(async ([key, config]) => {
          try {
            const response = await fetch(config.url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.getContext().decodeAudioData(arrayBuffer.slice(0));
            return [key as SoundKey, buffer] as const;
          } catch (error) {
            console.warn(`Failed to load sound "${key}"`, error);
            return null;
          }
        })
      );

      soundEntries
        .filter((entry): entry is readonly [SoundKey, AudioBuffer] => entry !== null)
        .forEach(([key, buffer]) => {
          this.soundBuffers.set(key, buffer);
        });

      // 음악 로드 (chant + gameplay)
      await this.loadMusic('chant');
      await this.loadMusic('gameplay');
    })();
    return this.loadingPromise;
  }

  private async loadMusic(track: MusicTrack): Promise<void> {
    const config = AUDIO_CONFIG.music[track];
    try {
      const buffers = await Promise.all(
        config.urls.map(async (url) => {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          return await this.getContext().decodeAudioData(arrayBuffer.slice(0));
        })
      );
      this.musicBuffers.set(track, buffers);
      console.log(`Music track "${track}" loaded successfully`);
    } catch (error) {
      console.warn(`Failed to load music track "${track}"`, error);
    }
  }

  /**
   * AudioContext가 suspended 상태면 resume
   */
  private async ensureContextRunning(): Promise<void> {
    const context = this.getContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  }

  /**
   * 효과음 재생
   */
  playSound(key: SoundKey, volumeOverride?: number): void {
    const buffer = this.soundBuffers.get(key);
    if (!buffer) return;

    const config = AUDIO_CONFIG.sounds[key];
    const volume = volumeOverride ?? config.volume;

    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);

    try {
      source.start();
    } catch (error) {
      console.warn(`Failed to play sound "${key}"`, error);
    }
  }

  /**
   * 배경 음악 재생 (멀티 트랙 지원)
   */
  async playMusic(track: MusicTrack, options?: { fadeIn?: boolean; volumeOverride?: number }): Promise<void> {
    // 동일 트랙이 이미 재생 중이면 중지
    if (this.currentMusic.has(track)) {
      this.stopMusic(track);
    }

    // Context 준비
    await this.ensureContextRunning();

    const config = AUDIO_CONFIG.music[track];
    const buffers = this.musicBuffers.get(track);
    if (!buffers || buffers.length === 0) {
      console.warn(`Music track "${track}" not loaded`);
      return;
    }

    // 버퍼 선택 (shuffle이면 랜덤, 아니면 첫 번째)
    const index = 'shuffle' in config && config.shuffle
      ? Math.floor(Math.random() * buffers.length)
      : 0;

    const buffer = buffers[index];
    const volume = options?.volumeOverride ?? config.volume;

    // Source 생성
    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = config.loop;

    // Fade in 처리
    if (options?.fadeIn) {
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(volume, context.currentTime + 1.5);
    } else {
      gain.gain.value = volume;
    }

    source.connect(gain);
    gain.connect(context.destination);

    // 다음 곡으로 자동 전환 (playlist인 경우)
    if (buffers.length > 1) {
      source.onended = () => {
        const nextIndex = (index + 1) % buffers.length;
        this.playNextTrack(track, nextIndex, volume);
      };
    }

    try {
      source.start();
      console.log(`🎵 Music "${track}" started (index: ${index}, volume: ${volume})`);
    } catch (error) {
      console.warn(`Failed to play music "${track}"`, error);
      return;
    }

    // 상태 저장 (Map에 추가)
    this.currentMusic.set(track, { source, gain, currentIndex: index });
  }

  /**
   * 다음 트랙 재생 (내부 사용)
   */
  private playNextTrack(track: MusicTrack, index: number, volume: number): void {
    const buffers = this.musicBuffers.get(track);
    if (!buffers || buffers.length === 0) return;

    const buffer = buffers[index];
    const config = AUDIO_CONFIG.music[track];

    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = config.loop;
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(context.destination);

    // 다음 곡으로 자동 전환
    source.onended = () => {
      const nextIndex = (index + 1) % buffers.length;
      this.playNextTrack(track, nextIndex, volume);
    };

    source.start();

    // 상태 업데이트 (Map에 저장)
    this.currentMusic.set(track, { source, gain, currentIndex: index });
  }

  /**
   * 특정 트랙 또는 모든 음악 정지
   */
  stopMusic(track?: MusicTrack): void {
    if (track) {
      // 특정 트랙 중지
      const music = this.currentMusic.get(track);
      if (music) {
        try {
          music.source.stop();
        } catch (error) {
          // 이미 중지된 경우 무시
        }
        this.currentMusic.delete(track);
      }
    } else {
      // 모든 음악 중지
      this.stopAllMusic();
    }
  }

  /**
   * 모든 음악 정지
   */
  stopAllMusic(): void {
    this.currentMusic.forEach((music) => {
      try {
        music.source.stop();
      } catch (error) {
        // 이미 중지된 경우 무시
      }
    });
    this.currentMusic.clear();
  }

  /**
   * 특정 트랙 볼륨 설정
   */
  setMusicVolume(track: MusicTrack, volume: number): void {
    const music = this.currentMusic.get(track);
    if (music) {
      music.gain.gain.value = Math.max(0, Math.min(1, volume));
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
