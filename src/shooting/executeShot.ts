import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { normalizeSwipeData } from './swipeNormalizer';
import { analyzeShotType, ShotType } from './shotAnalyzer';
import { calculateShotParameters } from './shotParameters';
import { calculateInitialVelocity } from './velocityCalculator';
import { calculateAngularVelocity } from './spinCalculator';

/**
 * 슈팅 실행 결과
 */
export interface ShotResult {
  /** 공의 초기 속도 */
  velocity: CANNON.Vec3;
  /** 공의 각속도 (회전) */
  angularVelocity: CANNON.Vec3;
  /** 슛 타입 (NORMAL, CURVE, INVALID) */
  shotType: ShotType;
  /** 타겟 위치 (골대 내) */
  targetPosition: THREE.Vector3;
  /** 에임 타겟 위치 (커브샷의 경우 골대 밖) */
  aimTargetPosition: THREE.Vector3;
  /** 디버그 정보 (각 단계별 데이터) */
  debugInfo: {
    normalized: any;
    analysis: any;
    shotParams: any;
  };
}

/**
 * 슈팅 파이프라인 전체를 실행
 *
 * Pipeline:
 * 1. normalizeSwipeData - 스와이프 정규화 (화면 좌표 → 정규화된 2D 경로)
 * 2. analyzeShotType - 슛 타입 분석 (NORMAL/CURVE 판단, power/curve 계산)
 * 3. calculateShotParameters - 3D 공간 파라미터 계산 (targetPosition, aimTargetPosition)
 * 4. calculateInitialVelocity - 초기 속도 계산 (포물선 운동 방정식)
 * 5. calculateAngularVelocity - 스핀 계산 (커브샷의 경우 Magnus 효과)
 *
 * @param swipeData - 원본 스와이프 데이터 (화면 좌표)
 * @returns ShotResult - 슈팅에 필요한 모든 데이터
 */
export function executeShot(swipeData: any): ShotResult {
  // Step 1: Normalize swipe
  // 화면 좌표를 정규화된 2D 경로로 변환
  const normalized = normalizeSwipeData(swipeData);

  // Step 2: Analyze shot type
  // 경로 곡률을 분석하여 NORMAL/CURVE 판단
  const analysis = analyzeShotType(normalized);

  // Step 3: Calculate shot parameters
  // 2D 경로를 3D 공간으로 투영하여 타겟 위치 계산
  const shotParams = calculateShotParameters(normalized, analysis);

  // Step 4: Calculate initial velocity
  // 포물선 운동 방정식을 이용하여 초기 속도 계산
  const velocity = calculateInitialVelocity(shotParams);

  // velocity가 null인 경우 기본값 설정
  if (!velocity) {
    throw new Error('Failed to calculate initial velocity');
  }

  // Step 5: Calculate spin (CURVE shots only)
  // 커브샷인 경우 Magnus 효과를 위한 각속도 계산
  const angularVelocity = calculateAngularVelocity(shotParams, velocity);

  return {
    velocity,
    angularVelocity,
    shotType: analysis.type,
    targetPosition: shotParams.targetPosition,
    aimTargetPosition: shotParams.aimTargetPosition,
    debugInfo: {
      normalized,
      analysis,
      shotParams
    }
  };
}
