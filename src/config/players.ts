export interface GoalkeeperConfig {
  width: number;
  height: number;
  depth: number;
  rotationRange: number;
}

export const GOALKEEPER_CONFIG: GoalkeeperConfig = {
  width: 0.6,    // 팔 벌린 폭 (양팔 포함)
  height: 1.8,   // 팔 올린 높이
  depth: 0.6,    // 앞뒤 두께
  rotationRange: Math.PI / 2
};

