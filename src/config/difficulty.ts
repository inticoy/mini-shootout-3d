export type KeeperMovementType = 'static' | 'patrol' | 'spin';

export interface KeeperBehaviorConfig {
  type: KeeperMovementType;
  /** Keeper가 위치할 Z 좌표 (골대 기준: 골 라인은 약 -6) */
  z: number;
  /** X 좌표 허용 범위. type에 따라 의미가 달라짐 */
  xRange: [number, number];
  /** 좌우 순환 이동 속도 (radian/sec). patrol / spin 타입에서 사용 */
  patrolSpeed?: number;
  /** 회전 애니메이션 속도 (radian/sec). spin 타입에서 사용 */
  spinSpeed?: number;
  /** 회전 반경 (추가 오프셋이 필요할 때 사용) */
  spinRadius?: number;
}

export interface DifficultyLevelConfig {
  /** 이 난이도가 적용되는 최소 점수 */
  threshold: number;
  name: string;
  keepers: KeeperBehaviorConfig[];
}

/**
 * 난이도 레벨 정의 (점수 오름차순)
 * 점수가 주어진 threshold 이상일 때 해당 레벨이 적용됨.
 */
export const DIFFICULTY_LEVELS: DifficultyLevelConfig[] = [
  // 쉬움 ───────────────────────────────────────────────────────────
  {
    threshold: 0,
    name: 'Level 1',
    keepers: [
    //   { type: 'static', z: -5.6, xRange: [-0.8, 0.8] }
    ]
  },
  {
    threshold: 1,
    name: 'Level 2',
    keepers: [
      { type: 'static', z: -5.5, xRange: [-0., 0.] }
    ]
  },
  {
    threshold: 2,
    name: 'Level 3',
    keepers: [
      { type: 'patrol', z: -5.4, xRange: [-1.0, 1.0], patrolSpeed: 1.2 }
    ]
  },
  {
    threshold: 3,
    name: 'Level 4',
    keepers: [
      { type: 'patrol', z: -4.9, xRange: [-1.1, 1.1], patrolSpeed: 1.6 }
    ]
  },

  // 중간 ───────────────────────────────────────────────────────────
  {
    threshold: 4,
    name: 'Level 5',
    keepers: [
      { type: 'patrol', z: -4.6, xRange: [-1.2, 1.2], patrolSpeed: 2.0 }
    ]
  },
  {
    threshold: 5,
    name: 'Level 6',
    keepers: [
      // 좌/우 독립 스피너 + 약간의 원운동 반경으로 예측 난이도 상승
      { type: 'spin', z: -4.6, xRange: [-1.0, -0.2], patrolSpeed: 1.5, spinSpeed: 4.0, spinRadius: 0.15 },
      { type: 'spin', z: -4.6, xRange: [ 0.2,  1.0], patrolSpeed: -1.5, spinSpeed: 4.0, spinRadius: 0.15 }
    ]
  },
  {
    threshold: 6,
    name: 'Level 7',
    keepers: [
      { type: 'spin', z: -4.4, xRange: [-1.1, -0.1], patrolSpeed: 2.0,  spinSpeed: 5.0, spinRadius: 0.25 },
      { type: 'spin', z: -4.4, xRange: [ 0.1,  1.1], patrolSpeed: -2.0, spinSpeed: 5.0, spinRadius: 0.25 }
    ]
  },

  // 어려움 ─────────────────────────────────────────────────────────
  {
    threshold: 7,
    name: 'Level 8',
    keepers: [
      // 중앙 광폭 패트롤 + 포스트 근처 정적 블로커(랜덤폭 좁게)
      { type: 'patrol', z: -4.3, xRange: [-1.25, 1.25], patrolSpeed: 2.2 },
      { type: 'static', z: -4.5, xRange: [-1.25, -1.05] },
      { type: 'static', z: -4.5, xRange: [ 1.05,  1.25] }
    ]
  },
  {
    threshold: 8,
    name: 'Level 9',
    keepers: [
      // 이중 패트롤로 교차 커버(범위 겹침)
      { type: 'patrol', z: -4.2, xRange: [-1.3, 0.2],  patrolSpeed: 2.4 },
      { type: 'patrol', z: -4.2, xRange: [-0.2, 1.3],  patrolSpeed: -2.6 }
    ]
  },

  // 최상 ───────────────────────────────────────────────────────────
  {
    threshold: 9,
    name: 'Level 10',
    keepers: [
      // 중앙 초광폭 고속 패트롤 + 좌우 스피너(고속/큰 반경)
      { type: 'patrol', z: -4.0, xRange: [-1.35, 1.35], patrolSpeed: 2.8 },
      { type: 'spin',   z: -4.1, xRange: [-1.2, -0.2],  patrolSpeed: 2.2, spinSpeed: 6.0, spinRadius: 0.35 },
      { type: 'spin',   z: -4.1, xRange: [ 0.2,  1.2],  patrolSpeed: -2.2, spinSpeed: 6.0, spinRadius: 0.35 }
    ]
  }
];


/**
 * 현재 점수에 해당하는 난이도 정보를 반환한다.
 */
export function getDifficultyForScore(score: number): DifficultyLevelConfig {
  let result = DIFFICULTY_LEVELS[0];
  for (const level of DIFFICULTY_LEVELS) {
    if (score >= level.threshold) {
      result = level;
    } else {
      break;
    }
  }
  return result;
}
