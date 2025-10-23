import { PHYSICS_LINEAR_DAMPING } from '../physics/constants';
import basicBallModel from '../assets/ball/basic/basic.glb?url';
import moonBallModel from '../assets/ball/moon/moon.glb?url';

// 공통 물리 속성 (모든 테마에서 공유)
export interface BallPhysicsConfig {
  radius: number;
  mass: number;
  linearDamping: number;
  angularDamping: number;
  startPosition: { x: number; y: number; z: number };
}

// 테마별 시각적 속성
export interface BallTheme {
  name: string;
  modelUrl: string;  // 실제 URL을 저장
  gltfScale: number;
}

// 전체 Ball 설정 (물리 + 테마)
export interface BallConfig extends BallPhysicsConfig {
  theme: BallTheme;
  gltfScale: number;  // 하위 호환성을 위해 유지
}

const BALL_HOVER_EPSILON = 0.01; // 공이 지면과 겹치지 않도록 살짝 띄움

// 공통 물리 속성
export const BALL_PHYSICS: BallPhysicsConfig = {
  radius: 0.15,
  mass: 1.2,
  linearDamping: PHYSICS_LINEAR_DAMPING,
  angularDamping: 0.9,
  startPosition: { x: 0, y: 0.15, z: 0 }  // y는 아래에서 radius 기반으로 재계산됨
};

// startPosition.y를 radius 기반으로 재설정
BALL_PHYSICS.startPosition.y = BALL_PHYSICS.radius + BALL_HOVER_EPSILON;

// 테마 정의
export const BALL_THEMES = {
  BASIC: {
    name: 'basic',
    modelUrl: basicBallModel,
    gltfScale: 1.3
  } as BallTheme,
  MOON: {
    name: 'moon',
    modelUrl: moonBallModel,
    gltfScale: 0.0048
  } as BallTheme,
  // 나중에 추가할 테마들
  // BASKETBALL: { name: 'basketball', modelUrl: basketballModel, gltfScale: 1.5 },
  // VOLLEYBALL: { name: 'volleyball', modelUrl: volleyballModel, gltfScale: 1.3 },
} as const;

// 기본 테마 설정
export const DEFAULT_BALL_THEME = BALL_THEMES.BASIC;

// 전체 Ball 설정 (하위 호환성을 위해 유지)
export const BALL_CONFIG: BallConfig = {
  ...BALL_PHYSICS,
  theme: DEFAULT_BALL_THEME,
  gltfScale: DEFAULT_BALL_THEME.gltfScale  // 하위 호환성
};

// Export 단순화
export const BALL_RADIUS = BALL_PHYSICS.radius;
export const BALL_START_POSITION = BALL_PHYSICS.startPosition;
export const BALL_HOVER_OFFSET = BALL_HOVER_EPSILON;
