export interface StandsConfig {
  // 삼각기둥 크기
  geometry: {
    width: number;      // 가로 너비 (관중석 폭)
    height: number;     // 세로 높이 (관중석 높이)
    depth: number;      // 깊이 (경사면 길이)
  };
  // 위치
  position: {
    y: number;          // 바닥으로부터 높이
    zOffset: number;    // 광고판으로부터의 거리
  };
  // 경사 각도 (일반 축구장 관중석 각도)
  angle: {
    degrees: number;    // 각도 (도)
  };
  // 재질
  material: {
    color: number;
    roughness: number;
    metalness: number;
  };
}

export const STANDS_CONFIG: StandsConfig = {
  geometry: {
    width: 80,           // 광고판과 비슷한 너비
    height: 20,          // 화면 꽉 찰 정도로 높게
    depth: 15            // 경사 깊이
  },
  position: {
    y: 0,
    zOffset: -2          // 광고판 뒤 2m
  },
  angle: {
    degrees: 25          // 더 완만한 관중석 각도
  },
  material: {
    color: 0x2a4858,     // 진한 청록색 (스타디움 좌석 느낌)
    roughness: 0.6,      // 조명 반사 잘 보이도록
    metalness: 0.05      // 약간의 금속성
  }
};
