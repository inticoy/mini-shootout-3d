/**
 * 게임 내 색상 관련 설정
 *
 * 모든 색상은 Three.js에서 사용하는 hexadecimal 형식입니다.
 */

export const COLORS = {
  /**
   * 디버그 시각화 색상
   */
  debug: {
    /** 궤적 예측 라인 색상 (청록색) */
    trajectory: 0x00aaff,
    /** 스와이프 디버그 라인 색상 (노란색) */
    swipeDebug: 0xffff00,
    /** 타겟 마커 색상 (빨간색) */
    targetMarker: 0xff0000,
  },

  /**
   * 콜라이더 시각화 색상
   */
  collider: {
    /** 공 콜라이더 색상 (밝은 시안) */
    ball: 0x00ffc6,
    /** 공 콜라이더 외곽선 색상 */
    ballEdge: 0x00ffc6,

    /** 골대 콜라이더 색상 (주황색) */
    goal: 0xff4400,
    /** 골대 콜라이더 외곽선 색상 */
    goalEdge: 0xff5500,

    /** 센서 페이스 색상 (밝은 시안) */
    sensorFace: 0x00e0ff,
    /** 센서 외곽선 색상 */
    sensorEdge: 0x00e0ff,

    /** 골망 콜라이더 색상 (파란색) */
    net: 0x0096ff,
    /** 골망 외곽선 색상 */
    netEdge: 0x33bbff,

    /** 광고판 콜라이더 색상 (주황색) */
    adBoard: 0xffaa33,
    /** 광고판 외곽선 색상 */
    adBoardEdge: 0xffaa33,
  },

  /**
   * 축 화살표 색상 (디버그용)
   */
  axisArrows: {
    /** X축 화살표 색상 (빨간색) */
    x: 0xff5555,
    /** Y축 화살표 색상 (초록색) */
    y: 0x55ff55,
    /** Z축 화살표 색상 (파란색) */
    z: 0x5599ff,
  },
} as const;
