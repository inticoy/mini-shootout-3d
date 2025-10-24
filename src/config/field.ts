export interface FieldDimensionsConfig {
  planeWidth: number;
  planeHeight: number;
  defaultStripeWidth: number;
  lineMeshHeight: number;
  goalLineLength: number;
  goalLineThickness: number;
  penaltyBoxWidthPadding: number;
  penaltyBoxDepth: number;
  penaltyAreaWidthPadding: number;
  penaltyAreaDepth: number;
  penaltyMarkRadius: number;
  penaltyMarkSegments: number;
  penaltyArcRadius: number;
  penaltyArcTubeRadius: number;
  penaltyArcRadialSegments: number;
  penaltyArcTubularSegments: number;
}

export const FIELD_DIMENSIONS: FieldDimensionsConfig = {
  planeWidth: 60,
  planeHeight: 25,
  defaultStripeWidth: 3,
  lineMeshHeight: 0.01,
  goalLineLength: 100,
  goalLineThickness: 0.1,
  penaltyBoxWidthPadding: 3,
  penaltyBoxDepth: 3,
  penaltyAreaWidthPadding: 10,
  penaltyAreaDepth: 9,
  penaltyMarkRadius: 0.05,
  penaltyMarkSegments: 32,
  penaltyArcRadius: 2.2875,
  penaltyArcTubeRadius: 0.025,
  penaltyArcRadialSegments: 8,
  penaltyArcTubularSegments: 32
};

export interface FieldStripeConfig {
  color: number;
  opacity: number;
  depthWrite: boolean;
}

export const FIELD_STRIPES = {
  horizontal: {
    color: 0x2a5a1a,
    opacity: 0.25,
    depthWrite: true
  } satisfies FieldStripeConfig,
  vertical: {
    color: 0x2a5a1a,
    opacity: 0.08,
    depthWrite: false
  } satisfies FieldStripeConfig
};

export interface FieldOffsetsConfig {
  stripes: {
    horizontal: number;
    vertical: number;
  };
  lines: number;
  penaltyMark: number;
  penaltyArc: number;
}

export const FIELD_OFFSETS: FieldOffsetsConfig = {
  stripes: {
    horizontal: 0.01,
    vertical: 0.015
  },
  lines: 0.02,
  penaltyMark: 0.02,
  penaltyArc: 0.02
};

export const FIELD_TEXTURE_REPEAT = 25;
