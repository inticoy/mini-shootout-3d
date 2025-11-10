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
    threshold: 2,
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
    threshold: 3,
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
    threshold: 4,
    name: 'Level 5',
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
    threshold: 5,
    name: 'Level 6',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { z: -4.95 } },
        behavior: { type: 'patrol', axis: 'x', range: [-0.55, 0.55], speed: 1.3 }
      },
      {
        blueprintId: 'capsuleGuard',
        transform: { position: { x: -1.35, z: -4.95 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.55, 1.2],
          speed: 1.6,
          waveform: 'pingpong'
        }
      },
      {
        blueprintId: 'capsuleGuard',
        transform: { position: { x: 1.35, z: -4.95 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.55, 1.2],
          speed: 1.6,
          waveform: 'pingpong',
          startPhase: Math.PI
        }
      }
    ]
  },
  {
    threshold: 6,
    name: 'Level 7',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { z: -4.8 } },
        behavior: { type: 'patrol', axis: 'x', range: [-0.8, 0.8], speed: 1.7 }
      },
      {
        blueprintId: 'cylinderBasic',
        transform: { position: { x: 0, z: -4.6 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.6, 1.4],
          speed: 2.1,
          waveform: 'pingpong'
        }
      },
      {
        blueprintId: 'cubeColor',
        transform: { position: { x: -1.45, z: -4.85 } },
        behavior: { type: 'static' }
      },
      {
        blueprintId: 'cubeColor',
        transform: { position: { x: 1.45, z: -4.85 } },
        behavior: { type: 'static' }
      }
    ]
  },
  {
    threshold: 7,
    name: 'Level 8',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { z: -4.65 } },
        behavior: { type: 'spin', axis: 'z', speed: 4.2, radius: 0.15 }
      },
      {
        blueprintId: 'capsuleGuard',
        transform: { position: { x: -1.4, z: -4.8 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.6, 1.5],
          speed: 2.0,
          waveform: 'pingpong'
        }
      },
      {
        blueprintId: 'capsuleGuard',
        transform: { position: { x: 1.4, z: -4.8 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.6, 1.5],
          speed: 2.0,
          waveform: 'pingpong',
          startPhase: Math.PI
        }
      },
      {
        blueprintId: 'cubeColor',
        transform: { position: { x: 0, z: -4.55 } },
        behavior: { type: 'spin', axis: 'y', speed: 5.4 }
      }
    ]
  },
  {
    threshold: 8,
    name: 'Level 9',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { z: -4.4 } },
        behavior: {
          type: 'spin',
          axis: 'z',
          speed: 5.2,
          radius: 0.2,
          orbit: { axis: 'x', range: [-1.1, 1.1], speed: 2.4 }
        }
      },
      {
        blueprintId: 'cylinderBasic',
        transform: { position: { x: 0, z: -4.35 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.7, 1.6],
          speed: 2.4,
          waveform: 'pingpong'
        }
      },
      {
        blueprintId: 'panelBlue',
        transform: { position: { x: -1.35, z: -4.5 }, rotation: { y: -0.12 } },
        behavior: { type: 'static' }
      },
      {
        blueprintId: 'panelBlue',
        transform: { position: { x: 1.35, z: -4.5 }, rotation: { y: 0.12 } },
        behavior: { type: 'static' }
      },
      {
        blueprintId: 'cokeBottle',
        transform: { position: { x: -0.6, z: -4.55 } },
        behavior: { type: 'spin', axis: 'y', speed: 6.0 }
      },
      {
        blueprintId: 'cokeBottle',
        transform: { position: { x: 0.6, z: -4.55 } },
        behavior: { type: 'spin', axis: 'y', speed: 6.0, startAngle: Math.PI }
      }
    ]
  },
  {
    threshold: 9,
    name: 'Level 10',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { z: -4.25 } },
        behavior: {
          type: 'spin',
          axis: 'z',
          speed: 6.0,
          radius: 0.25,
          orbit: { axis: 'x', range: [-1.2, 1.2], speed: 3.0, startPhase: Math.PI / 2 }
        }
      },
      {
        blueprintId: 'capsuleGuard',
        transform: { position: { x: -1.45, z: -4.6 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.55, 1.65],
          speed: 2.6,
          waveform: 'pingpong'
        }
      },
      {
        blueprintId: 'capsuleGuard',
        transform: { position: { x: 1.45, z: -4.6 } },
        behavior: {
          type: 'patrol',
          axis: 'y',
          range: [0.55, 1.65],
          speed: 2.6,
          waveform: 'pingpong',
          startPhase: Math.PI
        }
      },
      {
        blueprintId: 'cubeColor',
        transform: { position: { x: -0.85, z: -4.45 } },
        behavior: { type: 'spin', axis: 'y', speed: 6.2, radius: 0.18 }
      },
      {
        blueprintId: 'cubeColor',
        transform: { position: { x: 0.85, z: -4.45 } },
        behavior: { type: 'spin', axis: 'y', speed: 6.2, radius: 0.18, startAngle: Math.PI }
      },
      {
        blueprintId: 'cylinderBasic',
        transform: { position: { x: 0, z: -4.15 } },
        behavior: { type: 'patrol', axis: 'z', range: [-4.35, -3.9], speed: 2.7 }
      },
      {
        blueprintId: 'panelBlue',
        transform: { position: { z: -4.4 }, rotation: { y: 0.2 } },
        behavior: { type: 'static' }
      }
    ]
  }
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
