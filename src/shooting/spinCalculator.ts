import * as CANNON from 'cannon-es';
import { ShotType } from './shotAnalyzer';
import type { ShotParameters } from './shotParameters';

/**
 * 슈팅 타입별 스핀 설정
 */
const SPIN_CONFIG = {
  [ShotType.INVALID]: {
    enabled: false,
    spinStrength: 0
  },
  [ShotType.NORMAL]: {
    enabled: false,       // 스핀 없음
    spinStrength: 0
  },
  [ShotType.CURVE]: {
    enabled: true,
    spinType: 'sidespin' as const,      // 사이드스핀 (감아차기)
    spinStrength: 20                    // 강한 회전
  }
};

/**
 * 슈팅 파라미터로부터 초기 angular velocity (회전) 계산
 */
export function calculateAngularVelocity(
  shotParams: ShotParameters,
  _velocity: CANNON.Vec3
): CANNON.Vec3 {
  const { analysis } = shotParams;
  const config = SPIN_CONFIG[analysis.type];

  if (!config.enabled) {
    return new CANNON.Vec3(0, 0, 0);
  }

  const spinStrength = config.spinStrength;
  const angularVelocity = new CANNON.Vec3(0, 0, 0);

  if (!('spinType' in config)) {
    return angularVelocity;
  }

  // Only sidespin is used now (CURVE shot)
  if (config.spinType === 'sidespin') {
    // 사이드스핀: 감아차기
    // Y축 회전 (공이 좌우로 회전)
    // curveDirection: -1 (왼쪽), 1 (오른쪽) - 반전 필요
    const direction = -analysis.curveDirection;
    const curveStrength = analysis.curveAmount;

    // Y축 회전
    angularVelocity.y = direction * spinStrength * curveStrength;

    // 약간의 백스핀 추가 (감아차기는 보통 백스핀도 포함)
    angularVelocity.x = spinStrength * 0.3;
  }

  return angularVelocity;
}

/**
 * Angular velocity를 디버그 문자열로 변환
 */
export function debugAngularVelocity(angularVelocity: CANNON.Vec3): string {
  const magnitude = Math.sqrt(
    angularVelocity.x ** 2 +
    angularVelocity.y ** 2 +
    angularVelocity.z ** 2
  );

  return `
Angular Velocity (Spin):
  Vector: (${angularVelocity.x.toFixed(2)}, ${angularVelocity.y.toFixed(2)}, ${angularVelocity.z.toFixed(2)})
  Magnitude: ${magnitude.toFixed(2)} rad/s
  `.trim();
}
