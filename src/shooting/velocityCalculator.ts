import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ShotType } from './shotAnalyzer';
import type { ShotParameters } from './shotParameters';

/**
 * 슈팅 타입별 velocity 설정
 */
const SHOT_TYPE_CONFIG = {
  [ShotType.INVALID]: {
    baseSpeed: 0,
    heightMultiplier: 0,
    zBoost: 1.0,
    enabled: false
  },
  [ShotType.CHIP]: {
    baseSpeed: 12,
    heightMultiplier: 0.3,  // 감소 - 목표 지점 기준으로만
    zBoost: 1.2,
    enabled: true
  },
  [ShotType.NORMAL]: {
    baseSpeed: 15,
    heightMultiplier: 0.2,  // 감소 - 목표 지점 기준으로만
    zBoost: 1.3,
    enabled: true
  },
  [ShotType.POWER]: {
    baseSpeed: 22,
    heightMultiplier: 0.15, // 감소 - 목표 지점 기준으로만
    zBoost: 1.5,
    enabled: true
  },
  [ShotType.CURVE]: {
    baseSpeed: 20,
    heightMultiplier: 0.2,  // 감소 - 목표 지점 기준으로만
    zBoost: 1.4,
    curveBoost: 3.5,
    enabled: true
  }
};

/**
 * 슈팅 파라미터로부터 초기 velocity 계산
 */
export function calculateInitialVelocity(shotParams: ShotParameters): CANNON.Vec3 | null {
  const { analysis, direction } = shotParams;
  const config = SHOT_TYPE_CONFIG[analysis.type];

  // 무효한 슈팅이면 null 반환
  if (!config.enabled) {
    return null;
  }

  // 1. 기본 속도 계산 (power 적용)
  const speed = config.baseSpeed * (0.7 + analysis.power * 0.6); // 0.7~1.3 배율

  // 2. 방향 벡터를 기반으로 velocity 계산
  // direction은 목표 지점을 향하지만, 포물선을 그리려면 Y를 조정해야 함
  const velocityDir = new THREE.Vector3().copy(direction);

  // 3. 높이 조정 (타입별 heightMultiplier 적용)
  // Y 성분을 증가시켜 포물선 궤적 생성
  velocityDir.y += config.heightMultiplier * 0.5;
  velocityDir.normalize();

  // 4. 속도 적용
  velocityDir.multiplyScalar(speed);

  // 5. Z축 부스트 적용 (더 빠르게 전진)
  velocityDir.z *= config.zBoost;

  // 6. Curve 타입이면 X 성분 대폭 증가 (골대 밖을 향하도록)
  if (analysis.type === ShotType.CURVE) {
    const curveBoost = (config as any).curveBoost || 2;
    const curveForce = analysis.curveAmount * analysis.curveDirection * curveBoost;
    velocityDir.x += curveForce;
  }

  // 6. CANNON.Vec3로 변환
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
