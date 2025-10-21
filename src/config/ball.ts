import { PHYSICS_LINEAR_DAMPING } from '../physics/constants';

export interface BallConfig {
  radius: number;
  mass: number;
  linearDamping: number;
  angularDamping: number;
  gltfScale: number;
  startPosition: { x: number; y: number; z: number };
}

export const BALL_CONFIG: BallConfig = {
  radius: 0.15,
  mass: 1.2,
  linearDamping: PHYSICS_LINEAR_DAMPING,  // 물리 상수 사용
  angularDamping: 0.9,
  gltfScale: 0.02,
  startPosition: { x: 0, y: 0.15, z: 0 }  // y는 아래에서 radius 기반으로 재계산됨
};

// startPosition.y를 radius 기반으로 재설정 (공이 땅에 닿게)
BALL_CONFIG.startPosition.y = BALL_CONFIG.radius;

export const BALL_RADIUS = BALL_CONFIG.radius;
export const BALL_START_POSITION = BALL_CONFIG.startPosition;
