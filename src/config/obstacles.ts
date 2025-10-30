import keeperTextureUrl from '../assets/keeper/wall.png?url';
import woodTextureUrl from '../assets/models/obstacle/wood.jpg?url';
import cokeModelUrl from '../assets/models/bottle/coke.glb?url';

export type Axis = 'x' | 'y' | 'z';

export type RangeValue = [number, number];

export interface Vector3Init {
  x?: number;
  y?: number;
  z?: number;
}

export interface Vector3Range {
  x?: RangeValue;
  y?: RangeValue;
  z?: RangeValue;
}

export interface ObstacleTransformConfig {
  /** 고정 위치 */
  position?: Vector3Init;
  /** 범위에서 무작위 선택 */
  positionRange?: Vector3Range;
  /** 고정 회전 (라디안 단위) */
  rotation?: Vector3Init;
  /** 범위 회전 (라디안 단위) */
  rotationRange?: Vector3Range;
  /** 스케일 */
  scale?: number | Vector3Init;
}

export interface ObstacleMaterialConfig {
  color?: number | string;
  textureUrl?: string;
  doubleSided?: boolean;
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
}

export interface PrimitiveRenderConfig {
  kind: 'primitive';
  shape: 'box' | 'plane' | 'cylinder' | 'capsule' | 'sphere';
  size?: {
    x?: number;
    y?: number;
    z?: number;
    radius?: number;
    height?: number;
  };
  material?: ObstacleMaterialConfig;
}

export interface ModelRenderConfig {
  kind: 'model';
  assetUrl: string;
  scale?: number | Vector3Init;
  pivotOffset?: Vector3Init;
}

export type ObstacleRenderConfig = PrimitiveRenderConfig | ModelRenderConfig;

export interface BoxColliderConfig {
  shape: 'box';
  size: {
    x: number;
    y: number;
    z: number;
  };
}

export interface CylinderColliderConfig {
  shape: 'cylinder';
  radius: number;
  height: number;
  axis?: Axis;
}

export interface CapsuleColliderConfig {
  shape: 'capsule';
  radius: number;
  height: number;
  axis?: Axis;
}

export interface SphereColliderConfig {
  shape: 'sphere';
  radius: number;
}

export interface AutoColliderConfig {
  shape: 'auto';
  margin?: number;
}

export type ObstacleColliderConfig =
  | BoxColliderConfig
  | CylinderColliderConfig
  | CapsuleColliderConfig
  | SphereColliderConfig
  | AutoColliderConfig;

export interface StaticBehaviorConfig {
  type: 'static';
}

export interface PatrolBehaviorConfig {
  type: 'patrol';
  axis: Axis;
  range: RangeValue;
  speed?: number;
  waveform?: 'sine' | 'pingpong';
  startPhase?: number;
}

export interface SpinBehaviorConfig {
  type: 'spin';
  axis: Axis;
  speed?: number;
  orbit?: {
    axis: Axis;
    range: RangeValue;
    speed?: number;
    startPhase?: number;
  };
  radius?: number;
  startAngle?: number;
}

export type ObstacleBehaviorConfig =
  | StaticBehaviorConfig
  | PatrolBehaviorConfig
  | SpinBehaviorConfig;

export interface ObstacleBlueprint {
  id: string;
  render: ObstacleRenderConfig;
  collider?: ObstacleColliderConfig;
  defaultTransform?: ObstacleTransformConfig;
}

export interface ObstacleInstanceConfig {
  /** 사용할 블루프린트 ID */
  blueprintId: string;
  /** 개별 명칭 (디버그용) */
  label?: string;
  /** 기본 트랜스폼 오버라이드 */
  transform?: ObstacleTransformConfig;
  /** 콜라이더 오버라이드 */
  collider?: ObstacleColliderConfig;
  /** 행동 정의 */
  behavior?: ObstacleBehaviorConfig;
}

export const OBSTACLE_BLUEPRINTS: Record<string, ObstacleBlueprint> = {
  keeperWall: {
    id: 'keeperWall',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 0.6, y: 1.6 },
      material: {
        textureUrl: keeperTextureUrl,
        doubleSided: true,
        transparent: true,
        opacity: 1,
        alphaTest: 0.01
      }
    },
    collider: {
      shape: 'box',
      size: { x: 0.6, y: 1.6, z: 0.6 }
    },
    defaultTransform: {
      position: { y: 0.8 }
    }
  },
  woodVertical: {
    id: 'woodVertical',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 0.6, y: 2.0 },
      material: {
        textureUrl: woodTextureUrl,
        doubleSided: true,
        transparent: true,
        opacity: 1,
        alphaTest: 0.01
      }
    },
    collider: {
      shape: 'box',
      size: { x: 0.6, y: 2.0, z: 0.6 }
    },
    defaultTransform: {
      position: { y: 1.0 }
    }
  },
  woodHorizontal: {
    id: 'woodHorizontal',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 3.0, y: 0.6 },
      material: {
        textureUrl: woodTextureUrl,
        doubleSided: true,
        transparent: true,
        opacity: 1,
        alphaTest: 0.01
      }
    },
    collider: {
      shape: 'box',
      size: { x: 3.0, y: 0.6, z: 0.6 }
    },
    defaultTransform: {
      position: { y: 0.3 }
    }
  },
  cubeColor: {
    id: 'cubeColor',
    render: {
      kind: 'primitive',
      shape: 'box',
      size: { x: 0.8, y: 0.8, z: 0.8 },
      material: {
        color: '#ff3355'
      }
    },
    collider: {
      shape: 'box',
      size: { x: 0.8, y: 0.8, z: 0.8 }
    },
    defaultTransform: {
      position: { y: 0.4 }
    }
  },
  capsuleGuard: {
    id: 'capsuleGuard',
    render: {
      kind: 'primitive',
      shape: 'capsule',
      size: { radius: 0.25, height: 1.4 },
      material: {
        color: '#ff8822'
      }
    },
    collider: {
      shape: 'capsule',
      radius: 0.25,
      height: 1.4,
      axis: 'y'
    },
    defaultTransform: {
      position: { y: 0.7 }
    }
  },
  panelBlue: {
    id: 'panelBlue',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 1.0, y: 1.5 },
      material: {
        color: '#2a80ff',
        doubleSided: true,
        transparent: false
      }
    },
    collider: {
      shape: 'box',
      size: { x: 1.0, y: 1.5, z: 0.2 }
    },
    defaultTransform: {
      position: { y: 0.75 }
    }
  },
  cokeBottle: {
    id: 'cokeBottle',
    render: {
      kind: 'model',
      assetUrl: cokeModelUrl,
      scale: 0.45,
      pivotOffset: { y: 0 }
    },
    collider: {
      shape: 'capsule',
      radius: 0.18,
      height: 0.9,
      axis: 'y'
    },
    defaultTransform: {
      position: { y: 0.45 }
    }
  },
  cylinderBasic: {
    id: 'cylinderBasic',
    render: {
      kind: 'primitive',
      shape: 'cylinder',
      size: { radius: 0.35, height: 1.2 },
      material: {
        color: '#22aaff'
      }
    },
    collider: {
      shape: 'cylinder',
      radius: 0.35,
      height: 1.2,
      axis: 'y'
    },
    defaultTransform: {
      position: { y: 0.6 }
    }
  }
};

export function getObstacleBlueprint(id: string): ObstacleBlueprint | undefined {
  return OBSTACLE_BLUEPRINTS[id];
}
