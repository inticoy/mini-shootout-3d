export type KeeperMovementType = 'static' | 'patrol' | 'spin';

export interface KeeperBehaviorConfig {
  type: KeeperMovementType;
  /**
   * Keeper가 위치할 Z 좌표 (골대 기준: 골 라인은 약 -6)
   */
  z: number;
  /**
   * X 좌표 허용 범위. type에 따라 의미가 조금씩 다름.
   */
  xRange: [number, number];
  /**
   * 좌우 순환 이동 속도 (radian/sec). patrol 타입에서 사용.
   */
  patrolSpeed?: number;
  /**
   * 회전 애니메이션 속도 (radian/sec). spin 타입에서 사용.
   */
  spinSpeed?: number;
  /**
   * 회전 반경. 기본값은 xRange 기반으로 계산.
   */
  spinRadius?: number;
}

export interface DifficultyLevelConfig {
  /**
   * 이 난이도가 적용되는 최소 점수.
   */
  threshold: number;
  name: string;
  keeper: KeeperBehaviorConfig;
}

/**
 * 난이도 레벨 정의 (점수 오름차순)
 * 점수가 주어진 threshold 이상일 때 해당 레벨이 적용됨.
 */
export const DIFFICULTY_LEVELS: DifficultyLevelConfig[] = [
  {
    threshold: 0,
    name: 'Level 1',
    keeper: {
      type: 'static',
      z: -5.5,
      xRange: [-1, 1]
    }
  },
  {
    threshold: 1,
    name: 'Level 2',
    keeper: {
      type: 'static',
      z: -3.0,
      xRange: [-0.5, 0.5]
    }
  },
  {
    threshold: 2,
    name: 'Level 3',
    keeper: {
      type: 'patrol',
      z: -5.5,
      xRange: [-1, 1],
      patrolSpeed: 2.0
    }
  },
  {
    threshold: 3,
    name: 'Level 4',
    keeper: {
      type: 'patrol',
      z: -4.0,
      xRange: [-0.5, 0.5],
      patrolSpeed: 3.
    }
  },
  {
    threshold: 4,
    name: 'Level 5',
    keeper: {
      type: 'spin',
      z: -4.5,
      xRange: [-0.7, 0.7],
      patrolSpeed: 5.0,
      spinSpeed: 4.0,
      spinRadius: 0
    }
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
