/**
 * 슈팅 관련 설정값 모음
 *  - 커브 슛 보정량
 *  - 탄도 계산에 사용할 시간 범위
 *  - 스와이프로 지정 가능한 목표 영역
 * 값을 한 곳에서 관리해 쉽게 튜닝할 수 있도록 분리했다.
 */

export interface CurveAimConfig {
  horizontalMax: number;
  horizontalMargin: number;
}

export const CURVE_AIM_CONFIG: CurveAimConfig = {
  horizontalMax: 0.9,    // m, 커브 강도/파워 최대 시 X축으로 얼마나 벗어나는지
  horizontalMargin: 1.  // m, 커브 보정 시 추가로 허용할 X축 여유
};

export interface ShotTimingConfig {
  minTime: number;
  maxTime: number;
}

export interface ShotTimingConfigMap {
  NORMAL: ShotTimingConfig;
  CURVE: ShotTimingConfig;
}

export const SHOT_TIMING_CONFIG: ShotTimingConfigMap = {
  NORMAL: {
    minTime: 0.3,
    maxTime: 0.6
  },
  CURVE: {
    minTime: 0.35,
    maxTime: 0.7
  }
};

export interface ShotTargetConfig {
  horizontalMargin: number;     // 골대 좌우 바깥으로 허용할 여유
  verticalMarginTop: number;    // 골대 윗부분 여유
  verticalMarginBottom: number; // 골대 아래(지면 아래) 여유
  depth: number | null;         // 목표 Z 위치 (null이면 GOAL_DEPTH 사용)
}

export const SHOT_TARGET_CONFIG: ShotTargetConfig = {
  horizontalMargin: -0.2, // -: 골대 안쪽으로 제한
  verticalMarginTop: -0.2, // +: 골대 위쪽으로 확장
  verticalMarginBottom: 1,
  depth: null
};

export interface CurveForceConfig {
  baseStrength: number;      // 기본 힘 크기 (curveAmount와 곱해짐)
  speedReference: number;    // 속도에 따른 보정 분모 (speed / speedReference)
  speedMaxFactor: number;    // 속도 보정 최대 배율
  duration: number;          // 힘을 적용하는 최대 지속 시간 (초)
}

export const CURVE_FORCE_CONFIG: CurveForceConfig = {
  baseStrength: 18.0,
  speedReference: 15,
  speedMaxFactor: 2.0,
  duration: 0.7
};
