import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createRenderer } from './core/graphics';
import { createPerspectiveCamera } from './core/camera';
import { configureSceneLighting } from './core/lighting';
import { createPhysicsWorld } from './physics/world';
import { createField } from './environment/field';
import type { Field } from './environment/field';
import { Ball } from './entities/ball';
import { Goal } from './entities/goal';
import { GoalKeeper3D } from './entities/goalkeeper3d';
import { BALL_RADIUS, BALL_START_POSITION } from './config/ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from './config/goal';
import { GOAL_NET_CONFIG } from './config/net';
import { AD_BOARD_CONFIG } from './config/adBoard';
// import { GoalKeeper } from './entities/goalkeeper'; // 기존 2D 골키퍼
// import { GoalKeeper3D as GoalKeeper } from './entities/goalkeeper3d'; // FBX 모델 골키퍼
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { createDebugButton, updateDebugButtonState } from './ui/debugHud';
import { ShotInfoHud } from './ui/shotInfoHud';
import { AudioManager } from './core/audio';
import { LoadingScreen } from './ui/loadingScreen';
import { SwipeTracker } from './input/swipeTracker';
import { normalizeSwipeData, debugNormalizedSwipe } from './shooting/swipeNormalizer';
import { analyzeShotType, debugShotAnalysis, ShotType } from './shooting/shotAnalyzer';
import { calculateShotParameters, debugShotParameters } from './shooting/shotParameters';
import { calculateInitialVelocity, debugVelocity } from './shooting/velocityCalculator';
import { calculateAngularVelocity, debugAngularVelocity } from './shooting/spinCalculator';
import { CurveForceSystem } from './shooting/curveForceSystem';

const MIN_VERTICAL_BOUNCE_SPEED = 0.45;
const BOUNCE_COOLDOWN_MS = 120;

export class MiniShootout3D {
  private readonly onScoreChange: (score: number) => void;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly goal: Goal;
  private readonly goalKeeper: GoalKeeper3D;
  private readonly field: Field;
  private readonly audio = new AudioManager();
  private readonly ballColliderMesh: THREE.Mesh;
  private readonly goalColliderGroup: THREE.Group;
  private readonly adBoardColliderGroup: THREE.Group;
  private readonly axisArrows: THREE.ArrowHelper[];
  private readonly trajectoryGeometry: LineGeometry;
  private readonly trajectoryMaterial: LineMaterial;
  private readonly trajectoryLine: Line2;
  private readonly trajectoryPositions: Float32Array;
  private readonly trajectorySampleStep = 0.05;
  private readonly trajectorySampleCount = 60;
  private readonly swipeTracker: SwipeTracker;
  private readonly curveForceSystem = new CurveForceSystem();
  private readonly shotInfoHud = new ShotInfoHud();
  private readonly targetMarker: THREE.Mesh;
  private readonly swipeDebugGeometry: LineGeometry;
  private readonly swipeDebugMaterial: LineMaterial;
  private readonly swipeDebugLine: Line2;
  private readonly swipePointMarkers: THREE.Sprite[] = [];
  private readonly swipePointLabels: HTMLDivElement[] = [];
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly tempAxisX = new THREE.Vector3();
  private readonly tempAxisY = new THREE.Vector3();
  private readonly tempAxisZ = new THREE.Vector3();
  private readonly tempBallPosition = new THREE.Vector3();
  private lastBounceSoundTime = 0;
  private score = 0;
  private readonly debugButton: HTMLButtonElement;
  private debugMode = false;
  private isShotInProgress = false;
  private shotResetTimer: number | null = null;
  private hasScored = false;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handleBallCollideBound = (event: { body: CANNON.Body }) => this.handleBallCollide(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);
  private readonly handleDebugButtonClickBound = () => this.toggleDebugMode();
  private readonly handleCanvasPointerUpBound = () => this.handleCanvasPointerUp();
  private loadingScreen: LoadingScreen | null = null;
  private threeAssetsProgress = 0;
  private audioProgress = 0;
  private threeItemsLoaded = 0;
  private threeItemsTotal = 0;
  private isGameReady = false;

  constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
    this.onScoreChange = onScoreChange;

    // 로딩 화면 생성 및 표시
    this.loadingScreen = new LoadingScreen();
    this.loadingScreen.show();
    this.loadingScreen.setProgress(0);
    this.setupAssetLoadingTracker();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // 실제 하늘색 (Sky Blue)
    this.renderer = createRenderer(canvas);
    this.camera = createPerspectiveCamera();
    configureSceneLighting(this.scene);

    const { world, materials } = createPhysicsWorld();
    this.world = world;

    this.field = createField(this.scene, this.world, materials.ground, {
      goalDepth: GOAL_DEPTH
    });

    this.ball = new Ball(this.world, materials.ball);
    this.ball.body.addEventListener('collide', this.handleBallCollideBound);

    void this.ball.load(this.scene, THREE.DefaultLoadingManager).catch((error) => {
      console.error('Failed to load ball model', error);
    });

    this.goal = new Goal(this.scene, this.world, materials.ball);
    this.goal.setNetAnimationEnabled(true);
    this.goal.bodies.sensor.addEventListener('collide', this.handleGoalCollisionBound);

    this.goalKeeper = new GoalKeeper3D(this.scene, this.world, GOAL_DEPTH + 0.8, this.ball.body);
    this.goalKeeper.setColliderDebugVisible(this.debugMode);

    void this.audio.loadAll().then(() => {
      this.audioProgress = 1;
      this.updateLoadingProgress();
    }).catch((error) => {
      console.warn('Failed to preload audio', error);
      this.audioProgress = 1;
      this.updateLoadingProgress();
    });

    this.ballColliderMesh = this.createBallColliderMesh();
    this.goalColliderGroup = this.createGoalColliderGroup();
    this.adBoardColliderGroup = this.createAdBoardColliderGroup();
    this.axisArrows = this.createAxisArrows();
    this.trajectoryPositions = new Float32Array(this.trajectorySampleCount * 3);
    this.trajectoryGeometry = new LineGeometry();
    this.trajectoryGeometry.setPositions(Array.from(this.trajectoryPositions));
    this.trajectoryMaterial = new LineMaterial({
      color: 0x00aaff,
      linewidth: 0.045,
      transparent: true,
      opacity: 0.95,
      worldUnits: true
    });
    this.trajectoryMaterial.resolution.set(window.innerWidth, window.innerHeight);
    this.trajectoryMaterial.needsUpdate = true;
    this.trajectoryLine = new Line2(this.trajectoryGeometry, this.trajectoryMaterial);
    this.trajectoryLine.computeLineDistances();
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);

    // 스와이프 트래커 초기화
    this.swipeTracker = new SwipeTracker(canvas, 5);

    // 스와이프 디버그 라인 초기화
    this.swipeDebugGeometry = new LineGeometry();
    this.swipeDebugMaterial = new LineMaterial({
      color: 0xffff00,
      linewidth: 0.06,
      transparent: true,
      opacity: 0.9,
      worldUnits: true,
      depthTest: false,
      depthWrite: false
    });
    this.swipeDebugMaterial.resolution.set(window.innerWidth, window.innerHeight);
    this.swipeDebugLine = new Line2(this.swipeDebugGeometry, this.swipeDebugMaterial);
    this.swipeDebugLine.visible = false;
    this.swipeDebugLine.renderOrder = 999;
    this.scene.add(this.swipeDebugLine);

    // 스와이프 포인트 마커 초기화 (5개)
    this.createSwipePointMarkers(5);

    // 타겟 마커 초기화
    this.targetMarker = this.createTargetMarker();

    this.debugButton = createDebugButton(this.handleDebugButtonClickBound);
    this.applyDebugVisibility();
    updateDebugButtonState(this.debugButton, this.debugMode);

    this.attachEventListeners();
    this.animate();
  }

  private setupAssetLoadingTracker() {
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
      console.warn(`Failed to load visual asset: ${url}`);
      this.handleThreeAssetError();
    };
    this.updateLoadingProgress();
  }

  private updateThreeAssetProgress(itemsLoaded: number, itemsTotal: number) {
    if (itemsTotal > 0) {
      this.threeItemsTotal = Math.max(this.threeItemsTotal, itemsTotal);
      this.threeItemsLoaded = Math.max(this.threeItemsLoaded, itemsLoaded);
      this.threeAssetsProgress = Math.min(this.threeItemsLoaded / this.threeItemsTotal, 1);
    }
    this.updateLoadingProgress();
  }

  private handleThreeAssetError() {
    if (this.threeItemsTotal === 0) {
      this.threeItemsTotal = 1;
    }
    this.threeItemsLoaded = Math.min(this.threeItemsLoaded + 1, this.threeItemsTotal);
    this.threeAssetsProgress = Math.min(this.threeItemsLoaded / this.threeItemsTotal, 1);
    this.updateLoadingProgress();
  }

  private updateLoadingProgress() {
    const combined = Math.min(this.threeAssetsProgress * 0.85 + this.audioProgress * 0.15, 1);
    if (this.loadingScreen) {
      this.loadingScreen.setProgress(combined);
    }

    if (!this.isGameReady && this.threeAssetsProgress >= 1 && this.audioProgress >= 1) {
      this.onAllAssetsLoaded();
    }
  }

  private onAllAssetsLoaded() {
    this.isGameReady = true;
    console.log('All assets loaded, game ready!');

    // 로딩 화면을 잠시 후 숨김 (부드러운 전환을 위해)
    setTimeout(() => {
      if (this.loadingScreen) {
        this.loadingScreen.hide();
      }
    }, 500);
  }

  private handleGoalCollision(event: { body: CANNON.Body }) {
    if (event.body !== this.ball.body) return;
    if (!this.isShotInProgress) return; // 슈팅 중이 아니면 무시
    if (this.hasScored) return; // 이미 골 처리했으면 무시 (중복 방지)

    console.log('⚽ GOAL! Score:', this.score + 1);

    this.score += 1;
    this.onScoreChange(this.score);
    this.hasScored = true;
    this.goalKeeper.stopTracking();
    this.tempBallPosition.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    this.goal.triggerNetPulse(this.tempBallPosition, 1);
    this.audio.play('goal', { volume: 1 });
  }

  private handleBallCollide(event: { body: CANNON.Body }) {
    if (event.body === this.field.groundBody) {
      const now = performance.now();
      if (now - this.lastBounceSoundTime < BOUNCE_COOLDOWN_MS) return;
      const vy = Math.abs(this.ball.body.velocity.y);
      if (vy < MIN_VERTICAL_BOUNCE_SPEED) return;
      this.lastBounceSoundTime = now;
      const volume = THREE.MathUtils.clamp(vy / 6 + 0.15, 0.1, 1);
      this.audio.play('bounce', { volume });
    } else if (event.body === this.goalKeeper.body) {
      this.audio.play('save', { volume: 0.7 });
    } else if (
      event.body === this.goal.bodies.leftPost ||
      event.body === this.goal.bodies.rightPost ||
      event.body === this.goal.bodies.rearLeftPost ||
      event.body === this.goal.bodies.rearRightPost ||
      event.body === this.goal.bodies.topLeftBar ||
      event.body === this.goal.bodies.topRightBar ||
      event.body === this.goal.bodies.floorLeft ||
      event.body === this.goal.bodies.floorRight ||
      event.body === this.goal.bodies.floorBack ||
      event.body === this.goal.bodies.crossbar
    ) {
      this.audio.play('post', { volume: 0.9 });
    } else if (this.goal.isNetCollider(event.body)) {
      this.goal.handleNetCollision(this.ball.body);
      this.audio.play('net', { volume: 0.6 });
    }
  }

  private attachEventListeners() {
    window.addEventListener('resize', this.handleResizeBound);
    // 캔버스에서 pointerup 이벤트 감지 (스와이프 완료 시 정규화 테스트)
    this.renderer.domElement.addEventListener('pointerup', this.handleCanvasPointerUpBound);
  }

  private handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.trajectoryMaterial.resolution.set(window.innerWidth, window.innerHeight);
    this.swipeDebugMaterial.resolution.set(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.world.step(1 / 60, deltaTime, 3);
    this.curveForceSystem.update(deltaTime, this.ball.body);
    this.goalKeeper.update(deltaTime);
    this.goal.update(deltaTime);
    this.field.update(deltaTime);

    this.ball.syncVisuals();
    this.updateColliderVisuals();
    this.updateSwipeDebugLine();

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.shotResetTimer !== null) {
      clearTimeout(this.shotResetTimer);
    }
    window.removeEventListener('resize', this.handleResizeBound);
    this.renderer.domElement.removeEventListener('pointerup', this.handleCanvasPointerUpBound);
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
    this.ball.body.removeEventListener('collide', this.handleBallCollideBound);
    this.scene.remove(this.goalColliderGroup);
    this.scene.remove(this.adBoardColliderGroup);
    this.scene.remove(this.swipeDebugLine);
    this.scene.remove(this.targetMarker);
    this.swipePointMarkers.forEach((marker) => this.scene.remove(marker));
    this.swipePointLabels.forEach((label) => label.remove());
    this.axisArrows.forEach((arrow) => this.scene.remove(arrow));
    this.debugButton.removeEventListener('click', this.handleDebugButtonClickBound);
    this.debugButton.remove();
    this.shotInfoHud.destroy();
    this.goalKeeper.setColliderDebugVisible(false);
    this.swipeTracker.destroy();
  }

  private createBallColliderMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffc6,
      transparent: true,
      opacity: 0.45,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00ffc6 });
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), edgeMaterial);
    mesh.add(wireframe);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  private createGoalColliderGroup(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const colliderMaterial = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    colliderMaterial.transparent = true;
    colliderMaterial.opacity = 0.55;
    colliderMaterial.depthTest = false;
    colliderMaterial.depthWrite = false;
    const colliderEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xff5500 });

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
      color: 0x00e0ff,
      transparent: true,
      opacity: 0.2,
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
      new THREE.LineBasicMaterial({ color: 0x00e0ff })
    );
    sensorEdges.position.copy(sensorFace.position);
    group.add(sensorEdges);

    const netInfos = this.goal.getNetColliderInfos();
    const netFaceMaterial = new THREE.MeshBasicMaterial({
      color: 0x0096ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const netEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x33bbff });

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

  private createAdBoardColliderGroup(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xffaa33 });
    const faceMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.12,
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

  private createAxisArrows(): THREE.ArrowHelper[] {
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 0.7;
    const headLength = 0.2;
    const headWidth = 0.1;

    const createArrow = (direction: THREE.Vector3, color: number) => {
      const arrow = new THREE.ArrowHelper(direction.clone(), origin, length, color, headLength, headWidth);
      arrow.visible = this.debugMode;
      this.scene.add(arrow);
      return arrow;
    };

    const arrows = [
      createArrow(new THREE.Vector3(1, 0, 0), 0xff5555),
      createArrow(new THREE.Vector3(0, 1, 0), 0x55ff55),
      createArrow(new THREE.Vector3(0, 0, 1), 0x5599ff)
    ];
    return arrows;
  }

  private toggleDebugMode(enabled?: boolean): boolean {
    const next = enabled ?? !this.debugMode;
    if (this.debugMode === next) {
      return this.debugMode;
    }

    this.debugMode = next;
    this.applyDebugVisibility();
    updateDebugButtonState(this.debugButton, this.debugMode);
    if (this.debugMode) {
      this.updateColliderVisuals();
    }
    return this.debugMode;
  }

  private applyDebugVisibility() {
    const visible = this.debugMode;
    this.goalKeeper.setColliderDebugVisible(visible);
    this.ballColliderMesh.visible = visible;
    this.goalColliderGroup.visible = visible;
    this.adBoardColliderGroup.visible = visible;
    this.trajectoryLine.visible = visible;
    this.shotInfoHud.setVisible(visible);
    this.targetMarker.visible = visible && this.targetMarker.visible; // visible 상태 유지하되 debugMode에 따라
    const hasSwipe = this.swipeTracker.getLastSwipe() !== null;
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

  private updateColliderVisuals() {
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

  private updateTrajectoryLine() {
    const positions = this.trajectoryPositions;
    const basePosition = this.ball.body.position;
    const velocity = this.ball.body.velocity;
    const gravity = this.world.gravity;
    const sampleStep = this.trajectorySampleStep;
    const sampleCount = this.trajectorySampleCount;

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

  private updateAxisArrows() {
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
   * 타겟 마커 생성 (반투명 빨간 공)
   */
  private createTargetMarker(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.11, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
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
  private createSwipePointMarkers(count: number) {
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
      sprite.scale.set(0.15, 0.15, 1);
      sprite.visible = false;
      sprite.renderOrder = 1000;
      this.scene.add(sprite);
      this.swipePointMarkers.push(sprite);

      // HTML 레이블 (번호)
      const label = document.createElement('div');
      label.textContent = (i + 1).toString();
      label.style.position = 'fixed';
      label.style.color = '#000000';
      label.style.fontSize = '18px';
      label.style.fontWeight = 'bold';
      label.style.fontFamily = 'Arial, sans-serif';
      label.style.textShadow = '0 0 3px #ffff00, 0 0 6px #ffff00';
      label.style.pointerEvents = 'none';
      label.style.display = 'none';
      label.style.zIndex = '1000';
      label.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(label);
      this.swipePointLabels.push(label);
    }
  }

  /**
   * 스와이프 디버그 라인 업데이트
   */
  private updateSwipeDebugLine() {
    if (!this.debugMode) {
      return;
    }

    const lastSwipe = this.swipeTracker.getLastSwipe();
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
    const worldPositions = this.swipeTracker.getLastSwipeWorldPositions(this.camera, 0);

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
  }

  /**
   * 캔버스 pointerup 이벤트 핸들러 (스와이프 완료 시)
   */
  private handleCanvasPointerUp() {
    const swipeData = this.swipeTracker.getLastSwipe();
    if (!swipeData) return;

    // Step 1: 정규화
    const normalized = normalizeSwipeData(swipeData);
    console.log(debugNormalizedSwipe(normalized));

    // Step 2: 슈팅 타입 분석
    const analysis = analyzeShotType(normalized);
    console.log(debugShotAnalysis(analysis));

    // Step 3: 슈팅 파라미터 계산
    const shotParams = calculateShotParameters(normalized, analysis);
    console.log(debugShotParameters(shotParams));

    // 타겟 마커 위치 업데이트
    if (analysis.type !== ShotType.INVALID) {
      this.targetMarker.position.copy(shotParams.targetPosition);
      this.targetMarker.visible = this.debugMode;
    }

    // Step 4: 초기 velocity 계산
    const velocity = calculateInitialVelocity(shotParams);
    console.log(debugVelocity(velocity));

    // Step 5: 초기 spin (angular velocity) 계산
    if (velocity) {
      const angularVelocity = calculateAngularVelocity(shotParams, velocity);
      console.log(debugAngularVelocity(angularVelocity));

      // INVALID가 아니면 실제 슈팅 실행
      if (analysis.type !== ShotType.INVALID) {
        // Shot Info HUD 업데이트 (디버그 모드일 때만 보임)
        this.shotInfoHud.update(analysis, shotParams, velocity, angularVelocity);

        this.executeShooting(velocity, angularVelocity, analysis);
      }
    }
  }

  /**
   * 슈팅 실행
   */
  private executeShooting(velocity: CANNON.Vec3, angularVelocity: CANNON.Vec3, analysis: any) {
    // 이미 슈팅 진행 중이면 무시
    if (this.isShotInProgress) return;

    // 슈팅 상태 설정
    this.isShotInProgress = true;
    this.hasScored = false;

    // 공의 velocity 설정
    this.ball.body.velocity.copy(velocity);

    // 공의 angular velocity (회전) 설정
    this.ball.body.angularVelocity.copy(angularVelocity);

    // 커브 힘 시스템 시작
    this.curveForceSystem.startCurveShot(analysis);

    // 골키퍼 추적 시작
    this.goalKeeper.startTracking();

    // 2.5초 후 리셋 타이머 설정
    this.shotResetTimer = window.setTimeout(() => {
      this.resetAfterShot();
    }, 2500);
  }

  /**
   * 슈팅 후 리셋
   */
  private resetAfterShot() {
    console.log('Reset after shot - Scored:', this.hasScored);

    // 골을 넣지 못했으면
    if (!this.hasScored) {
      this.audio.play('reset', { volume: 0.8 });
      this.score = 0;
      this.onScoreChange(this.score);
    }

    // 공 리셋
    this.resetBall();

    // 타겟 마커 숨김
    this.targetMarker.visible = false;

    // 상태 초기화
    this.isShotInProgress = false;
    this.hasScored = false;
    this.shotResetTimer = null;

    // 커브 힘 시스템 중지
    this.curveForceSystem.stopCurveShot();

    // 골키퍼 추적 중지
    this.goalKeeper.stopTracking();
  }

  /**
   * 공을 초기 위치로 리셋
   */
  private resetBall() {
    console.log('Resetting ball to origin');
    this.ball.body.position.set(
      BALL_START_POSITION.x,
      BALL_START_POSITION.y,
      BALL_START_POSITION.z
    );
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);

    // quaternion도 리셋
    this.ball.body.quaternion.set(0, 0, 0, 1);

    this.ball.syncVisuals();
    console.log('Ball reset complete. Position:', this.ball.body.position);
  }

}
