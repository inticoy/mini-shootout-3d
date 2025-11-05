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
import { Obstacle } from './entities/obstacle';
import { BALL_RADIUS, BALL_START_POSITION, BALL_THEMES, BALL_PHYSICS } from './config/ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from './config/goal';
import { GOAL_NET_CONFIG } from './config/net';
import { AD_BOARD_CONFIG } from './config/adBoard';
import { getDifficultyForScore, type DifficultyLevelConfig } from './config/difficulty';
import { getObstacleBlueprint } from './config/obstacles';
import type { ObstacleBlueprint, ObstacleInstanceConfig } from './config/obstacles';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
// Debug button removed - now integrated into Settings modal
import { ShotInfoHud } from './ui/shotInfoHud';
import { AudioManager } from './core/audio';
import { LoadingScreen } from './ui/loadingScreen';
import { SwipeTracker } from './input/swipeTracker';
import type { ScoreDisplay } from './ui/scoreDisplay';
import { normalizeSwipeData, debugNormalizedSwipe } from './shooting/swipeNormalizer';
import { analyzeShotType, debugShotAnalysis, ShotType } from './shooting/shotAnalyzer';
import { calculateShotParameters, debugShotParameters } from './shooting/shotParameters';
import { calculateInitialVelocity, debugVelocity } from './shooting/velocityCalculator';
import { calculateAngularVelocity, debugAngularVelocity } from './shooting/spinCalculator';
import { CurveForceSystem } from './shooting/curveForceSystem';
import { GameStateManager, GameState } from './core/GameStateManager';

const MIN_VERTICAL_BOUNCE_SPEED = 0.45;
const BOUNCE_COOLDOWN_MS = 120;

export class MiniShootout3D {
  private readonly onScoreChange: (score: number) => void;
  private readonly onShowTouchGuide: (show: boolean) => void;
  private readonly scoreDisplay: ScoreDisplay;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly goal: Goal;
  private obstacles: Obstacle[] = [];
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
  private debugMode = false;
  private shotResetTimer: number | null = null;
  private readonly ballInitialMass: number;
  private isBallGravityEnabled = false;
  private currentDifficulty: DifficultyLevelConfig | null = null;
  private failCount = 0; // 현재 게임에서 실패한 횟수
  private maxFailsBeforeGameOver = 2; // 게임오버까지 허용되는 실패 횟수
  private onGameFailed?: (failCount: number) => void; // 실패 시 콜백
  private savedGameState?: { score: number; difficulty: DifficultyLevelConfig | null }; // 이어하기용 상태 저장

  // 게임 상태 관리자
  private readonly stateManager = new GameStateManager(GameState.INITIALIZING);

  // 기존 플래그들을 stateManager로 위임 (하위 호환성)
  private get isShotInProgress(): boolean {
    return this.stateManager.isShotInProgress();
  }
  private set isShotInProgress(value: boolean) {
    if (value) {
      this.stateManager.setState(GameState.SHOOTING);
    } else if (this.stateManager.isShotInProgress()) {
      this.stateManager.setState(GameState.IDLE);
    }
  }

  private get hasScored(): boolean {
    return this.stateManager.is(GameState.SCORING);
  }
  private set hasScored(value: boolean) {
    if (value) {
      this.stateManager.setState(GameState.SCORING);
    } else if (this.stateManager.is(GameState.SCORING)) {
      this.stateManager.setState(GameState.IDLE);
    }
  }

  // 🔍 궤적 디버깅
  private isTrackingBall = false;
  private trackingStartTime = 0;
  private trackingTargetY = 0;
  private lastLogTime = 0;
  private goalLineCrossed = false;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handleBallCollideBound = (event: { body: CANNON.Body }) => this.handleBallCollide(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);
  // handleDebugButtonClickBound는 settings에서 직접 호출하므로 제거
  private readonly handleCanvasPointerUpBound = (e: PointerEvent) => this.handleCanvasPointerUp(e);
  private touchGuideTimer: number | null = null;
  private loadingScreen: LoadingScreen | null = null;
  private threeAssetsProgress = 0;
  private audioProgress = 0;
  private threeItemsLoaded = 0;
  private threeItemsTotal = 0;
  private isGameReady = false;

  constructor(
    canvas: HTMLCanvasElement,
    onScoreChange: (score: number) => void,
    onShowTouchGuide: (show: boolean) => void,
    scoreDisplay: ScoreDisplay,
    onGameFailed?: (failCount: number) => void
  ) {
    this.onScoreChange = onScoreChange;
    this.onShowTouchGuide = onShowTouchGuide;
    this.scoreDisplay = scoreDisplay;
    this.onGameFailed = onGameFailed;

    // 로딩 화면 생성 및 표시
    this.loadingScreen = new LoadingScreen(
      () => {
        // 로딩 화면 스와이프 시 관중 함성 시작 (페이드인)
        void this.audio.playMusic('chant', { fadeIn: true });
      },
      () => {
        // 로딩 완료 시 게임플레이 음악 시작
        void this.audio.playMusic('gameplay');
      }
    );
    this.loadingScreen.show();
    this.loadingScreen.setProgress(0);
    this.setupAssetLoadingTracker();

    this.scene = new THREE.Scene();
    this.scene.background = null; // HTML 배경(빨강-녹색 그라디언트)이 보이도록 투명
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
    this.ballInitialMass = this.ball.body.mass;

    void this.ball.load(this.scene, THREE.DefaultLoadingManager).catch((error) => {
      console.error('Failed to load ball model', error);
    });

    this.goal = new Goal(this.scene, this.world, materials.ball);
    this.goal.setNetAnimationEnabled(true);
    this.goal.bodies.sensor.addEventListener('collide', this.handleGoalCollisionBound);

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

    // Debug visibility 적용
    this.applyDebugVisibility();

    this.attachEventListeners();
    this.resetBall();
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

    // 게임 상태를 IDLE로 전환 (슈팅 가능)
    this.stateManager.setState(GameState.IDLE);

    // 로딩 화면은 사용자가 축구공을 스와이프할 때까지 대기
    // loadingScreen의 내부 로직에서 처리됨
  }

  private handleGoalCollision(event: { body: CANNON.Body }) {
    if (event.body !== this.ball.body) return;
    if (!this.isShotInProgress) return; // 슈팅 중이 아니면 무시
    if (this.hasScored) return; // 이미 골 처리했으면 무시 (중복 방지)

    console.log('⚽ GOAL! Score:', this.score + 1);

    this.score += 1;
    this.onScoreChange(this.score);

    // 점수가 올라갔으므로 터치 가이드 숨김
    if (this.touchGuideTimer !== null) {
      clearTimeout(this.touchGuideTimer);
      this.touchGuideTimer = null;
    }
    this.onShowTouchGuide(false);
    this.hasScored = true;
    this.obstacles.forEach((obstacle) => obstacle.stopTracking());
    this.tempBallPosition.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    this.goal.triggerNetPulse(this.tempBallPosition, 1);

    // 골 사운드: 최고 기록 경신 중이면 record, 아니면 goal
    const isNewRecord = this.scoreDisplay.isNewRecordAchieved();
    if (isNewRecord) {
      this.audio.playSound('record');
    } else {
      this.audio.playSound('goal');
    }

    // 광고판 효과: 최고 기록이면 record, 아니면 goal
    if (isNewRecord) {
      this.field.adBoard.switchAdSet('record');
    } else {
      this.field.adBoard.switchAdSet('goal');
    }
    this.field.adBoard.startBlinking();
  }

  private handleBallCollide(event: { body: CANNON.Body }) {
    if (event.body === this.field.groundBody) {
      const now = performance.now();
      if (now - this.lastBounceSoundTime < BOUNCE_COOLDOWN_MS) return;
      const vy = Math.abs(this.ball.body.velocity.y);
      if (vy < MIN_VERTICAL_BOUNCE_SPEED) return;
      this.lastBounceSoundTime = now;

      // 테마별 바운스 사운드 사용 (지정되지 않으면 기본 'bounce' 사용)
      const bounceSound = this.ball.getTheme().sounds?.bounce ?? 'bounce';
      this.audio.playSound(bounceSound);
    } else if (this.obstacles.some((obstacle) => obstacle.body === event.body)) {
      this.audio.playSound('save');
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
      this.audio.playSound('post');
    } else if (this.goal.isNetCollider(event.body)) {
      this.goal.handleNetCollision(this.ball.body);
      this.audio.playSound('net');
    }
  }

  private attachEventListeners() {
    window.addEventListener('resize', this.handleResizeBound);
    // 캔버스에서 pointerup 이벤트 감지 (스와이프 완료 시 정규화 테스트)
    // capture phase에서 실행하여 버튼보다 먼저 받지 않도록 함
    this.renderer.domElement.addEventListener('pointerup', this.handleCanvasPointerUpBound);
  }

  private handleResize() {
    // 전체 화면 크기로 리사이즈
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.trajectoryMaterial.resolution.set(window.innerWidth, window.innerHeight);
    this.swipeDebugMaterial.resolution.set(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    // Tunneling 방지: 더 작은 timestep, 더 많은 substeps
    // 빠른 슛(40 m/s)도 얇은 골대(0.1m)와 정확히 충돌
    this.world.step(1 / 120, deltaTime, 5);
    this.curveForceSystem.update(deltaTime, this.ball.body);
    this.obstacles.forEach((obstacle) => obstacle.update(deltaTime));
    this.goal.update(deltaTime);
    this.field.update(deltaTime);

    // 🔍 궤적 추적 로그
    if (this.isTrackingBall) {
      const now = performance.now();
      const elapsed = (now - this.trackingStartTime) / 1000; // 초 단위
      const pos = this.ball.body.position;
      const vel = this.ball.body.velocity;

      // 🔍 첫 0.1초 동안 매 프레임 상세 로그
      if (elapsed < 0.1) {
        console.log(`⚡ [t=${elapsed.toFixed(3)}s] world.step 직후: vel(${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)})`);
      }

      // 0.05초마다 로그 (또는 골라인 근처)
      if (elapsed - this.lastLogTime >= 0.05) {
        console.log(`⚽ t=${elapsed.toFixed(2)}s: pos(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), vel(${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)})`);
        this.lastLogTime = elapsed;
      }

      // 골라인(-6) 통과 감지
      if (!this.goalLineCrossed && pos.z <= -6.0) {
        this.goalLineCrossed = true;
        const diff = pos.y - this.trackingTargetY;
        console.log(`🎯 골라인 통과: Y = ${pos.y.toFixed(2)}m (목표 ${this.trackingTargetY.toFixed(2)}m, 차이 ${diff.toFixed(2)}m)`);
      }

      // 1초 후 또는 리셋되면 추적 중지
      if (elapsed > 1.0 || !this.isShotInProgress) {
        this.isTrackingBall = false;
      }
    }

    this.ball.syncVisuals();
    this.updateColliderVisuals();
    this.updateSwipeDebugLine();

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.shotResetTimer !== null) {
      clearTimeout(this.shotResetTimer);
    }
    if (this.touchGuideTimer !== null) {
      clearTimeout(this.touchGuideTimer);
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
    this.shotInfoHud.destroy();
    this.obstacles.forEach((obstacle) => obstacle.dispose());
    this.obstacles = [];
    this.swipeTracker.destroy();

    // 배경음악 중지
    this.audio.stopMusic();
  }

  /**
   * 설정: 배경음악 on/off
   */
  public setMusicEnabled(enabled: boolean): void {
    this.audio.setMusicEnabled(enabled);
  }

  /**
   * 설정: 효과음 on/off
   */
  public setSfxEnabled(enabled: boolean): void {
    this.audio.setSfxEnabled(enabled);
  }

  /**
   * 설정: 마스터 볼륨 (0.0~1.0)
   */
  public setMasterVolume(volume: number): void {
    this.audio.setMasterVolume(volume);
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

  public toggleDebugMode(enabled?: boolean): boolean {
    const next = enabled ?? !this.debugMode;
    if (this.debugMode === next) {
      return this.debugMode;
    }

    this.debugMode = next;
    this.applyDebugVisibility();
    if (this.debugMode) {
      this.updateColliderVisuals();
    }
    return this.debugMode;
  }

  private applyDebugVisibility() {
    const visible = this.debugMode;
    this.obstacles.forEach((obstacle) => obstacle.setColliderDebugVisible(visible));
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
      label.style.zIndex = '5';
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

  private handleCanvasPointerUp(e: PointerEvent) {
    console.log('⚽ Game handleCanvasPointerUp 호출됨', {
      target: e.target,
      targetTag: (e.target as HTMLElement).tagName,
      targetId: (e.target as HTMLElement).id
    });
    
    // UI 버튼 클릭인 경우 무시
    const target = e.target as HTMLElement;
    if (target !== this.renderer.domElement) {
      console.log('⚽ canvas가 아닌 요소 클릭 - 무시');
      return;
    }
    
    const swipeData = this.swipeTracker.getLastSwipe();
    if (!swipeData) {
      console.log('⚽ swipeData 없음 - 리턴');
      return;
    }

    console.log('⚽ swipeData 있음 - 슛 처리 시작');
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

        // 🔍 궤적 추적 시작
        this.isTrackingBall = true;
        this.trackingStartTime = performance.now();
        this.trackingTargetY = shotParams.targetPosition.y;
        this.lastLogTime = 0;
        this.goalLineCrossed = false;

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

    this.prepareBallForShot();

    // 공의 velocity 설정
    this.ball.body.velocity.copy(velocity);
    console.log('🚀 [t=0.00s] velocity 설정 직후:', `vel(${this.ball.body.velocity.x.toFixed(2)}, ${this.ball.body.velocity.y.toFixed(2)}, ${this.ball.body.velocity.z.toFixed(2)})`);

    // 공의 angular velocity (회전) 설정
    this.ball.body.angularVelocity.copy(angularVelocity);

    // 커브 힘 시스템 시작
    this.curveForceSystem.startCurveShot(analysis);

    // 골키퍼 추적 시작
    this.obstacles.forEach((obstacle) => obstacle.startTracking());

    // 터치 가이드 타이머 취소 및 숨김
    if (this.touchGuideTimer !== null) {
      clearTimeout(this.touchGuideTimer);
      this.touchGuideTimer = null;
    }
    this.onShowTouchGuide(false);

    // 2.5초 후 리셋 타이머 설정
    this.shotResetTimer = window.setTimeout(() => {
      this.resetAfterShot();
    }, 2500);
  }

  private prepareBallForShot() {
    this.setBallGravityEnabled(true);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.syncBallKinematicFrames();
  }

  private setBallGravityEnabled(enabled: boolean) {
    if (enabled === this.isBallGravityEnabled) {
      return;
    }

    if (enabled) {
      this.ball.body.type = CANNON.Body.DYNAMIC;
      this.ball.body.mass = this.ballInitialMass;
      this.ball.body.updateMassProperties();
      this.ball.body.force.set(0, 0, 0);
      this.ball.body.torque.set(0, 0, 0);
      this.ball.body.wakeUp();
    } else {
      this.ball.body.velocity.set(0, 0, 0);
      this.ball.body.angularVelocity.set(0, 0, 0);
      this.ball.body.force.set(0, 0, 0);
      this.ball.body.torque.set(0, 0, 0);
      this.ball.body.type = CANNON.Body.STATIC;
      this.ball.body.mass = 0;
      this.ball.body.updateMassProperties();
      this.ball.body.sleep();
    }

    this.isBallGravityEnabled = enabled;
  }

  private syncBallKinematicFrames() {
    this.ball.body.previousPosition.copy(this.ball.body.position);
    this.ball.body.interpolatedPosition.copy(this.ball.body.position);
    this.ball.body.previousQuaternion.copy(this.ball.body.quaternion);
    this.ball.body.interpolatedQuaternion.copy(this.ball.body.quaternion);
  }

  private updateDifficulty(forceRefresh = false) {
    const nextDifficulty = getDifficultyForScore(this.score);
    const levelChanged = this.currentDifficulty !== nextDifficulty;

    if (forceRefresh || levelChanged) {
      this.syncObstacles(nextDifficulty.obstacles);
      if (levelChanged) {
        console.log(`🎯 난이도 변경: ${nextDifficulty.name} (score=${this.score})`);
      }
    }

    this.currentDifficulty = nextDifficulty;
  }

  private syncObstacles(configs: ObstacleInstanceConfig[]) {
    if (this.obstacles.length > configs.length) {
      for (let i = configs.length; i < this.obstacles.length; i++) {
        this.obstacles[i].dispose();
      }
      this.obstacles.length = configs.length;
    }

    configs.forEach((config, index) => {
      let obstacle = this.obstacles[index];
      if (!obstacle || obstacle.blueprintId !== config.blueprintId) {
        if (obstacle) {
          obstacle.dispose();
        }
        const blueprintId = config.blueprintId;
        const blueprint = this.resolveBlueprint(blueprintId);
        obstacle = new Obstacle(this.scene, this.world, blueprint, config);
        this.obstacles[index] = obstacle;
      } else {
        obstacle.configure(config);
      }
      obstacle.setColliderDebugVisible(this.debugMode);
      obstacle.startTracking();
    });

    this.obstacles.length = configs.length;
  }

  private resolveBlueprint(id: string): ObstacleBlueprint {
    const blueprint = getObstacleBlueprint(id);
    if (!blueprint) {
      throw new Error(`Unknown obstacle blueprint: ${id}`);
    }
    return blueprint;
  }

  /**
   * 슈팅 후 리셋
   */
  private resetAfterShot() {
    console.log('Reset after shot - Scored:', this.hasScored);

    // 골을 넣지 못했으면
    if (!this.hasScored) {
      // 실패시 항상 리셋 사운드
      this.audio.playSound('reset');

      // 실패 카운트 증가
      this.failCount++;
      console.log(`⚠️ 실패! 실패 횟수: ${this.failCount}/${this.maxFailsBeforeGameOver}`);

      // 현재 게임 상태 저장 (이어하기용)
      this.savedGameState = {
        score: this.score,
        difficulty: this.currentDifficulty
      };

      // 실패 콜백 호출 (모달 띄우기)
      if (this.onGameFailed) {
        this.onGameFailed(this.failCount);
      }

      // 실패 콜백이 없거나 2번째 실패면 점수 초기화
      if (!this.onGameFailed || this.failCount >= this.maxFailsBeforeGameOver) {
        this.score = 0;
        this.onScoreChange(this.score);
        this.scoreDisplay.resetNewRecordFlag();
      }

      // 2번째 실패가 아니면 여기서 리턴 (모달에서 처리)
      if (this.failCount < this.maxFailsBeforeGameOver && this.onGameFailed) {
        // 상태 초기화만 하고 공은 리셋하지 않음 (모달에서 선택에 따라 처리)
        this.isShotInProgress = false;
        this.hasScored = false;
        this.shotResetTimer = null;
        this.curveForceSystem.stopCurveShot();
        return;
      }
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
  }

  /**
   * 공을 초기 위치로 리셋
   */
  private resetBall() {
    console.log('Resetting ball to origin');
    this.setBallGravityEnabled(false);
    this.ball.body.position.set(
      BALL_START_POSITION.x,
      BALL_START_POSITION.y,
      BALL_START_POSITION.z
    );
    // 초기 회전 적용
    const tempEuler = new THREE.Euler(
      BALL_PHYSICS.startRotation.x,
      BALL_PHYSICS.startRotation.y,
      BALL_PHYSICS.startRotation.z,
      'XYZ'
    );
    const tempQuat = new THREE.Quaternion().setFromEuler(tempEuler);
    this.ball.body.quaternion.set(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.syncBallKinematicFrames();

    this.ball.syncVisuals();
    console.log('Ball reset complete. Position:', this.ball.body.position);

    this.obstacles.forEach((obstacle) => obstacle.resetTracking());
    this.updateDifficulty(true);

    // 광고판 효과: 깜빡임 중지 + 기본 광고로 복원
    this.field.adBoard.stopBlinking();
    this.field.adBoard.switchAdSet('default');

    // 터치 가이드 타이머 시작 (점수가 0일 때만, 1초 후 표시)
    if (this.score === 0) {
      this.touchGuideTimer = window.setTimeout(() => {
        this.onShowTouchGuide(true);
      }, 1000);
    }
  }

  /**
   * 게임 이어하기 (저장된 상태로 복원, 공만 원위치)
   */
  public continueGame(): void {
    console.log('▶️ 게임 이어하기');

    // 저장된 상태가 있으면 복원
    if (this.savedGameState) {
      this.score = this.savedGameState.score;
      this.currentDifficulty = this.savedGameState.difficulty;
      console.log(`복원된 점수: ${this.score}`);
    }

    // 실패 카운트는 그대로 유지 (다시 실패하면 게임오버)

    // 상태 초기화
    this.isShotInProgress = false;
    this.hasScored = false;

    // 커브 힘 시스템 중지
    this.curveForceSystem.stopCurveShot();

    // 타겟 마커 숨김
    this.targetMarker.visible = false;

    // 공만 원위치로 (난이도와 점수는 유지)
    this.resetBallOnly();

    console.log('✅ 게임 이어하기 완료');
  }

  /**
   * 공만 원위치로 리셋 (점수와 난이도는 유지)
   */
  private resetBallOnly(): void {
    console.log('Resetting ball only (keeping score and difficulty)');
    this.setBallGravityEnabled(false);
    this.ball.body.position.set(
      BALL_START_POSITION.x,
      BALL_START_POSITION.y,
      BALL_START_POSITION.z
    );
    // 초기 회전 적용
    const tempEuler = new THREE.Euler(
      BALL_PHYSICS.startRotation.x,
      BALL_PHYSICS.startRotation.y,
      BALL_PHYSICS.startRotation.z,
      'XYZ'
    );
    const tempQuat = new THREE.Quaternion().setFromEuler(tempEuler);
    this.ball.body.quaternion.set(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.syncBallKinematicFrames();

    this.ball.syncVisuals();
    console.log('Ball reset complete. Position:', this.ball.body.position);

    // 장애물은 리셋하지 않음 (난이도 유지)
    this.obstacles.forEach((obstacle) => obstacle.resetTracking());
  }

  /**
   * 게임을 처음부터 재시작 (점수 초기화 포함)
   */
  public restartGame(): void {
    console.log('🔄 게임 재시작');

    // 진행 중인 샷 타이머 정리
    if (this.shotResetTimer !== null) {
      clearTimeout(this.shotResetTimer);
      this.shotResetTimer = null;
    }

    // 점수 초기화
    this.score = 0;
    this.onScoreChange(this.score);

    // 최고 기록 플래그 리셋
    this.scoreDisplay.resetNewRecordFlag();

    // 실패 카운트 리셋
    this.failCount = 0;
    this.savedGameState = undefined;

    // 상태 초기화
    this.isShotInProgress = false;
    this.hasScored = false;

    // 커브 힘 시스템 중지
    this.curveForceSystem.stopCurveShot();

    // 타겟 마커 숨김
    this.targetMarker.visible = false;

    // 공 리셋
    this.resetBall();

    console.log('✅ 게임 재시작 완료');
  }

  /**
   * 게임오버 처리 (점수 초기화)
   */
  public gameOver(): void {
    console.log('💀 게임오버');

    // 점수 초기화
    this.score = 0;
    this.onScoreChange(this.score);

    // 최고 기록 플래그 리셋
    this.scoreDisplay.resetNewRecordFlag();

    // 실패 카운트 리셋
    this.failCount = 0;
    this.savedGameState = undefined;

    // 공 리셋
    this.resetBall();

    console.log('✅ 게임오버 처리 완료');
  }

  /**
   * 다음 테마로 전환
   */
  public async switchToNextTheme(): Promise<void> {
    const currentTheme = this.ball.getTheme();
    const themeKeys = Object.keys(BALL_THEMES) as Array<keyof typeof BALL_THEMES>;
    const currentIndex = themeKeys.findIndex(key => BALL_THEMES[key].name === currentTheme.name);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextTheme = BALL_THEMES[themeKeys[nextIndex]];

    console.log(`🎨 Switching theme: ${currentTheme.name} -> ${nextTheme.name}`);

    try {
      await this.ball.changeTheme(nextTheme);
      console.log(`✅ Theme switched to: ${nextTheme.name}`);
    } catch (error) {
      console.error('Failed to switch theme:', error);
    }
  }

  /**
   * 특정 테마로 전환
   */
  public async switchToTheme(themeName: string): Promise<void> {
    const themeKeys = Object.keys(BALL_THEMES) as Array<keyof typeof BALL_THEMES>;
    const themeKey = themeKeys.find(key => BALL_THEMES[key].name === themeName);

    if (!themeKey) {
      console.error(`Theme '${themeName}' not found`);
      return;
    }

    const newTheme = BALL_THEMES[themeKey];
    const currentTheme = this.ball.getTheme();

    if (currentTheme.name === newTheme.name) {
      console.log(`Already using theme: ${themeName}`);
      return;
    }

    console.log(`🎨 Switching to theme: ${themeName}`);

    try {
      await this.ball.changeTheme(newTheme);
      console.log(`✅ Theme switched to: ${newTheme.name}`);
    } catch (error) {
      console.error('Failed to switch theme:', error);
    }
  }

}
