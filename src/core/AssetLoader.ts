/**
 * AssetLoader - 에셋 로딩 관리 클래스
 *
 * Three.js와 오디오 에셋 로딩을 추적하고 진행률을 관리합니다:
 * - Three.js DefaultLoadingManager 이벤트 처리
 * - 오디오 로딩 진행률 추적
 * - 통합 로딩 진행률 계산 (Three.js 85% + Audio 15%)
 * - 로딩 완료 시 콜백 실행
 */

import * as THREE from 'three';
import type { LoadingScreen } from '../ui/loadingScreen';
import { CategoryLogger } from '../utils/Logger';

/**
 * AssetLoader 생성자 매개변수
 */
export interface AssetLoaderConfig {
  loadingScreen: LoadingScreen | null;
  gameLog: CategoryLogger;
  onAllAssetsLoaded: () => void;
}

/**
 * 에셋 로딩 관리 클래스
 */
export class AssetLoader {
  private readonly loadingScreen: LoadingScreen | null;
  private readonly gameLog: CategoryLogger;
  private readonly onAllAssetsLoaded: () => void;

  private threeAssetsProgress = 0;
  private audioProgress = 0;
  private threeItemsLoaded = 0;
  private threeItemsTotal = 0;
  private isGameReady = false;

  constructor(config: AssetLoaderConfig) {
    this.loadingScreen = config.loadingScreen;
    this.gameLog = config.gameLog;
    this.onAllAssetsLoaded = config.onAllAssetsLoaded;
  }

  /**
   * Three.js 에셋 로딩 추적 설정
   */
  public setupAssetLoadingTracker(): void {
    const manager = THREE.DefaultLoadingManager;
    manager.onStart = (_url, itemsLoaded, itemsTotal) => {
      this.updateThreeAssetProgress(itemsLoaded, itemsTotal);
    };
    manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      this.updateThreeAssetProgress(itemsLoaded, itemsTotal);
    };
    manager.onLoad = () => {
      this.threeItemsLoaded = this.threeItemsTotal;
      this.threeAssetsProgress = 1;
      this.updateLoadingProgress();
    };
    manager.onError = (url) => {
      this.gameLog.warn(`Failed to load visual asset: ${url}`);
      this.handleThreeAssetError();
    };
    this.updateLoadingProgress();
  }

  /**
   * Three.js 에셋 로딩 진행률 업데이트
   */
  private updateThreeAssetProgress(itemsLoaded: number, itemsTotal: number): void {
    if (itemsTotal > 0) {
      this.threeItemsTotal = Math.max(this.threeItemsTotal, itemsTotal);
      this.threeItemsLoaded = Math.max(this.threeItemsLoaded, itemsLoaded);
      this.threeAssetsProgress = Math.min(this.threeItemsLoaded / this.threeItemsTotal, 1);
    }
    this.updateLoadingProgress();
  }

  /**
   * Three.js 에셋 로딩 에러 처리
   */
  private handleThreeAssetError(): void {
    if (this.threeItemsTotal === 0) {
      this.threeItemsTotal = 1;
    }
    this.threeItemsLoaded = Math.min(this.threeItemsLoaded + 1, this.threeItemsTotal);
    this.threeAssetsProgress = Math.min(this.threeItemsLoaded / this.threeItemsTotal, 1);
    this.updateLoadingProgress();
  }

  /**
   * 통합 로딩 진행률 업데이트
   */
  private updateLoadingProgress(): void {
    const combined = Math.min(this.threeAssetsProgress * 0.85 + this.audioProgress * 0.15, 1);
    if (this.loadingScreen) {
      this.loadingScreen.setProgress(combined);
    }

    if (!this.isGameReady && this.threeAssetsProgress >= 1 && this.audioProgress >= 1) {
      this.handleAllAssetsLoaded();
    }
  }

  /**
   * 모든 에셋 로딩 완료 처리
   */
  private handleAllAssetsLoaded(): void {
    this.isGameReady = true;
    this.gameLog.info('All assets loaded, game ready!');
    this.onAllAssetsLoaded();
  }

  /**
   * 오디오 로딩 완료 설정
   */
  public setAudioLoaded(): void {
    this.audioProgress = 1;
    this.updateLoadingProgress();
  }

  /**
   * 게임 준비 상태 확인
   */
  public isReady(): boolean {
    return this.isGameReady;
  }
}
