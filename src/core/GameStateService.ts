/**
 * GameStateService - 게임 영구 상태 관리 (localStorage)
 *
 * localStorage 접근을 중앙화하고 타입 안전성을 보장합니다.
 * 모든 게임 설정과 사용자 데이터를 관리합니다.
 */

/**
 * localStorage 키 상수
 */
const STORAGE_KEYS = {
  // 오디오 설정
  MUSIC_ENABLED: 'snapshoot.audio.musicEnabled',
  SFX_ENABLED: 'snapshoot.audio.sfxEnabled',
  MASTER_VOLUME: 'snapshoot.audio.masterVolume',

  // 게임 데이터
  BEST_SCORE: 'snapshoot.bestScore',

  // 테마 설정
  BALL_THEME: 'snapshoot.theme.ball',
} as const;

/**
 * 오디오 설정 인터페이스
 */
export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  masterVolume: number;
}

/**
 * 게임 상태 서비스 (싱글톤)
 */
export class GameStateService {
  private static instance: GameStateService | null = null;

  private constructor() {
    // private constructor for singleton
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): GameStateService {
    if (!GameStateService.instance) {
      GameStateService.instance = new GameStateService();
    }
    return GameStateService.instance;
  }

  /**
   * 안전한 localStorage 읽기
   */
  private getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to read localStorage key: ${key}`, error);
      return null;
    }
  }

  /**
   * 안전한 localStorage 쓰기
   */
  private setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to write localStorage key: ${key}`, error);
    }
  }

  // ==================== 오디오 설정 ====================

  /**
   * 배경음악 활성화 상태 가져오기
   */
  getMusicEnabled(): boolean {
    const value = this.getItem(STORAGE_KEYS.MUSIC_ENABLED);
    return value === null ? true : value === 'true';
  }

  /**
   * 배경음악 활성화 상태 설정
   */
  setMusicEnabled(enabled: boolean): void {
    this.setItem(STORAGE_KEYS.MUSIC_ENABLED, String(enabled));
  }

  /**
   * 효과음 활성화 상태 가져오기
   */
  getSfxEnabled(): boolean {
    const value = this.getItem(STORAGE_KEYS.SFX_ENABLED);
    return value === null ? true : value === 'true';
  }

  /**
   * 효과음 활성화 상태 설정
   */
  setSfxEnabled(enabled: boolean): void {
    this.setItem(STORAGE_KEYS.SFX_ENABLED, String(enabled));
  }

  /**
   * 마스터 볼륨 가져오기 (0.0 ~ 1.0)
   */
  getMasterVolume(): number {
    const value = this.getItem(STORAGE_KEYS.MASTER_VOLUME);
    if (value === null) return 0.5; // 기본값 50%

    const volume = Number(value);
    return isNaN(volume) ? 0.5 : Math.max(0, Math.min(1, volume));
  }

  /**
   * 마스터 볼륨 설정 (0.0 ~ 1.0)
   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.setItem(STORAGE_KEYS.MASTER_VOLUME, String(clampedVolume));
  }

  /**
   * 모든 오디오 설정 한 번에 가져오기
   */
  getAudioSettings(): AudioSettings {
    return {
      musicEnabled: this.getMusicEnabled(),
      sfxEnabled: this.getSfxEnabled(),
      masterVolume: this.getMasterVolume(),
    };
  }

  /**
   * 모든 오디오 설정 한 번에 저장
   */
  setAudioSettings(settings: AudioSettings): void {
    this.setMusicEnabled(settings.musicEnabled);
    this.setSfxEnabled(settings.sfxEnabled);
    this.setMasterVolume(settings.masterVolume);
  }

  // ==================== 게임 데이터 ====================

  /**
   * 베스트 스코어 가져오기
   */
  getBestScore(): number {
    const value = this.getItem(STORAGE_KEYS.BEST_SCORE);
    if (value === null) return 0;

    const score = Number(value);
    return isNaN(score) ? 0 : Math.max(0, score);
  }

  /**
   * 베스트 스코어 저장 (현재 스코어보다 높을 경우만)
   */
  updateBestScore(score: number): boolean {
    const currentBest = this.getBestScore();
    if (score > currentBest) {
      this.setItem(STORAGE_KEYS.BEST_SCORE, String(score));
      return true; // 갱신됨
    }
    return false; // 갱신되지 않음
  }

  /**
   * 베스트 스코어 강제 설정
   */
  setBestScore(score: number): void {
    this.setItem(STORAGE_KEYS.BEST_SCORE, String(Math.max(0, score)));
  }

  // ==================== 테마 설정 ====================

  /**
   * 볼 테마 가져오기
   */
  getBallTheme(): string | null {
    return this.getItem(STORAGE_KEYS.BALL_THEME);
  }

  /**
   * 볼 테마 설정
   */
  setBallTheme(themeName: string): void {
    this.setItem(STORAGE_KEYS.BALL_THEME, themeName);
  }

  // ==================== 유틸리티 ====================

  /**
   * 모든 설정 초기화
   */
  clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear localStorage', error);
    }
  }

  /**
   * 디버그용: 모든 설정 출력
   */
  debugPrint(): void {
    console.group('GameStateService - Current State');
    console.log('Audio Settings:', this.getAudioSettings());
    console.log('Best Score:', this.getBestScore());
    console.log('Ball Theme:', this.getBallTheme());
    console.groupEnd();
  }
}

/**
 * 편의를 위한 싱글톤 인스턴스 export
 */
export const gameStateService = GameStateService.getInstance();
