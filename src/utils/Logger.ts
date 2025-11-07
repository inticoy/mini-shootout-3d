/**
 * 로그 레벨 (숫자가 클수록 높은 레벨)
 */
export const LogLevel = {
  DEBUG: 0, // 상세한 디버그 정보
  INFO: 1, // 일반 정보
  WARN: 2, // 경고
  ERROR: 3, // 에러
  NONE: 4 // 로그 비활성화
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

/**
 * 전역 Logger 설정 및 기본 로거
 */
class Logger {
  private static level: LogLevel = LogLevel.DEBUG;
  private static enabled = import.meta.env.DEV; // 개발 모드에서만 기본 활성화

  /**
   * 로그 레벨 설정
   */
  static setLevel(level: LogLevel) {
    this.level = level;
  }

  /**
   * 로거 활성화/비활성화
   */
  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * 현재 설정 확인
   */
  static getConfig() {
    return {
      level: this.level,
      enabled: this.enabled,
      isDev: import.meta.env.DEV
    };
  }

  static debug(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.DEBUG) return;
    console.log(`🔍 [${category}] ${message}`, ...args);
  }

  static info(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.INFO) return;
    console.log(`ℹ️  [${category}] ${message}`, ...args);
  }

  static warn(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.WARN) return;
    console.warn(`⚠️  [${category}] ${message}`, ...args);
  }

  static error(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.ERROR) return;
    console.error(`❌ [${category}] ${message}`, ...args);
  }
}

/**
 * 카테고리별 Logger
 *
 * 사용 예시:
 * ```typescript
 * const log = new CategoryLogger('Shooting');
 * log.info('Shot executed', { velocity, angularVelocity });
 * log.debug('Shot parameters', shotParams);
 * ```
 */
export class CategoryLogger {
  private readonly category: string;

  constructor(category: string) {
    this.category = category;
  }

  debug(message: string, ...args: any[]) {
    Logger.debug(this.category, message, ...args);
  }

  info(message: string, ...args: any[]) {
    Logger.info(this.category, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    Logger.warn(this.category, message, ...args);
  }

  error(message: string, ...args: any[]) {
    Logger.error(this.category, message, ...args);
  }
}

export { Logger };
