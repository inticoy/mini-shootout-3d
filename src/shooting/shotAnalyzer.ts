import type { NormalizedSwipeData } from './swipeNormalizer';

/**
 * 슈팅 타입
 */
export const ShotType = {
  INVALID: 'INVALID',        // 무효 (잘못된 방향)
  CHIP: 'CHIP',              // 칩샷 (느린 직선)
  NORMAL: 'NORMAL',          // 일반 슛 (중간 속도 직선)
  POWER: 'POWER',            // 강슛 (빠른 직선)
  CURVE: 'CURVE'             // 감아차기 (곡선)
} as const;

export type ShotType = typeof ShotType[keyof typeof ShotType];

/**
 * 슈팅 분석 결과
 */
export interface ShotAnalysis {
  type: ShotType;           // 슈팅 타입
  power: number;            // 슈팅 세기 (0~1)
  curveAmount: number;      // 커브 정도 (0~1, 0=직선)
  curveDirection: number;   // 커브 방향 (-1=왼쪽, 0=없음, 1=오른쪽)
  heightFactor: number;     // 높이 요소 (0~1, 0=땅볼, 1=높음)
}

/**
 * 슈팅 타입 감지 임계값
 */
const THRESHOLDS = {
  // 속도 임계값 (픽셀/초)
  SPEED: {
    CHIP_MAX: 900,             // 이 이하면 칩샷
    NORMAL_MAX: 1400,          // 이 이하면 일반 슛
    // 이 이상이면 강슛
  },

  // 커브 임계값 (직선으로부터의 편차)
  CURVE_DEVIATION: 0.08,       // Y값 평균 편차가 이 이상이면 곡선
};

/**
 * 정규화된 스와이프 데이터로부터 슈팅 타입과 파라미터 분석
 */
export function analyzeShotType(normalized: NormalizedSwipeData): ShotAnalysis {
  const { points, speed, angle, verticalDistance } = normalized;

  // 각도를 degree로 변환
  const angleDeg = angle * 180 / Math.PI;

  // 1. 세기 계산 (0~1, 속도 기반)
  const power = calculatePower(speed);

  // 2. 직선으로부터의 편차 분석 (커브 판단용)
  const curveAnalysis = analyzeCurvePattern(points);

  // 3. 높이 요소 계산 (verticalDistance 반영)
  const heightFactor = calculateHeightFactor(points, verticalDistance);

  // 4. 슈팅 타입 결정 (angle 기반)
  const type = determineShotType(angleDeg, speed, curveAnalysis.avgDeviation);

  return {
    type,
    power,
    curveAmount: curveAnalysis.amount,
    curveDirection: curveAnalysis.direction,
    heightFactor
  };
}

/**
 * 속도를 기반으로 슈팅 세기 계산
 */
function calculatePower(speed: number): number {
  // 속도를 0~1 범위로 매핑
  // 최소 500px/s, 최대 2000px/s로 가정
  const minSpeed = 500;
  const maxSpeed = 2000;
  const normalized = (speed - minSpeed) / (maxSpeed - minSpeed);
  return Math.max(0, Math.min(1, normalized));
}

/**
 * 높이 요소 계산
 * 화면 세로 크기 대비 Y 픽셀 이동 비율 사용
 */
function calculateHeightFactor(
  _points: Array<{ x: number; y: number }>,
  verticalDistance: number
): number {
  // 화면 세로 크기 (window.innerHeight 사용)
  const screenHeight = window.innerHeight;

  // verticalDistance / 화면높이 비율
  // 화면 좌표계: 위로 = 음수, 아래 = 양수
  // 골대 좌표계: 위 = 높은 값이므로 부호 반전
  const heightRatio = -verticalDistance / screenHeight;

  // 0~1 범위로 정규화
  // 기본값 0.3 (약간 낮음)
  const heightFactor = Math.max(0, Math.min(1, heightRatio + 0.3));

  return heightFactor;
}

/**
 * 커브 패턴 분석 (감아차기 판별)
 */
function analyzeCurvePattern(points: Array<{ x: number; y: number }>) {
  // 시작점(0,0)과 끝점(1,0)을 잇는 직선으로부터
  // 중간 포인트들이 얼마나 벗어났는지 계산

  const middlePoints = points.slice(1, 4);

  // 각 중간 포인트의 Y값 절대값 평균 (직선으로부터의 거리)
  const deviations = middlePoints.map(p => Math.abs(p.y));
  const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

  // 커브 방향: 중간 포인트들의 Y값 평균으로 판단
  const avgY = middlePoints.reduce((sum, p) => sum + p.y, 0) / middlePoints.length;

  // 커브 정도 (0~1)
  const curveAmount = Math.min(1, avgDeviation / 0.3); // 0.3 이상이면 최대 커브

  // 커브 방향 (-1, 0, 1)
  let curveDirection = 0;
  if (avgDeviation > THRESHOLDS.CURVE_DEVIATION) {
    curveDirection = avgY > 0 ? 1 : -1; // 양수면 오른쪽(위쪽), 음수면 왼쪽(아래쪽)
  }

  return {
    amount: curveAmount,
    direction: curveDirection,
    avgDeviation
  };
}

/**
 * 최종 슈팅 타입 결정
 * 모든 음수 각도 허용, heightFactor로 상하 결정
 */
function determineShotType(
  angleDeg: number,
  speed: number,
  curveDeviation: number
): ShotType {
  const { SPEED, CURVE_DEVIATION } = THRESHOLDS;

  // 1. 무효 각도 체크 (0° ~ 180°, 양수만 무효)
  if (angleDeg >= 0 && angleDeg <= 180) {
    return ShotType.INVALID;
  }

  // 2. 모든 음수 각도는 유효 (-1° ~ -179°)
  // 커브 체크 (Y값 편차가 큼)
  if (curveDeviation > CURVE_DEVIATION) {
    return ShotType.CURVE;
  }

  // 3. 직선 슛 - 속도로 구분
  if (speed <= SPEED.CHIP_MAX) {
    return ShotType.CHIP;
  } else if (speed <= SPEED.NORMAL_MAX) {
    return ShotType.NORMAL;
  } else {
    return ShotType.POWER;
  }
}

/**
 * 슈팅 분석 결과를 디버그 문자열로 변환
 */
export function debugShotAnalysis(analysis: ShotAnalysis): string {
  const curveDir = analysis.curveDirection === 1 ? 'Right' :
                   analysis.curveDirection === -1 ? 'Left' : 'None';

  return `
Shot Analysis:
  Type: ${analysis.type}
  Power: ${(analysis.power * 100).toFixed(0)}%
  Curve: ${(analysis.curveAmount * 100).toFixed(0)}% (${curveDir})
  Height Factor: ${(analysis.heightFactor * 100).toFixed(0)}%
  `.trim();
}
