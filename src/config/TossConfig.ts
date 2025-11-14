/**
 * 토스 게임센터 기능 설정
 *
 * 토스 콘솔 설정 전까지는 false로 유지
 */

export const TOSS_CONFIG = {
  // 토스 게임센터 기능 사용 여부
  // 콘솔에서 게임센터 설정 후 true로 변경
  GAME_CENTER_ENABLED: false,

  // 토스 광고 기능 사용 여부
  // 콘솔에서 광고 그룹 ID 발급 후 true로 변경
  ADS_ENABLED: false,
} as const;
