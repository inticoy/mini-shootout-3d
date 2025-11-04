import { PHYSICS_LINEAR_DAMPING } from '../physics/constants';
import type { SoundKey } from './audio';
import basicBallModel from '../assets/ball/basic.glb?url';
import moonBallModel from '../assets/ball/moon.glb?url';
import basketBallModel from '../assets/ball/basketball.glb?url';
import volleyBallModel from '../assets/ball/volleyball.glb?url';
import earthBallModel from '../assets/ball/earth.glb?url';

// PNG 이미지 import
import basicBallImage from '../assets/ball/basic.png';
import moonBallImage from '../assets/ball/moon.png';
import basketballBallImage from '../assets/ball/basketball.png';
import volleyballBallImage from '../assets/ball/volleyball.png';
import earthBallImage from '../assets/ball/earth.png';

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
  imageUrl: string;  // 프리뷰 이미지 URL
  gltfScale: number;
  material?: {
    roughness?: number;
    metalness?: number;
  };
  sounds?: {
    bounce?: SoundKey;  // 바운스 사운드 이름 (기본값: 'bounce')
  };
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
    imageUrl: basicBallImage,
    gltfScale: 1.3
  } as BallTheme,
  MOON: {
    name: 'moon',
    modelUrl: moonBallModel,
    imageUrl: moonBallImage,
    gltfScale: 0.0048,
	material: {
	  roughness: 0.,
	  metalness: 0.3,
	},
	sounds: {
    bounce: 'post'  // 다른 사운드 사용 가능
  }
  } as BallTheme,
  BASKETBALL : {
	name: 'basketball',
	modelUrl: basketBallModel,
	imageUrl: basketballBallImage,
	gltfScale: 0.69
  } as BallTheme,
  VOLLEYBALL : {
	name: 'volleyball',
	modelUrl: volleyBallModel,
	imageUrl: volleyballBallImage,
	gltfScale: 1.3
  } as BallTheme,
  EARTH : {
	name: 'earth',
	modelUrl: earthBallModel,
	imageUrl: earthBallImage,
	gltfScale: 0.11,
	material: {
	  roughness: 0.,
	  metalness: 0.3,
	}
  } as BallTheme,
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
