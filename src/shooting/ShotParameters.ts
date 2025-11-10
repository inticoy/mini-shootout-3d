import * as THREE from 'three';
import type { ShotAnalysis } from './ShotAnalyzer';
import { ShotType } from './ShotAnalyzer';
import type { NormalizedSwipeData } from './SwipeNormalizer';
import { GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH } from '../config/Goal';
import { BALL_START_POSITION as BALL_START_POS } from '../config/Ball';
import { CURVE_AIM_CONFIG, SHOT_TARGET_CONFIG } from '../config/Shooting';

/**
 * 슈팅 파라미터 (3D 공간)
 */
export interface ShotParameters {
  targetPosition: THREE.Vector3;  // 목표 지점 (골대 내 위치)
  direction: THREE.Vector3;       // 슈팅 방향 (정규화된 벡터)
  distance: number;               // 목표까지의 거리
  aimTargetPosition: THREE.Vector3; // 탄도 계산용 보정 목표 지점
  aimDirection: THREE.Vector3;      // 보정 목표까지의 방향
  aimDistance: number;              // 보정 목표까지의 거리
  analysis: ShotAnalysis;         // 슈팅 분석 결과
}

/**
 * 공의 초기 위치 (ball.ts에서 import, THREE.Vector3로 변환)
 */
const BALL_START_POSITION = new THREE.Vector3(
  BALL_START_POS.x,
  BALL_START_POS.y,
  BALL_START_POS.z
);

/**
 * 설정값을 반영한 목표 영역 (스와이프 입력이 노릴 수 있는 범위)
 */
const TARGET_BOUNDS = {
  xMin: -GOAL_WIDTH / 2 - SHOT_TARGET_CONFIG.horizontalMargin,
  xMax: GOAL_WIDTH / 2 + SHOT_TARGET_CONFIG.horizontalMargin,
  yMin: 0 - SHOT_TARGET_CONFIG.verticalMarginBottom,
  yMax: GOAL_HEIGHT + SHOT_TARGET_CONFIG.verticalMarginTop,
  z: SHOT_TARGET_CONFIG.depth ?? GOAL_DEPTH
};

/**
 * 슈팅 분석 결과와 정규화된 데이터로부터 3D 슈팅 파라미터 계산
 */
export function calculateShotParameters(
  normalized: NormalizedSwipeData,
  analysis: ShotAnalysis
): ShotParameters {
  // 1. 스와이프 데이터를 기반으로 골대 내 목표 위치 계산
  const targetPosition = calculateTargetPosition(normalized, analysis);

  // 2. 공 → 목표 방향 벡터 계산
  const direction = new THREE.Vector3()
    .subVectors(targetPosition, BALL_START_POSITION)
    .normalize();

  // 2-1. CURVE 슛이라면 목표를 바깥으로 보정
  const aimTargetPosition = adjustAimTarget(targetPosition, analysis);

  // 2-2. 보정된 목표로부터 방향/거리 계산
  const aimDirection = new THREE.Vector3()
    .subVectors(aimTargetPosition, BALL_START_POSITION)
    .normalize();

  // 3. 거리 계산
  const distance = BALL_START_POSITION.distanceTo(targetPosition);
  const aimDistance = BALL_START_POSITION.distanceTo(aimTargetPosition);

  return {
    targetPosition,
    direction,
    distance,
    aimTargetPosition,
    aimDirection,
    aimDistance,
    analysis
  };
}

/**
 * 스와이프 데이터를 기반으로 골대 내 목표 위치 계산
 *
 * X 위치: horizontalDistance (좌우 스와이프 거리)
 * Y 위치: heightFactor (스와이프 높이)
 */
function calculateTargetPosition(
  normalized: NormalizedSwipeData,
  analysis: ShotAnalysis
): THREE.Vector3 {
  // X 위치 계산: 좌우 이동 거리를 목표 범위(xMin~xMax)에 매핑
  // 화면 너비 대비 비율 추정 (보통 모바일 300~400px, 데스크탑 800~1200px)
  // 안전하게 200px를 골대 전체 너비(3m)에 해당하는 비율로 매핑
  const horizontalRatio = THREE.MathUtils.clamp(normalized.horizontalDistance / 200, -1, 1);
  const normalizedHorizontal = (horizontalRatio + 1) * 0.5; // -1~1 -> 0~1
  const targetX = THREE.MathUtils.lerp(TARGET_BOUNDS.xMin, TARGET_BOUNDS.xMax, normalizedHorizontal);

  // Y 위치 계산: heightFactor(0~1)를 목표 범위(yMin~yMax)에 매핑
  const clampedHeightFactor = THREE.MathUtils.clamp(analysis.heightFactor, 0, 1);
  const targetY = THREE.MathUtils.lerp(TARGET_BOUNDS.yMin, TARGET_BOUNDS.yMax, clampedHeightFactor);

  // Z 위치: SHOT_TARGET_CONFIG.depth(null 시 GOAL_DEPTH 사용)
  const targetZ = TARGET_BOUNDS.z;

  return new THREE.Vector3(targetX, targetY, targetZ);
}

function adjustAimTarget(
  baseTarget: THREE.Vector3,
  analysis: ShotAnalysis
): THREE.Vector3 {
  const adjusted = baseTarget.clone();

  if (analysis.type !== ShotType.CURVE || analysis.curveDirection === 0) {
    return adjusted;
  }

  const curveIntensity = THREE.MathUtils.clamp(analysis.curveAmount, 0, 1);
  const powerFactor = THREE.MathUtils.clamp(analysis.power, 0, 1);

  // 좌우 바깥쪽으로 향하게 오프셋
  const outwardSign = analysis.curveDirection !== 0
    ? analysis.curveDirection
    : Math.sign(baseTarget.x) || 1;

  const horizontalOffset = CURVE_AIM_CONFIG.horizontalMax *
    curveIntensity *
    (0.55 + 0.45 * powerFactor);

  adjusted.x += outwardSign * horizontalOffset;

  // 절대값이 늘어나지 않았다면 살짝 더 바깥으로 밀어줌
  if (Math.abs(adjusted.x) <= Math.abs(baseTarget.x)) {
    adjusted.x = baseTarget.x + outwardSign * (horizontalOffset + 0.15);
  }

  const baseHorizontalLimit = GOAL_WIDTH / 2 + SHOT_TARGET_CONFIG.horizontalMargin;
  const maxAbsX = baseHorizontalLimit + CURVE_AIM_CONFIG.horizontalMargin;
  adjusted.x = THREE.MathUtils.clamp(adjusted.x, -maxAbsX, maxAbsX);

  // 커브 슛은 살짝 더 높게 띄움
  return adjusted;
}

/**
 * 슈팅 파라미터를 디버그 문자열로 변환
 */
export function debugShotParameters(params: ShotParameters): string {
  const {
    targetPosition,
    direction,
    distance,
    aimTargetPosition,
    aimDirection,
    aimDistance
  } = params;

  return `
Shot Parameters:
  Target: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})
  Aim Target: (${aimTargetPosition.x.toFixed(2)}, ${aimTargetPosition.y.toFixed(2)}, ${aimTargetPosition.z.toFixed(2)})
  Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})
  Aim Direction: (${aimDirection.x.toFixed(2)}, ${aimDirection.y.toFixed(2)}, ${aimDirection.z.toFixed(2)})
  Distance: ${distance.toFixed(2)}m
  Aim Distance: ${aimDistance.toFixed(2)}m
  `.trim();
}
