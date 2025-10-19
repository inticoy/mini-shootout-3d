export interface StrikeZoneConfig {
  clampRange: number;
  falloffSlope: number;
  guideOpacity: number;
}

export const STRIKE_ZONE_CONFIG: StrikeZoneConfig = {
  clampRange: 7.,
  falloffSlope: 0.8,
  guideOpacity: 0.72
};

