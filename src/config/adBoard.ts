import adTexture1Url from '../assets/ad/burger_queen.png?url';
import adTexture2Url from '../assets/ad/coloc_coloc.png?url';
import adTexture3Url from '../assets/ad/sansung.png?url';
import adTexture4Url from '../assets/ad/star_cups.png?url';

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
  textures: readonly string[];
}

export const AD_BOARD_CONFIG: AdBoardConfig = {
  size: {
    width: 80,
    height: 1.2,
    depth: 0.3
  },
  position: {
    x: 0,
    y: 0.65,
    depthOffset: -6
  },
  material: {
    roughness: 0.45,
    metalness: 0.1,
    emissive: 0x333333,
    emissiveIntensity: 0.6
  },
  scrollSpeed: 0.05,
  textures: [adTexture1Url, adTexture2Url, adTexture3Url, adTexture4Url] as const
};

