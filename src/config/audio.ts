import kickUrl from '../assets/audio/kick.mp3?url';
import bounceUrl from '../assets/audio/bounce.mp3?url';
import goalUrl from '../assets/audio/goal.mp3?url';
import saveUrl from '../assets/audio/save.mp3?url';
import postUrl from '../assets/audio/post.mp3?url';
import resetUrl from '../assets/audio/reset.mp3?url';
import netUrl from '../assets/audio/net.mp3?url';
import chantUrl from '../assets/audio/chant.wav?url';
import bg1Url from '../assets/audio/bg1.mp3?url';

/**
 * 효과음 키 타입
 */
export type SoundKey = 'kick' | 'bounce' | 'goal' | 'save' | 'post' | 'reset' | 'net';

/**
 * 음악 트랙 타입
 */
export type MusicTrack = 'chant' | 'gameplay';

/**
 * 효과음 설정 인터페이스
 */
export interface SoundConfig {
  url: string;
  volume: number;
}

/**
 * 음악 설정 인터페이스
 */
export interface MusicConfig {
  urls: string[];
  volume: number;
  loop: boolean;
  shuffle?: boolean;
}

/**
 * 오디오 설정
 *
 * - sounds: 짧은 효과음 (이벤트 기반)
 * - music: 긴 배경음악 (루프 재생)
 */
export const AUDIO_CONFIG = {
  /**
   * 효과음 설정
   */
  sounds: {
    kick: { url: kickUrl, volume: 1.0 },
    bounce: { url: bounceUrl, volume: 0.3 },
    goal: { url: goalUrl, volume: 0.2 },
    save: { url: saveUrl, volume: 0.3 },
    post: { url: postUrl, volume: 0.3 },
    reset: { url: resetUrl, volume: 0.3 },
    net: { url: netUrl, volume: 0.3 }
  } as const satisfies Record<SoundKey, SoundConfig>,

  /**
   * 음악 설정
   */
  music: {
    /**
     * 관중 함성 (로딩 화면 스와이프 후 재생)
     */
    chant: {
      urls: [chantUrl],
      volume: 0.1,
      loop: true
    },
    /**
     * 게임플레이 배경음악 (n곡 순환 재생)
     */
    gameplay: {
      urls: [bg1Url], // 추후 곡 추가 가능
      volume: 0.05,
      loop: true,
      shuffle: true
    }
  } as const satisfies Record<MusicTrack, MusicConfig>
} as const;
