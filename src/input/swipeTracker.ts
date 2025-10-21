import * as THREE from 'three';

export interface SwipePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeData {
  points: SwipePoint[];
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * 스와이프 입력을 추적하고 저장하는 클래스
 */
export class SwipeTracker {
  private isTracking = false;
  private currentSwipe: SwipePoint[] = [];
  private lastSwipe: SwipeData | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly maxPoints: number;

  private readonly handlePointerDownBound = (e: PointerEvent) => this.handlePointerDown(e);
  private readonly handlePointerMoveBound = (e: PointerEvent) => this.handlePointerMove(e);
  private readonly handlePointerUpBound = (e: PointerEvent) => this.handlePointerUp(e);
  private readonly handlePointerCancelBound = () => this.handlePointerCancel();

  constructor(canvas: HTMLCanvasElement, maxPoints = 10) {
    this.canvas = canvas;
    this.maxPoints = maxPoints;
    this.attachEventListeners();
  }

  private attachEventListeners() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.addEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.addEventListener('pointerup', this.handlePointerUpBound);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancelBound);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    this.isTracking = true;
    this.currentSwipe = [];

    const point = this.createPoint(e);
    this.currentSwipe.push(point);
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isTracking) return;
    e.preventDefault();

    const point = this.createPoint(e);
    this.currentSwipe.push(point);
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isTracking) return;
    e.preventDefault();

    const point = this.createPoint(e);
    this.currentSwipe.push(point);

    this.finalizeSwipe();
  }

  private handlePointerCancel() {
    this.isTracking = false;
    this.currentSwipe = [];
  }

  private createPoint(e: PointerEvent): SwipePoint {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      timestamp: performance.now()
    };
  }

  private finalizeSwipe() {
    this.isTracking = false;

    if (this.currentSwipe.length < 2) {
      this.currentSwipe = [];
      return;
    }

    // 스와이프 포인트를 균등하게 샘플링
    const sampledPoints = this.samplePoints(this.currentSwipe, this.maxPoints);

    const startTime = this.currentSwipe[0].timestamp;
    const endTime = this.currentSwipe[this.currentSwipe.length - 1].timestamp;

    this.lastSwipe = {
      points: sampledPoints,
      startTime,
      endTime,
      duration: endTime - startTime
    };

    console.log('Swipe captured:', {
      totalPoints: this.currentSwipe.length,
      sampledPoints: sampledPoints.length,
      points: sampledPoints
    });

    this.currentSwipe = [];
  }

  /**
   * 포인트를 균등하게 샘플링
   */
  private samplePoints(points: SwipePoint[], targetCount: number): SwipePoint[] {
    if (points.length <= targetCount) {
      return [...points];
    }

    const sampled: SwipePoint[] = [];
    const step = (points.length - 1) / (targetCount - 1);

    for (let i = 0; i < targetCount; i++) {
      const index = Math.round(i * step);
      sampled.push(points[index]);
    }

    return sampled;
  }

  /**
   * 마지막 스와이프 데이터를 가져옴
   */
  public getLastSwipe(): SwipeData | null {
    return this.lastSwipe;
  }

  /**
   * 마지막 스와이프 데이터를 3D 월드 좌표로 변환
   * @param camera 카메라
   * @param targetZ 목표 Z 좌표 (기본값: 0)
   */
  public getLastSwipeWorldPositions(camera: THREE.Camera, targetZ = 0): THREE.Vector3[] | null {
    if (!this.lastSwipe) return null;

    const worldPositions: THREE.Vector3[] = [];
    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    for (const point of this.lastSwipe.points) {
      // 화면 좌표를 NDC (Normalized Device Coordinates)로 변환
      const ndcX = (point.x / canvasWidth) * 2 - 1;
      const ndcY = -(point.y / canvasHeight) * 2 + 1;

      // NDC를 월드 좌표로 변환
      const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
      vector.unproject(camera);

      // 카메라에서 레이 방향 계산
      const cameraPosition = camera.position.clone();
      const direction = vector.sub(cameraPosition).normalize();

      // targetZ 평면과의 교점 계산
      const distance = (targetZ - cameraPosition.z) / direction.z;
      const worldPoint = cameraPosition.clone().add(direction.multiplyScalar(distance));

      worldPositions.push(worldPoint);
    }

    return worldPositions;
  }

  /**
   * 현재 추적 중인지 확인
   */
  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * 이벤트 리스너 제거
   */
  public destroy() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancelBound);
  }
}
