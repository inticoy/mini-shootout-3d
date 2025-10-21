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
  linearDamping: 0.1,
  angularDamping: 0.9,
  gltfScale: 0.02,
  startPosition: { x: 0, y: 0.15, z: 0 }
};

export const BALL_RADIUS = BALL_CONFIG.radius;
export const BALL_START_POSITION = BALL_CONFIG.startPosition;
