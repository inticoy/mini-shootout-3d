/**
 * InputController - 입력 통합 관리
 *
 * SwipeTracker를 래핑하고 게임 입력을 중앙에서 관리합니다.
 * - 터치/마우스 입력 통합
 * - 입력 상태 관리
 * - 스와이프 데이터 처리
 */

import * as THREE from 'three';
import { SwipeTracker, type SwipeData } from './swipeTracker';

/**
 * 슈팅 콜백 파라미터
 */
export interface ShootParams {
  swipeData: SwipeData;
  worldPositions: THREE.Vector3[] | null;
}

/**
 * InputController 콜백
 */
export interface InputControllerCallbacks {
  onShoot?: (params: ShootParams) => void;
}

/**
 * 입력 컨트롤러
 */
export class InputController {
  private readonly swipeTracker: SwipeTracker;
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.PerspectiveCamera;
  private callbacks: InputControllerCallbacks = {};

  private isEnabled = true;

  private readonly handleCanvasPointerUpBound = (e: PointerEvent) => this.handleCanvasPointerUp(e);

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    callbacks: InputControllerCallbacks = {}
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.callbacks = callbacks;

    // SwipeTracker 생성
    this.swipeTracker = new SwipeTracker(canvas, 10);

    // Canvas pointerup 이벤트 리스너 추가
    this.attachEventListeners();
  }

  /**
   * 이벤트 리스너 등록
   */
  private attachEventListeners(): void {
    this.canvas.addEventListener('pointerup', this.handleCanvasPointerUpBound);
  }

  /**
   * Canvas pointerup 핸들러
   */
  private handleCanvasPointerUp(e: PointerEvent): void {
    if (!this.isEnabled) {
      console.log('❌ InputController: 입력 비활성화 상태');
      return;
    }

    console.log('⚽ InputController handleCanvasPointerUp', {
      target: e.target,
      targetTag: (e.target as HTMLElement).tagName,
      isCanvas: e.target === this.canvas,
      composedPath: e.composedPath().map((el) => (el as HTMLElement).tagName || el)
    });

    // Canvas가 아닌 요소에서 발생한 이벤트는 무시
    if (e.target !== this.canvas) {
      console.log('❌ Canvas가 아닌 요소에서 이벤트 발생, 무시');
      return;
    }

    const swipeData = this.swipeTracker.getLastSwipe();
    if (!swipeData || swipeData.points.length < 2) {
      console.log('❌ 유효한 스와이프 없음');
      return;
    }

    // 월드 좌표 계산
    const worldPositions = this.swipeTracker.getLastSwipeWorldPositions(this.camera, 0);

    console.log('✅ 유효한 슈팅 입력 감지');

    // 슈팅 콜백 호출
    this.callbacks.onShoot?.({
      swipeData,
      worldPositions
    });
  }

  /**
   * 입력 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 입력 활성화 여부
   */
  isInputEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 마지막 스와이프 데이터 가져오기
   */
  getLastSwipe(): SwipeData | null {
    return this.swipeTracker.getLastSwipe();
  }

  /**
   * 마지막 스와이프 월드 좌표 가져오기
   */
  getLastSwipeWorldPositions(camera: THREE.PerspectiveCamera, z: number): THREE.Vector3[] | null {
    return this.swipeTracker.getLastSwipeWorldPositions(camera, z);
  }

  /**
   * 콜백 업데이트
   */
  setCallbacks(callbacks: InputControllerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 정리
   */
  destroy(): void {
    this.canvas.removeEventListener('pointerup', this.handleCanvasPointerUpBound);
    this.swipeTracker.destroy();
  }
}
