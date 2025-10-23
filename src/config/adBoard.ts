export type AdTextItem = {
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
};

export type AdItem = AdTextItem;

export interface AdBoardConfig {
  size: {
    width: number;
    height: number;
    depth: number;
  };
  position: {
    x: number;
    y: number;
    depthOffset: number;
  };
  material: {
    roughness: number;
    metalness: number;
    emissive: number;
    emissiveIntensity: number;
  };
  scrollSpeed: number;
  canvas: {
    width: number;
    height: number;
  };
  display: {
    repeatX: number;
    repeatY: number;
  };
  adSets: {
    default: readonly AdItem[];
    goal: readonly AdItem[];
    record: readonly AdItem[];
  };
}

export const AD_BOARD_CONFIG: AdBoardConfig = {
  size: {
    width: 40,
    height: 1.2,
    depth: 0.5
  },
  position: {
    x: 0,
    y: 0.5,
    depthOffset: -6
  },
  material: {
    roughness: 0.,
    metalness: 0.,
    emissive: 0xffffff,
    emissiveIntensity: 0.
  },
  scrollSpeed: 0.05,
  canvas: {
    width: 1024,
    height: 192
  },
  display: {
    repeatX: 2,
    repeatY: 1
  },
  adSets: {
    // 기본 광고 세트 (일반 게임 중)
    default: [
      {
        text: 'SANSUNGBI',
        backgroundColor: '#0073ffff',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
	  {
        text: 'STOPBUSS',
        backgroundColor: '#059a00ff',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: 'Booger Queen',
        backgroundColor: '#ffc400ff',
        textColor: '#ff0000ff',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: 'Coloc Coloc',
        backgroundColor: '#ff0000ff',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      }
    ] as const,
    // 골 넣었을 때 광고 세트
    goal: [
      {
        text: 'GOAL!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: '골!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
       {
        text: 'GOAL!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: '골!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
    ] as const,
	// 최고기록 경신 광고 세트
	record: [
      {
        text: 'HIGH!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: 'SCORE!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
       {
        text: '최고!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: '기록!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
    ] as const
  }
};

