/**
 * 디버그 시각화 관련 설정
 */

export const DEBUG_CONFIG = {
  /**
   * 궤적 예측 라인 설정
   */
  trajectory: {
    /** 궤적 샘플링 간격 (초) */
    sampleStep: 0.05,
    /** 궤적 샘플링 포인트 개수 */
    sampleCount: 60,
    /** 라인 두께 */
    lineWidth: 0.045,
    /** 투명도 */
    opacity: 0.95,
  },

  /**
   * 스와이프 디버그 라인 설정
   */
  swipeDebug: {
    /** 라인 두께 */
    lineWidth: 0.06,
    /** 투명도 */
    opacity: 0.7,
  },

  /**
   * 타겟 마커 설정
   */
  targetMarker: {
    /** 구 반경 */
    radius: 0.11,
    /** 세그먼트 수 */
    segments: 16,
    /** 투명도 */
    opacity: 0.5,
  },

  /**
   * 공 콜라이더 시각화 설정
   */
  ballCollider: {
    /** 투명도 */
    opacity: 0.45,
  },

  /**
   * 골대 콜라이더 시각화 설정
   */
  goalCollider: {
    /** 투명도 */
    opacity: 0.55,
  },

  /**
   * 센서 페이스 시각화 설정
   */
  sensorFace: {
    /** 투명도 */
    opacity: 0.2,
  },

  /**
   * 골망 콜라이더 시각화 설정
   */
  netCollider: {
    /** 투명도 */
    opacity: 0.28,
  },

  /**
   * 광고판 콜라이더 시각화 설정
   */
  adBoardCollider: {
    /** 투명도 */
    opacity: 0.12,
  },

  /**
   * 축 화살표 설정
   */
  axisArrows: {
    /** 화살표 길이 */
    length: 0.7,
    /** 화살표 머리 길이 */
    headLength: 0.2,
    /** 화살표 머리 너비 */
    headWidth: 0.1,
  },

  /**
   * 스와이프 포인트 마커 설정
   */
  swipePointMarker: {
    /** 스프라이트 스케일 */
    scale: 0.15,
    /** 렌더 순서 */
    renderOrder: 1000,
    /** 라벨 색상 */
    labelColor: '#000000',
    /** 라벨 폰트 크기 */
    labelFontSize: '18px',
  },

  /**
   * 렌더 순서 설정
   */
  renderOrder: {
    /** 스와이프 디버그 라인 렌더 순서 */
    swipeDebugLine: 999,
  },
} as const;
