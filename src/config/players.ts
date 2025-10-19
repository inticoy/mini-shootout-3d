export interface GoalkeeperConfig {
  width: number;
  height: number;
  depth: number;
  rotationRange: number;
}

export const GOALKEEPER_CONFIG: GoalkeeperConfig = {
  width: 0.1,
  height: 0.1,
  depth: 0.6,
  rotationRange: Math.PI / 2
};

