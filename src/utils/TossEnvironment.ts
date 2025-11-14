/**
 * 토스 앱 환경 감지 및 유틸리티
 */

/**
 * 현재 토스 앱 환경인지 확인
 */
export function isTossApp(): boolean {
  if (typeof navigator === 'undefined') return false;

  // UserAgent에서 토스 앱 확인
  return /TossApp/i.test(navigator.userAgent);
}

/**
 * 토스 게임센터 기능 사용 가능 여부 확인
 */
export function isTossGameCenterAvailable(): boolean {
  return isTossApp();
}

/**
 * 토스 광고 기능 사용 가능 여부 확인
 */
export function isTossAdAvailable(): boolean {
  return isTossApp();
}

/**
 * 환경 정보 로깅 (디버그용)
 */
export function logEnvironmentInfo(): void {
  console.log('🔍 Environment Info:');
  console.log('  - Is Toss App:', isTossApp());
  console.log('  - User Agent:', navigator.userAgent);
  console.log('  - Game Center Available:', isTossGameCenterAvailable());
  console.log('  - Ad Available:', isTossAdAvailable());
}
