import type { ObstacleInstanceConfig } from './Obstacles';

export interface DifficultyLevelConfig {
  /** 이 난이도가 적용되는 최소 점수 */
  threshold: number;
  name: string;
  obstacles: ObstacleInstanceConfig[];
}

/**
 * 난이도 레벨 정의 (점수 오름차순)
 * 점수가 주어진 threshold 이상일 때 해당 레벨이 적용됨.
 */
export const DIFFICULTY_LEVELS: DifficultyLevelConfig[] = [
  {
    threshold: 0,
    name: 'Level 1',
    obstacles: []
  },
  {
    threshold: 1,
    name: 'Level 2',
    obstacles: [
      {
        blueprintId: 'woodVertical',
        transform: { position: { x: 1.1, z: -5.4 } },
        behavior: { type: 'static' }
      }
    ]
  },
  {
    threshold: 1,
    name: 'Level 3',
    obstacles: [
      {
        blueprintId: 'woodHorizontal',
        transform: { position: { x: 0.0, y: 1.6, z: -5.35 } },
        behavior: { type: 'static' }
      }
    ]
  },
  {
    threshold: 1,
    name: 'Level 4',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { z: -5.2 } },
        behavior: { type: 'static' }
      },
    ]
  },
  {
    threshold: 1,
    name: 'Level 5',
    obstacles: [
      {
        blueprintId: 'shark',
        transform: { position: {x: -0.5, y: 0.5, z: -5.0 }},
        behavior: {
		  type: 'patrol',
		  axis: 'x',
		  range: [-2.0, 2.0],
		  speed: 1.0,
		  waveform: 'pingpong'
		}
      },
    ]
  },
  {
    threshold: 1,
    name: 'Level 6',
    obstacles: [
      {
        blueprintId: 'whiteDrone',
        transform: { position: {y: 1.5, z: -5.0 } },
        behavior: {
		  type: 'patrol',
		  axis: 'x',
		  range: [-1.0, 1.0],
		  speed: 2.0,
		  waveform: 'sine'
		}
      },
    ]
  },
  {
    threshold: 1,
    name: 'Level 7',
    obstacles: [
      {
        blueprintId: 'van',
        transform: { position: {y: 1, z: -5.0 }, rotation: {y: - Math.PI /2} },
        behavior: {
		  type: 'patrol',
		  axis: 'x',
		  range: [-2.0, 2.0],
		  speed: 1.0,
		  waveform: 'sine'
		}
      },
    ]
  },
  {
    threshold: 1,
    name: 'Level 8',
    obstacles: [
      {
        blueprintId: 'drum',
        transform: { position: {x: -0.5, y: 0.5, z: -5.0 }},
        behavior: {
		  type: 'static',
		}
      },
    ]
  },
];

/**
 * 현재 점수에 해당하는 난이도 정보를 반환한다.
 */
export function getDifficultyForScore(score: number): DifficultyLevelConfig {
  let bestThreshold = Number.NEGATIVE_INFINITY;
  let candidates: DifficultyLevelConfig[] = [];

  for (const level of DIFFICULTY_LEVELS) {
    if (score < level.threshold) {
      break;
    }

    if (level.threshold > bestThreshold) {
      bestThreshold = level.threshold;
      candidates = [level];
    } else if (level.threshold === bestThreshold) {
      candidates.push(level);
    }
  }

  if (candidates.length === 0) {
    return DIFFICULTY_LEVELS[0];
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}
