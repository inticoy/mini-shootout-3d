import * as THREE from 'three';
import type { ShotAnalysis } from './shotAnalyzer';
import type { NormalizedSwipeData } from './swipeNormalizer';
import { GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH } from '../config/goal';

/**
 * 슈팅 파라미터 (3D 공간)
 */
export interface ShotParameters {
  targetPosition: THREE.Vector3;  // 목표 지점 (골대 내 위치)
  direction: THREE.Vector3;       // 슈팅 방향 (정규화된 벡터)
  distance: number;               // 목표까지의 거리
  analysis: ShotAnalysis;         // 슈팅 분석 결과
}

/**
 * 공의 초기 위치
 */
const BALL_START_POSITION = new THREE.Vector3(0, 0, 0);

/**
 * 골대 범위
 */
const GOAL_BOUNDS = {
  xMin: -GOAL_WIDTH / 2,
  xMax: GOAL_WIDTH / 2,
  yMin: 0,
  yMax: GOAL_HEIGHT,
  z: GOAL_DEPTH
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

  // 3. 거리 계산
  const distance = BALL_START_POSITION.distanceTo(targetPosition);

  return {
    targetPosition,
    direction,
    distance,
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
  // X 위치 계산: 좌우 이동 거리를 골대 너비에 매핑
  // 화면 너비 대비 비율 추정 (보통 모바일 300~400px, 데스크탑 800~1200px)
  // 안전하게 200px를 골대 전체 너비(3m)로 매핑
  const horizontalRatio = normalized.horizontalDistance / 200;
  let targetX = horizontalRatio * (GOAL_WIDTH / 2);
  targetX = THREE.MathUtils.clamp(targetX, GOAL_BOUNDS.xMin, GOAL_BOUNDS.xMax);

  // Y 위치 계산: heightFactor 사용
  // heightFactor: 0 (하단) ~ 1 (상단)
  const targetY = THREE.MathUtils.clamp(
    analysis.heightFactor * GOAL_HEIGHT,
    GOAL_BOUNDS.yMin,
    GOAL_BOUNDS.yMax
  );

  // Z 위치: 골대 깊이
  const targetZ = GOAL_BOUNDS.z;

  return new THREE.Vector3(targetX, targetY, targetZ);
}

/**
 * 슈팅 파라미터를 디버그 문자열로 변환
 */
export function debugShotParameters(params: ShotParameters): string {
  const { targetPosition, direction, distance } = params;

  return `
Shot Parameters:
  Target: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})
  Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})
  Distance: ${distance.toFixed(2)}m
  `.trim();
}
