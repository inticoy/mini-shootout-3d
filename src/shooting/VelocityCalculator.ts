import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ShotType } from './ShotAnalyzer';
import type { ShotParameters } from './ShotParameters';
import { PHYSICS_GRAVITY } from '../physics/Constants';
import { BALL_START_POSITION } from '../config/ball';
import { SHOT_TIMING_CONFIG } from '../config/shooting';

/**
 * 슈팅 파라미터로부터 초기 velocity 계산
 *
 * NORMAL: 탄도 계산 - targetPosition에 정확히 도착
 * CURVE: 탄도 계산 - 보정된 aimTargetPosition에 맞춰 발사 (비행 중 CurveForceSystem이 시각적 곡선을 부여)
 */
export function calculateInitialVelocity(shotParams: ShotParameters): CANNON.Vec3 | null {
  const { analysis, targetPosition, aimTargetPosition } = shotParams;

  if (analysis.type === ShotType.INVALID) {
    return null;
  }

  const timingConfig = analysis.type === ShotType.CURVE
    ? SHOT_TIMING_CONFIG.CURVE
    : SHOT_TIMING_CONFIG.NORMAL;

  const startPos = new THREE.Vector3(BALL_START_POSITION.x, BALL_START_POSITION.y, BALL_START_POSITION.z);
  const ballisticTarget = analysis.type === ShotType.CURVE ? aimTargetPosition : targetPosition;
  const debugLabel = analysis.type === ShotType.CURVE ? 'CURVE (aimed)' : 'NORMAL';
  const { minTime, maxTime } = timingConfig;

  return calculateBallisticVelocity(
    ballisticTarget,
    startPos,
    analysis.power,
    {
      minTime: minTime ?? 0.3,
      maxTime: maxTime ?? 0.6
    },
    {
      label: debugLabel,
      displayedTarget: analysis.type === ShotType.CURVE ? targetPosition : null
    }
  );
}

/**
 * 탄도 기반 초기 속도 계산 (NORMAL 슛)
 * targetPosition에 정확히 도착하도록 물리적으로 계산
 */
function calculateBallisticVelocity(
  targetPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  power: number,
  config: { minTime: number; maxTime: number },
  debugContext?: { label?: string; displayedTarget: THREE.Vector3 | null }
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

  // 🔍 디버깅: 탄도 계산 상세 정보
  const label = debugContext?.label ?? 'BALISTIC';
  console.log(`🎯 탄도 계산 [${label}]:`);
  console.log('  Power:', power.toFixed(2));
  console.log('  도착 시간(t):', t.toFixed(3), 's');
  console.log('  Start:', `(${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)})`);
  console.log('  Target:', `(${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
  if (debugContext?.displayedTarget) {
    console.log('  Display Target:', `(${debugContext.displayedTarget.x.toFixed(2)}, ${debugContext.displayedTarget.y.toFixed(2)}, ${debugContext.displayedTarget.z.toFixed(2)})`);
  }
  console.log('  Displacement:', `(${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)})`);
  console.log('  초기 속도:', `(${vx.toFixed(2)}, ${vy.toFixed(2)}, ${vz.toFixed(2)}) m/s`);
  console.log('  속력:', Math.sqrt(vx*vx + vy*vy + vz*vz).toFixed(2), 'm/s');
  console.log('  Gravity:', PHYSICS_GRAVITY);

  return new CANNON.Vec3(vx, vy, vz);
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
