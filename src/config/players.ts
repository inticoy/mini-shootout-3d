export interface GoalkeeperConfig {
  width: number;
  height: number;
  depth: number;
  rotationRange: number;
}

export const GOALKEEPER_CONFIG: GoalkeeperConfig = {
  width: 0.6,
  height: 1.8,
  depth: 0.6,
  rotationRange: Math.PI / 2
};

