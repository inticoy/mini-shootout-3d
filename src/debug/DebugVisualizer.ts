/**
 * DebugVisualizer - 디버그 시각화 전용 클래스
 *
 * 게임의 모든 디버그 시각화를 관리합니다:
 * - 콜라이더 시각화 (공, 골대, 광고판)
 * - 궤적 예측 라인
 * - 타겟 마커
 * - 스와이프 디버그 라인/포인트
 * - 축 화살표 (공의 회전)
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { Ball } from '../entities/ball/Ball';
import type { Goal } from '../entities/goal/Goal';
import type { Obstacle } from '../entities/Obstacle';
import type { InputController } from '../input/InputController';
import type { ShotInfoHud } from '../ui/hud/ShotInfoHud';
import { BALL_RADIUS } from '../config/ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from '../config/goal';
import { GOAL_NET_CONFIG } from '../config/net';
import { AD_BOARD_CONFIG } from '../config/adBoard';
import { DEBUG_CONFIG } from '../config/debug';
import { COLORS } from '../config/colors';

/**
 * DebugVisualizer 생성자 매개변수
 */
export interface DebugVisualizerConfig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: CANNON.World;
  ball: Ball;
  goal: Goal;
  inputController: InputController;
  shotInfoHud: ShotInfoHud;
}

/**
 * 디버그 시각화 관리 클래스
 */
export class DebugVisualizer {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;
  private readonly ball: Ball;
  private readonly goal: Goal;
  private readonly inputController: InputController;
  private readonly shotInfoHud: ShotInfoHud;

  private debugMode = false;

  // 콜라이더 시각화
  private readonly ballColliderMesh: THREE.Mesh;
  private readonly goalColliderGroup: THREE.Group;
  private readonly adBoardColliderGroup: THREE.Group;

  // 궤적 예측 라인
  private readonly trajectoryGeometry: LineGeometry;
  private readonly trajectoryMaterial: LineMaterial;
  private readonly trajectoryLine: Line2;
  private readonly trajectoryPositions: Float32Array;

  // 타겟 마커
  private readonly targetMarker: THREE.Mesh;

  // 스와이프 디버그
  private readonly swipeDebugGeometry: LineGeometry;
  private readonly swipeDebugMaterial: LineMaterial;
  private readonly swipeDebugLine: Line2;
  private readonly swipePointMarkers: THREE.Sprite[] = [];
  private readonly swipePointLabels: HTMLDivElement[] = [];

  // 축 화살표
  private readonly axisArrows: THREE.ArrowHelper[];
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly tempAxisX = new THREE.Vector3();
  private readonly tempAxisY = new THREE.Vector3();
  private readonly tempAxisZ = new THREE.Vector3();

  constructor(config: DebugVisualizerConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    this.world = config.world;
    this.ball = config.ball;
    this.goal = config.goal;
    this.inputController = config.inputController;
    this.shotInfoHud = config.shotInfoHud;

    // 콜라이더 시각화 생성
    this.ballColliderMesh = this.createBallColliderMesh();
    this.goalColliderGroup = this.createGoalColliderGroup();
    this.adBoardColliderGroup = this.createAdBoardColliderGroup();
    this.axisArrows = this.createAxisArrows();

    // 궤적 예측 라인 생성
    this.trajectoryPositions = new Float32Array(DEBUG_CONFIG.trajectory.sampleCount * 3);
    this.trajectoryGeometry = new LineGeometry();
    this.trajectoryGeometry.setPositions(Array.from(this.trajectoryPositions));
    this.trajectoryMaterial = new LineMaterial({
      color: COLORS.debug.trajectory,
      linewidth: DEBUG_CONFIG.trajectory.lineWidth,
      transparent: true,
      opacity: DEBUG_CONFIG.trajectory.opacity,
      worldUnits: true
    });
    this.trajectoryMaterial.resolution.set(window.innerWidth, window.innerHeight);
    this.trajectoryMaterial.needsUpdate = true;
    this.trajectoryLine = new Line2(this.trajectoryGeometry, this.trajectoryMaterial);
    this.trajectoryLine.computeLineDistances();
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);

    // 스와이프 디버그 라인 생성
    this.swipeDebugGeometry = new LineGeometry();
    this.swipeDebugMaterial = new LineMaterial({
      color: COLORS.debug.swipeDebug,
      linewidth: DEBUG_CONFIG.swipeDebug.lineWidth,
      transparent: true,
      opacity: DEBUG_CONFIG.swipeDebug.opacity,
      worldUnits: true,
      depthTest: false,
      depthWrite: false
    });
    this.swipeDebugMaterial.resolution.set(window.innerWidth, window.innerHeight);
    this.swipeDebugLine = new Line2(this.swipeDebugGeometry, this.swipeDebugMaterial);
    this.swipeDebugLine.visible = false;
    this.swipeDebugLine.renderOrder = DEBUG_CONFIG.renderOrder.swipeDebugLine;
    this.scene.add(this.swipeDebugLine);

    // 스와이프 포인트 마커 생성 (5개)
    this.createSwipePointMarkers(5);

    // 타겟 마커 생성
    this.targetMarker = this.createTargetMarker();

    // 초기 visibility 적용
    this.applyDebugVisibility([]);
  }

  /**
   * 공 콜라이더 메시 생성
   */
  private createBallColliderMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.collider.ball,
      transparent: true,
      opacity: DEBUG_CONFIG.ballCollider.opacity,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.ballEdge });
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), edgeMaterial);
    mesh.add(wireframe);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * 골대 콜라이더 그룹 생성
   */
  private createGoalColliderGroup(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const colliderMaterial = new THREE.MeshBasicMaterial({ color: COLORS.collider.goal });
    colliderMaterial.transparent = true;
    colliderMaterial.opacity = DEBUG_CONFIG.goalCollider.opacity;
    colliderMaterial.depthTest = false;
    colliderMaterial.depthWrite = false;
    const colliderEdgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.goalEdge });

    const addBoxCollider = (geometry: THREE.BoxGeometry, position: THREE.Vector3) => {
      const mesh = new THREE.Mesh(geometry, colliderMaterial);
      mesh.position.copy(position);
      group.add(mesh);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), colliderEdgeMaterial);
      edges.position.copy(position);
      group.add(edges);
    };

    const postGeometry = new THREE.BoxGeometry(POST_RADIUS * 2, GOAL_HEIGHT, POST_RADIUS * 2);
    addBoxCollider(postGeometry, new THREE.Vector3(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH));
    addBoxCollider(postGeometry, new THREE.Vector3(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH));

    const rearSupportX = GOAL_WIDTH / 2;
    const rearSupportZ = GOAL_DEPTH - GOAL_NET_CONFIG.layout.depthBottom;
    addBoxCollider(postGeometry, new THREE.Vector3(-rearSupportX, GOAL_HEIGHT / 2, rearSupportZ));
    addBoxCollider(postGeometry, new THREE.Vector3(rearSupportX, GOAL_HEIGHT / 2, rearSupportZ));

    const floorThickness = POST_RADIUS * 2;
    const depthSpan = GOAL_NET_CONFIG.layout.depthBottom;
    const sideFloorGeometry = new THREE.BoxGeometry(POST_RADIUS * 2, floorThickness, depthSpan);
    addBoxCollider(sideFloorGeometry, new THREE.Vector3(-rearSupportX, POST_RADIUS, GOAL_DEPTH - depthSpan / 2));
    addBoxCollider(sideFloorGeometry, new THREE.Vector3(rearSupportX, POST_RADIUS, GOAL_DEPTH - depthSpan / 2));

    const backFloorGeometry = new THREE.BoxGeometry(rearSupportX * 2, floorThickness, POST_RADIUS * 2);
    addBoxCollider(backFloorGeometry, new THREE.Vector3(0, POST_RADIUS, rearSupportZ));

    addBoxCollider(sideFloorGeometry, new THREE.Vector3(-rearSupportX, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2));
    addBoxCollider(sideFloorGeometry, new THREE.Vector3(rearSupportX, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2));

    const crossbarGeometry = new THREE.BoxGeometry(GOAL_WIDTH, POST_RADIUS * 2, POST_RADIUS * 2);
    addBoxCollider(crossbarGeometry, new THREE.Vector3(0, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH));

    const sensorWidth = Math.max(GOAL_WIDTH - POST_RADIUS * 2, 0.1);
    const sensorHeight = Math.max(GOAL_HEIGHT - POST_RADIUS * 1.8, 0.1);
    const sensorDepth = BALL_RADIUS * 0.6;
    const sensorGeometry = new THREE.BoxGeometry(sensorWidth, sensorHeight, sensorDepth);
    const sensorMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.collider.sensorFace,
      transparent: true,
      opacity: DEBUG_CONFIG.sensorFace.opacity,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const sensorFace = new THREE.Mesh(sensorGeometry, sensorMaterial);
    const sensorZ = GOAL_DEPTH - (BALL_RADIUS + sensorDepth * 0.5);
    sensorFace.position.set(0, sensorHeight / 2, sensorZ);
    group.add(sensorFace);

    const sensorEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(sensorGeometry),
      new THREE.LineBasicMaterial({ color: COLORS.collider.sensorEdge })
    );
    sensorEdges.position.copy(sensorFace.position);
    group.add(sensorEdges);

    const netInfos = this.goal.getNetColliderInfos();
    const netFaceMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.collider.net,
      transparent: true,
      opacity: DEBUG_CONFIG.netCollider.opacity,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const netEdgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.netEdge });

    netInfos.forEach(({ size, position }) => {
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const faceMesh = new THREE.Mesh(geometry, netFaceMaterial);
      faceMesh.position.copy(position);
      group.add(faceMesh);

      const edgeMesh = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), netEdgeMaterial);
      edgeMesh.position.copy(position);
      group.add(edgeMesh);
    });

    this.scene.add(group);
    return group;
  }

  /**
   * 광고판 콜라이더 그룹 생성
   */
  private createAdBoardColliderGroup(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const outlineMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.adBoardEdge });
    const faceMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.collider.adBoard,
      transparent: true,
      opacity: DEBUG_CONFIG.adBoardCollider.opacity,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });

    const size = AD_BOARD_CONFIG.size;
    const adGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);

    const face = new THREE.Mesh(adGeometry, faceMaterial);
    const adDepth = GOAL_DEPTH + AD_BOARD_CONFIG.position.depthOffset;
    face.position.set(
      AD_BOARD_CONFIG.position.x,
      AD_BOARD_CONFIG.position.y,
      adDepth
    );
    group.add(face);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(adGeometry),
      outlineMaterial
    );
    edges.position.copy(face.position);
    group.add(edges);

    this.scene.add(group);
    return group;
  }

  /**
   * 축 화살표 생성 (공의 회전축 시각화)
   */
  private createAxisArrows(): THREE.ArrowHelper[] {
    const origin = new THREE.Vector3(0, 0, 0);
    const length = DEBUG_CONFIG.axisArrows.length;
    const headLength = DEBUG_CONFIG.axisArrows.headLength;
    const headWidth = DEBUG_CONFIG.axisArrows.headWidth;

    const createArrow = (direction: THREE.Vector3, color: number) => {
      const arrow = new THREE.ArrowHelper(direction.clone(), origin, length, color, headLength, headWidth);
      arrow.visible = this.debugMode;
      this.scene.add(arrow);
      return arrow;
    };

    const arrows = [
      createArrow(new THREE.Vector3(1, 0, 0), COLORS.axisArrows.x),
      createArrow(new THREE.Vector3(0, 1, 0), COLORS.axisArrows.y),
      createArrow(new THREE.Vector3(0, 0, 1), COLORS.axisArrows.z)
    ];
    return arrows;
  }

  /**
   * 타겟 마커 생성 (반투명 빨간 공)
   */
  private createTargetMarker(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(
      DEBUG_CONFIG.targetMarker.radius,
      DEBUG_CONFIG.targetMarker.segments,
      DEBUG_CONFIG.targetMarker.segments
    );
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.debug.targetMarker,
      transparent: true,
      opacity: DEBUG_CONFIG.targetMarker.opacity,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * 스와이프 포인트 마커 생성
   */
  private createSwipePointMarkers(count: number): void {
    for (let i = 0; i < count; i++) {
      // 3D 스프라이트 마커 (원형)
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // 원 그리기
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fill();

      // 테두리
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.stroke();

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(DEBUG_CONFIG.swipePointMarker.scale, DEBUG_CONFIG.swipePointMarker.scale, 1);
      sprite.visible = false;
      sprite.renderOrder = DEBUG_CONFIG.swipePointMarker.renderOrder;
      this.scene.add(sprite);
      this.swipePointMarkers.push(sprite);

      // HTML 레이블 (번호)
      const label = document.createElement('div');
      label.textContent = (i + 1).toString();
      label.style.position = 'fixed';
      label.style.color = DEBUG_CONFIG.swipePointMarker.labelColor;
      label.style.fontSize = DEBUG_CONFIG.swipePointMarker.labelFontSize;
      label.style.fontWeight = 'bold';
      label.style.fontFamily = 'Arial, sans-serif';
      label.style.textShadow = '0 0 3px #ffff00, 0 0 6px #ffff00';
      label.style.pointerEvents = 'none';
      label.style.display = 'none';
      label.style.zIndex = '5';
      label.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(label);
      this.swipePointLabels.push(label);
    }
  }

  /**
   * 디버그 모드 토글
   */
  public toggleDebugMode(enabled?: boolean): boolean {
    const next = enabled ?? !this.debugMode;
    if (this.debugMode === next) {
      return this.debugMode;
    }

    this.debugMode = next;
    return this.debugMode;
  }

  /**
   * 디버그 가시성 적용
   */
  public applyDebugVisibility(obstacles: Obstacle[]): void {
    const visible = this.debugMode;
    obstacles.forEach((obstacle) => obstacle.setColliderDebugVisible(visible));
    this.ballColliderMesh.visible = visible;
    this.goalColliderGroup.visible = visible;
    this.adBoardColliderGroup.visible = visible;
    this.trajectoryLine.visible = visible;
    this.shotInfoHud.setVisible(visible);
    this.targetMarker.visible = visible && this.targetMarker.visible; // visible 상태 유지하되 debugMode에 따라
    const hasSwipe = this.inputController.getLastSwipe() !== null;
    this.swipeDebugLine.visible = visible && hasSwipe;
    this.swipePointMarkers.forEach((marker) => {
      marker.visible = visible && hasSwipe;
    });
    this.swipePointLabels.forEach((label) => {
      label.style.display = visible && hasSwipe ? 'block' : 'none';
    });
    this.axisArrows.forEach((arrow) => {
      arrow.visible = visible;
    });
  }

  /**
   * 콜라이더 시각화 업데이트 (매 프레임)
   */
  public updateColliderVisuals(): void {
    if (!this.debugMode) {
      return;
    }
    this.ballColliderMesh.position.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    this.updateTrajectoryLine();
    this.updateAxisArrows();
  }

  /**
   * 궤적 예측 라인 업데이트
   */
  private updateTrajectoryLine(): void {
    const positions = this.trajectoryPositions;
    const basePosition = this.ball.body.position;
    const velocity = this.ball.body.velocity;
    const gravity = this.world.gravity;
    const sampleStep = DEBUG_CONFIG.trajectory.sampleStep;
    const sampleCount = DEBUG_CONFIG.trajectory.sampleCount;

    for (let i = 0; i < sampleCount; i++) {
      const t = i * sampleStep;
      const idx = i * 3;
      const x = basePosition.x + velocity.x * t + 0.5 * gravity.x * t * t;
      const y = basePosition.y + velocity.y * t + 0.5 * gravity.y * t * t;
      const z = basePosition.z + velocity.z * t + 0.5 * gravity.z * t * t;
      positions[idx] = x;
      positions[idx + 1] = Math.max(y, BALL_RADIUS);
      positions[idx + 2] = z;
    }

    this.trajectoryGeometry.setPositions(Array.from(this.trajectoryPositions));
    this.trajectoryLine.computeLineDistances();
    this.trajectoryGeometry.computeBoundingSphere();
  }

  /**
   * 축 화살표 업데이트 (공의 회전)
   */
  private updateAxisArrows(): void {
    const { position, quaternion } = this.ball.body;
    this.axisArrows.forEach((arrow) => {
      arrow.position.set(position.x, position.y, position.z);
    });

    this.tempQuaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

    this.tempAxisX.set(1, 0, 0).applyQuaternion(this.tempQuaternion);
    this.tempAxisY.set(0, 1, 0).applyQuaternion(this.tempQuaternion);
    this.tempAxisZ.set(0, 0, 1).applyQuaternion(this.tempQuaternion);

    this.axisArrows[0].setDirection(this.tempAxisX.normalize());
    this.axisArrows[1].setDirection(this.tempAxisY.normalize());
    this.axisArrows[2].setDirection(this.tempAxisZ.normalize());
  }

  /**
   * 스와이프 디버그 라인 업데이트
   */
  public updateSwipeDebugLine(): void {
    if (!this.debugMode) {
      return;
    }

    const lastSwipe = this.inputController.getLastSwipe();
    if (!lastSwipe) {
      this.swipeDebugLine.visible = false;
      this.swipePointMarkers.forEach((marker) => {
        marker.visible = false;
      });
      this.swipePointLabels.forEach((label) => {
        label.style.display = 'none';
      });
      return;
    }

    // 스와이프 포인트를 월드 좌표로 변환 (공의 초기 위치 Z 좌표 사용)
    const worldPositions = this.inputController.getLastSwipeWorldPositions(this.camera, 0);

    if (!worldPositions || worldPositions.length < 2) {
      this.swipeDebugLine.visible = false;
      this.swipePointMarkers.forEach((marker) => {
        marker.visible = false;
      });
      this.swipePointLabels.forEach((label) => {
        label.style.display = 'none';
      });
      return;
    }

    // Float32Array로 변환
    const positions: number[] = [];
    for (const pos of worldPositions) {
      positions.push(pos.x, pos.y, pos.z);
    }

    this.swipeDebugGeometry.setPositions(positions);
    this.swipeDebugLine.computeLineDistances();
    this.swipeDebugGeometry.computeBoundingSphere();
    this.swipeDebugLine.visible = true;

    // 포인트 마커 업데이트
    const tempVector = new THREE.Vector3();
    worldPositions.forEach((pos, i) => {
      if (i < this.swipePointMarkers.length) {
        // 3D 마커 위치
        this.swipePointMarkers[i].position.copy(pos);
        this.swipePointMarkers[i].visible = true;

        // 2D 레이블 위치 (화면 좌표로 변환)
        tempVector.copy(pos);
        tempVector.project(this.camera);

        const x = (tempVector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (tempVector.y * -0.5 + 0.5) * window.innerHeight;

        this.swipePointLabels[i].style.left = `${x}px`;
        this.swipePointLabels[i].style.top = `${y}px`;
        this.swipePointLabels[i].style.display = 'block';
      }
    });

    // 남은 마커 숨기기
    for (let i = worldPositions.length; i < this.swipePointMarkers.length; i++) {
      this.swipePointMarkers[i].visible = false;
      this.swipePointLabels[i].style.display = 'none';
    }
  }

  /**
   * 타겟 마커 위치 설정 (슛 실행 시)
   */
  public setTargetMarkerPosition(position: THREE.Vector3): void {
    this.targetMarker.position.copy(position);
    this.targetMarker.visible = this.debugMode;
  }

  /**
   * 타겟 마커 숨김
   */
  public hideTargetMarker(): void {
    this.targetMarker.visible = false;
  }

  /**
   * 리사이즈 처리
   */
  public handleResize(width: number, height: number): void {
    this.trajectoryMaterial.resolution.set(width, height);
    this.swipeDebugMaterial.resolution.set(width, height);
  }

  /**
   * 디버그 모드 상태 가져오기
   */
  public isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * 리소스 정리
   */
  public dispose(): void {
    // Scene에서 제거
    this.scene.remove(this.ballColliderMesh);
    this.scene.remove(this.goalColliderGroup);
    this.scene.remove(this.adBoardColliderGroup);
    this.scene.remove(this.trajectoryLine);
    this.scene.remove(this.swipeDebugLine);
    this.scene.remove(this.targetMarker);
    this.axisArrows.forEach((arrow) => this.scene.remove(arrow));
    this.swipePointMarkers.forEach((marker) => this.scene.remove(marker));

    // HTML 레이블 제거
    this.swipePointLabels.forEach((label) => label.remove());

    // Geometry/Material 정리
    this.ballColliderMesh.geometry.dispose();
    (this.ballColliderMesh.material as THREE.Material).dispose();
    this.goalColliderGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.adBoardColliderGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.trajectoryGeometry.dispose();
    this.trajectoryMaterial.dispose();
    this.swipeDebugGeometry.dispose();
    this.swipeDebugMaterial.dispose();
    this.targetMarker.geometry.dispose();
    (this.targetMarker.material as THREE.Material).dispose();
    this.swipePointMarkers.forEach((sprite) => {
      sprite.geometry.dispose();
      sprite.material.dispose();
    });
  }
}
