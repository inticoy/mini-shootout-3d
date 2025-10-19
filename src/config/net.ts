export interface GoalNetLayoutConfig {
  depthTop: number;
  depthBottom: number;
  sideInset: number;
  groundDrop: number;
}

export interface GoalNetSegments {
  height: number;
  width: number;
  depth: number;
}

export interface GoalNetVisualConfig {
  color: number;
  ropeRadius: number;
  radialSegments: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  anchorInset: number;
  includeShearRopes: boolean;
}

export interface GoalNetAnimationConfig {
  idleAmplitude: number;
  idleFrequency: number;
  idleFalloff: number;
  pulseAmplitude: number;
  pulseRadius: number;
  pulseDecay: number;
  pulseDamping: number;
}

export interface GoalNetConfig {
  layout: GoalNetLayoutConfig;
  segments: GoalNetSegments;
  visual: GoalNetVisualConfig;
  animation: GoalNetAnimationConfig;
}

export const GOAL_NET_CONFIG: GoalNetConfig = {
  layout: {
    depthTop: 0.65,
    depthBottom: 1.35,
    sideInset: 0.045,
    groundDrop: 0.12
  },
  segments: {
    height: 24,
    width: 30,
    depth: 14
  },
  visual: {
    color: 0xf6f8fb,
    ropeRadius: 0.005,
    radialSegments: 4,
    roughness: 0.52,
    metalness: 0.04,
    clearcoat: 0.12,
    clearcoatRoughness: 0.82,
    anchorInset: 0.012,
    includeShearRopes: false
  },
  animation: {
    idleAmplitude: 0.03,
    idleFrequency: 0.32,
    idleFalloff: 1.4,
    pulseAmplitude: 0.35,
    pulseRadius: 0.9,
    pulseDecay: 1.6,
    pulseDamping: 2.3
  }
};
