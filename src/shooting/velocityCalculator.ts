import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ShotType } from './shotAnalyzer';
import type { ShotParameters } from './shotParameters';
import { PHYSICS_GRAVITY } from '../physics/constants';
import { BALL_START_POSITION } from '../config/ball';

/**
 * 슈팅 타입별 설정
 */
const SHOT_TYPE_CONFIG = {
  [ShotType.INVALID]: {
    enabled: false
  },
  [ShotType.NORMAL]: {
    enabled: true,
    minTime: 0.2,  // power=1.0: 빠르게, 직선적
    maxTime: 0.6   // power=0.0: 느리게, 포물선
  },
  [ShotType.CURVE]: {
    enabled: true,
    // CURVE는 기존 방식 유지 (curveForceSystem 때문에 정확한 예측 어려움)
    baseSpeed: 20,
    heightMultiplier: 0.2,
    zBoost: 1.4,
    curveBoost: 3.5
  }
};

/**
 * 슈팅 파라미터로부터 초기 velocity 계산
 *
 * NORMAL: 탄도 계산 - targetPosition에 정확히 도착
 * CURVE: 기존 방식 - curveForceSystem이 비행 중 보정
 */
export function calculateInitialVelocity(shotParams: ShotParameters): CANNON.Vec3 | null {
  const { analysis, targetPosition, direction } = shotParams;
  const config = SHOT_TYPE_CONFIG[analysis.type];

  // 무효한 슈팅이면 null 반환
  if (!config.enabled) {
    return null;
  }

  // NORMAL: 탄도 기반 계산
  if (analysis.type === ShotType.NORMAL) {
    const startPos = new THREE.Vector3(BALL_START_POSITION.x, BALL_START_POSITION.y, BALL_START_POSITION.z);
    return calculateBallisticVelocity(targetPosition, startPos, analysis.power, config as any);
  }

  // CURVE: 기존 방식 유지
  if (analysis.type === ShotType.CURVE) {
    return calculateCurveVelocity(direction, analysis, config as any);
  }

  return null;
}

/**
 * 탄도 기반 초기 속도 계산 (NORMAL 슛)
 * targetPosition에 정확히 도착하도록 물리적으로 계산
 */
function calculateBallisticVelocity(
  targetPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  power: number,
  config: { minTime: number; maxTime: number }
): CANNON.Vec3 {
  // 1. power → 도착 시간(t) 변환
  // power 높음 = 빠르게 도착 (직선적)
  // power 낮음 = 천천히 도착 (포물선)
  const t = config.maxTime - (config.maxTime - config.minTime) * power;

  // 2. 변위 계산 (displacement = target - start)
  const dx = targetPosition.x - startPosition.x;
  const dy = targetPosition.y - startPosition.y;
  const dz = targetPosition.z - startPosition.z;

  // 3. 탄도 계산
  // 등가속도 운동: displacement = v0 * t + 0.5 * a * t²
  // v0 = (displacement - 0.5 * g * t²) / t

  const vx = dx / t;
  const vy = (dy - 0.5 * PHYSICS_GRAVITY * t * t) / t;
  const vz = dz / t;

  return new CANNON.Vec3(vx, vy, vz);
}

/**
 * 커브 슛 초기 속도 계산 (기존 방식)
 * curveForceSystem이 비행 중 힘을 가하므로 정확한 착탄점 예측 불가
 */
function calculateCurveVelocity(
  direction: THREE.Vector3,
  analysis: any,
  config: { baseSpeed: number; heightMultiplier: number; zBoost: number; curveBoost: number }
): CANNON.Vec3 {
  // 1. 기본 속도 계산 (power 적용)
  const speed = config.baseSpeed * (0.7 + analysis.power * 0.6);

  // 2. 방향 벡터 복사
  const velocityDir = new THREE.Vector3().copy(direction);

  // 3. 높이 조정
  velocityDir.y += config.heightMultiplier * 0.5;
  velocityDir.normalize();

  // 4. 속도 적용
  velocityDir.multiplyScalar(speed);

  // 5. Z축 부스트
  velocityDir.z *= config.zBoost;

  // 6. X축 curveBoost (골대 밖을 향하도록)
  const curveForce = analysis.curveAmount * analysis.curveDirection * config.curveBoost;
  velocityDir.x += curveForce;

  return new CANNON.Vec3(velocityDir.x, velocityDir.y, velocityDir.z);
}

/**
 * Velocity를 디버그 문자열로 변환
 */
export function debugVelocity(velocity: CANNON.Vec3 | null): string {
  if (!velocity) {
    return 'Velocity: INVALID (no shot)';
  }

  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

  return `
Initial Velocity:
  Vector: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})
  Speed: ${speed.toFixed(2)} m/s
  `.trim();
}
