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
import { BALL_RADIUS } from './config/ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from './config/goal';
import { GOAL_NET_CONFIG } from './config/net';
import { AD_BOARD_CONFIG } from './config/adBoard';
import { STRIKE_ZONE_CONFIG } from './config/strike';
// import { GoalKeeper } from './entities/goalkeeper'; // 기존 2D 골키퍼
// import { GoalKeeper3D as GoalKeeper } from './entities/goalkeeper3d'; // FBX 모델 골키퍼
import { DebugHudController, createDebugButton, updateDebugButtonState } from './ui/debugHud';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { AudioManager } from './core/audio';
import { LoadingScreen } from './ui/loadingScreen';

const POINTER_HISTORY_LIMIT = 8;
const MIN_FLICK_DISTANCE_SQ = 4;
const MIN_VERTICAL_BOUNCE_SPEED = 0.45;
const BOUNCE_COOLDOWN_MS = 120;
const CURVE_PARAMS = {
  lateralScale: 0.75,
  verticalScale: 0.52,
  durationMin: 0.55,
  durationMax: 2.1,
  strengthBase: 0.34,
  strengthOffset: 0.42,
  strengthScale: 0.75,
  groundTimeout: 0.2
} as const;

const STRIKE_BASE_RANGE = 1.25;
const STRIKE_GUIDE_THRESHOLDS = {
  scoopY: 0.5 / STRIKE_BASE_RANGE,
  topY: -0.45 / STRIKE_BASE_RANGE,
  insideX: 0.28 / STRIKE_BASE_RANGE,
  brushX: 0.24 / STRIKE_BASE_RANGE,
  instepX: 0.35 / STRIKE_BASE_RANGE,
  instepY: 0.4 / STRIKE_BASE_RANGE,
  scoopEdgeY: 0.3 / STRIKE_BASE_RANGE
} as const;

export class MiniShootout3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly onScoreChange: (score: number) => void;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly goal: Goal;
  // private readonly goalKeeper: GoalKeeper;
  private readonly field: Field;
  private readonly audio = new AudioManager();
  private readonly ballColliderMesh: THREE.Mesh;
  private readonly goalColliderGroup: THREE.Group;
  private readonly adBoardColliderGroup: THREE.Group;
  private readonly hud: DebugHudController;
  private readonly axisArrows: THREE.ArrowHelper[];
  private readonly trajectoryGeometry: LineGeometry;
  private readonly trajectoryMaterial: LineMaterial;
  private readonly trajectoryLine: Line2;
  private readonly trajectoryPositions: Float32Array;
  private readonly trajectorySampleStep = 0.05;
  private readonly trajectorySampleCount = 60;
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly tempAxisX = new THREE.Vector3();
  private readonly tempAxisY = new THREE.Vector3();
  private readonly tempAxisZ = new THREE.Vector3();
  private readonly tempBallPosition = new THREE.Vector3();
  private readonly tempBallOffset = new THREE.Vector3();
  private readonly tempCurveVector = new THREE.Vector3();
  private readonly debugButton: HTMLButtonElement;
  private elapsedTime = 0;
  private lastGroundContactTime = -Infinity;
  private lastBounceSoundTime = 0;
  private activeCurve:
    | {
        direction: THREE.Vector3;
        strength: number;
        duration: number;
        startTime: number;
      }
    | null = null;
  private readonly handleBallCollideBound = (event: { body: CANNON.Body }) => this.handleBallCollide(event);
  private pointerStart: { x: number; y: number } | null = null;
  private pointerStartTime = 0;
  private pointerHistory: Array<{ x: number; y: number; time: number }> = [];
  private isShooting = false;
  private goalScoredThisShot = false;
  private netSoundPlayedThisShot = false;
  private score = 0;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handlePointerDownBound = (event: PointerEvent) => this.handlePointerDown(event);
  private readonly handlePointerMoveBound = (event: PointerEvent) => this.handlePointerMove(event);
  private readonly handlePointerUpBound = (event: PointerEvent) => this.handlePointerUp(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);
  private readonly toggleDebugBound = (enabled?: boolean) => this.toggleDebugMode(enabled);
  private readonly handleDebugButtonClickBound = () => this.toggleDebugMode();
  private debugMode = false;
  private ballScreenCenter = { x: 0, y: 0 };
  private ballScreenRadius = 0;
  private strikeContact: { x: number; y: number } | null = null;
  private lastStrikeContact: { x: number; y: number } | null = null;
  private liveSwipeVector: { start: { x: number; y: number }; end: { x: number; y: number } } | null = null;
  private lastSwipeVector: { start: { x: number; y: number }; end: { x: number; y: number } } | null = null;
  private pointerStartNormalized: { x: number; y: number } | null = null;
  private readonly strikeGuide: HTMLDivElement;
  private loadingScreen: LoadingScreen | null = null;
  private threeAssetsProgress = 0;
  private audioProgress = 0;
  private threeItemsLoaded = 0;
  private threeItemsTotal = 0;
  private isGameReady = false;

  constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
    this.canvas = canvas;
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

    // this.goalKeeper = new GoalKeeper(this.scene, this.world, GOAL_DEPTH + 0.8, this.ball.body);
    (window as typeof window & { debug?: (enabled?: boolean) => boolean }).debug = this.toggleDebugBound;

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
    this.hud = new DebugHudController();
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
    this.debugButton = createDebugButton(this.handleDebugButtonClickBound);

    const uiRoot = document.getElementById('ui') ?? this.canvas.parentElement ?? document.body;
    const strikeGuide = document.createElement('div');
    strikeGuide.className = 'strike-guide';
    const svg = this.createStrikeGuideSvg();
    strikeGuide.appendChild(svg);
    uiRoot.appendChild(strikeGuide);
    this.strikeGuide = strikeGuide;

    this.attachEventListeners();
    this.refreshStrikeGuide();
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
    if (event.body !== this.ball.body || !this.isShooting || this.goalScoredThisShot) return;
    this.goalScoredThisShot = true;
    this.score += 1;
    this.onScoreChange(this.score);
    // this.goalKeeper.stopTracking();
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
    } /* else if (event.body === this.goalKeeper.body) {
      this.audio.play('save', { volume: 0.7 });
    } */ else if (
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
      if (!this.netSoundPlayedThisShot) {
        this.audio.play('net', { volume: 0.6 });
        if (this.isShooting) {
          this.netSoundPlayedThisShot = true;
        }
      }
    }
  }

  private attachEventListeners() {
    window.addEventListener('resize', this.handleResizeBound);
    this.canvas.addEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.addEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.addEventListener('pointerup', this.handlePointerUpBound);
  }

  private handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.trajectoryMaterial.resolution.set(window.innerWidth, window.innerHeight);
  }

  private handlePointerDown(event: PointerEvent) {
    if (!this.isGameReady || this.isShooting) return;
    const contact = this.captureStrikeContact(event);
    if (contact) {
      const startPoint = { x: contact.x, y: contact.y };
      this.pointerStartNormalized = { x: startPoint.x, y: startPoint.y };
      this.liveSwipeVector = { start: startPoint, end: { x: startPoint.x, y: startPoint.y } };
    } else {
      this.liveSwipeVector = null;
      this.pointerStartNormalized = null;
    }
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.pointerStartTime = performance.now();
    this.pointerHistory = [{ x: event.clientX, y: event.clientY, time: this.pointerStartTime }];
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.isGameReady || !this.pointerStart || this.isShooting) return;
    this.updateLiveSwipeVectorEnd(event);
    const now = performance.now();
    this.pointerHistory.push({ x: event.clientX, y: event.clientY, time: now });
    if (this.pointerHistory.length > POINTER_HISTORY_LIMIT) {
      this.pointerHistory.shift();
    }
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.isGameReady || !this.pointerStart || this.isShooting) return;

    this.updateLiveSwipeVectorEnd(event);
    this.refreshStrikeGuide();

    const end = { x: event.clientX, y: event.clientY };
    const delta = {
      x: end.x - this.pointerStart.x,
      y: end.y - this.pointerStart.y
    };

    const endTime = performance.now();
    const history = this.pointerHistory.length
      ? this.pointerHistory
      : [{ x: this.pointerStart.x, y: this.pointerStart.y, time: this.pointerStartTime }];
    let flickStart = history[0];
    for (let i = history.length - 1; i >= 0; i--) {
      if (endTime - history[i].time >= 60) {
        flickStart = history[i];
        break;
      }
    }

    const flickVector = new THREE.Vector2(end.x - flickStart.x, end.y - flickStart.y);
    const fallback = new THREE.Vector2(delta.x, delta.y);
    if (flickVector.lengthSq() < MIN_FLICK_DISTANCE_SQ && fallback.lengthSq() > 0) {
      flickVector.copy(fallback);
    }
    const flickLength = flickVector.length();
    const flickDuration = Math.max(endTime - flickStart.time, 30);
    const flickSpeed = flickLength / flickDuration;

    const strikeContact = this.strikeContact ?? { x: 0, y: 0 };
    const startContact = this.pointerStartNormalized ?? strikeContact;
    const swipeEndPoint = this.computeSwipeVectorEnd(event) ?? this.liveSwipeVector?.end ?? strikeContact;
    this.pointerStart = null;
    this.pointerHistory = [];
    this.isShooting = true;
    this.goalScoredThisShot = false;
    this.netSoundPlayedThisShot = false;
    if (this.liveSwipeVector) {
      this.lastSwipeVector = {
        start: { x: this.liveSwipeVector.start.x, y: this.liveSwipeVector.start.y },
        end: { x: swipeEndPoint.x, y: swipeEndPoint.y }
      };
    } else {
      this.lastSwipeVector = {
        start: { x: startContact.x, y: startContact.y },
        end: { x: swipeEndPoint.x, y: swipeEndPoint.y }
      };
    }
    this.liveSwipeVector = null;
    this.pointerStartNormalized = null;

    const basePower = THREE.MathUtils.clamp(flickSpeed * 28 + flickLength / 26, 7, 32);

    const direction = flickLength > 0 ? flickVector.clone().normalize() : new THREE.Vector2();
    const verticalComponent = Math.max(-direction.y, 0);
    const contactLoftInfluence = THREE.MathUtils.clamp(strikeContact.y, -1.1, 1.1);
    const loftFactorRaw = THREE.MathUtils.clamp((verticalComponent + Math.max(contactLoftInfluence, 0) * 0.85 - 0.25) / 0.55, 0, 1);
    const loftFactor = Math.pow(loftFactorRaw, 1.15);
    const swipeLateralFactor = THREE.MathUtils.clamp(direction.x * 0.55, -0.95, 0.95);

    const forwardImpulse = -basePower * (1.05 - loftFactor * 0.16);
    const upwardImpulse = basePower * loftFactor * 0.4 + verticalComponent * 1.12;
    const sideImpulse = basePower * swipeLateralFactor * 0.52;

    const impulse = new CANNON.Vec3(sideImpulse, upwardImpulse, forwardImpulse);
    this.ball.body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));
    // this.goalKeeper.resetTracking();
    this.audio.play('kick', { volume: 0.9 });

    this.scheduleStrikeSpin(startContact, basePower);
    this.configureStrikeCurve(startContact, basePower);

    window.setTimeout(() => this.checkShotOutcome(), 2500);
    this.lastStrikeContact = { x: startContact.x, y: startContact.y };
    this.strikeContact = null;
    this.liveSwipeVector = null;
    this.refreshStrikeGuide();
  }

  private checkShotOutcome() {
    const beforeReset = this.isShooting;
    this.resetShot();
    if (!beforeReset) return;

    const dz = this.ball.body.position.z - (GOAL_DEPTH + 0.8);
    const velocityZ = this.ball.body.velocity.z;
    if (velocityZ > 0 && dz > 0) {
      // this.goalKeeper.stopTracking();
    }
  }

  private resetShot() {
    const missed = !this.goalScoredThisShot && this.isShooting;
    this.isShooting = false;

    if (missed && this.score !== 0) {
      this.score = 0;
      this.onScoreChange(this.score);
      this.audio.play('reset', { volume: 0.8 });
    }

    this.goalScoredThisShot = false;
    this.pointerStartTime = 0;
    this.pointerHistory = [];
    this.ball.reset();
    // this.goalKeeper.resetTracking();
    this.goal.resetNet();
    this.netSoundPlayedThisShot = false;
    // this.field.resetAds(); // 광고판은 리셋하지 않고 계속 흐르도록
    this.strikeContact = null;
    this.liveSwipeVector = null;
    this.pointerStartNormalized = null;
    this.activeCurve = null;
    this.lastGroundContactTime = -Infinity;
    this.refreshStrikeGuide();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.elapsedTime += deltaTime;
    this.applyStrikeCurve(deltaTime);
    this.world.step(1 / 60, deltaTime, 3);
    // this.goalKeeper.update(deltaTime);
    this.goal.update(deltaTime);
    this.field.update(deltaTime);

    this.ball.syncVisuals();
    this.updateDebugVisuals();

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
    this.ball.body.removeEventListener('collide', this.handleBallCollideBound);
    delete (window as typeof window & { debug?: (enabled?: boolean) => boolean }).debug;
    this.debugButton.removeEventListener('click', this.handleDebugButtonClickBound);
    this.debugButton.remove();
    this.scene.remove(this.goalColliderGroup);
    this.scene.remove(this.adBoardColliderGroup);
    this.axisArrows.forEach((arrow) => this.scene.remove(arrow));
    this.strikeGuide.remove();
    this.hud.destroy();
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
    const length = 1.1;
    const headLength = 0.35;
    const headWidth = 0.18;

    const createArrow = (direction: THREE.Vector3, color: number) => {
      const arrow = new THREE.ArrowHelper(direction.clone(), origin, length, color, headLength, headWidth);
      arrow.visible = false;
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
    // this.goalKeeper.setColliderDebugVisible(this.debugMode);
    this.ballColliderMesh.visible = this.debugMode;
    this.goalColliderGroup.visible = this.debugMode;
    this.adBoardColliderGroup.visible = this.debugMode;
    this.trajectoryLine.visible = this.debugMode;
    this.hud.setVisible(this.debugMode);
    updateDebugButtonState(this.debugButton, this.debugMode);
    this.axisArrows.forEach((arrow) => {
      arrow.visible = this.debugMode;
    });
    if (this.debugMode) {
      this.updateDebugVisuals();
    }
    this.refreshStrikeGuide();
    return this.debugMode;
  }

  private updateDebugVisuals() {
    if (!this.debugMode) return;

    this.ballColliderMesh.position.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    this.updateTrajectoryLine();
    this.updateHudState();
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

  private updateHudState() {
    const velocity = this.ball.body.velocity;
    const spin = this.ball.body.angularVelocity;
    this.hud.update({
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      speed: velocity.length(),
      spin: { x: spin.x, y: spin.y, z: spin.z },
      spinSpeed: spin.length(),
      currentContact: this.strikeContact,
      lastContact: this.lastStrikeContact,
      liveSwipe: this.liveSwipeVector,
      lastSwipe: this.lastSwipeVector
    });
  }

  private configureStrikeCurve(strikeContact: { x: number; y: number }, basePower: number) {
    const normalized = this.getNormalizedContact(strikeContact);
    const magnitude = THREE.MathUtils.clamp(Math.hypot(normalized.x, normalized.y), 0, 1);
    if (magnitude < 0.05) {
      this.activeCurve = null;
      return;
    }

    const lateral = -normalized.x;
    const vertical = normalized.y;
    const direction = new THREE.Vector3(
      lateral * CURVE_PARAMS.lateralScale,
      vertical * CURVE_PARAMS.verticalScale,
      0
    );
    if (direction.lengthSq() < 1e-4) {
      this.activeCurve = null;
      return;
    }

    const duration = THREE.MathUtils.lerp(CURVE_PARAMS.durationMin, CURVE_PARAMS.durationMax, magnitude);
    const strength =
      basePower *
      CURVE_PARAMS.strengthBase *
      (CURVE_PARAMS.strengthOffset + magnitude * CURVE_PARAMS.strengthScale);

    this.activeCurve = {
      direction,
      strength,
      duration,
      startTime: this.elapsedTime
    };
    this.lastGroundContactTime = -Infinity;
  }

  private applyStrikeCurve(deltaTime: number) {
    const curve = this.activeCurve;
    if (!curve) return;

    const body = this.ball.body;
    const velocity = body.velocity;
    const now = this.elapsedTime;

    const onGround = body.position.y <= BALL_RADIUS + 0.03;
    if (onGround && velocity.y <= 0.6) {
      this.lastGroundContactTime = now;
    }

    if (now - this.lastGroundContactTime < CURVE_PARAMS.groundTimeout) {
      return;
    }

    const age = now - curve.startTime;
    if (age >= curve.duration) {
      this.activeCurve = null;
      return;
    }

    const speedSq = velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z;
    if (speedSq < 0.05) {
      this.activeCurve = null;
      return;
    }

    const progress = age / curve.duration;
    const falloff = Math.max(0, 1 - progress * progress);
    if (falloff <= 0) {
      this.activeCurve = null;
      return;
    }

    const influence = curve.strength * falloff * deltaTime;
    if (influence <= 0) {
      return;
    }

    this.tempCurveVector.copy(curve.direction).multiplyScalar(influence);

    const vx = velocity.x + this.tempCurveVector.x;
    const vy = velocity.y + this.tempCurveVector.y;
    const vz = velocity.z + this.tempCurveVector.z;

    const originalSpeed = Math.sqrt(speedSq);
    const newSpeedSq = vx * vx + vy * vy + vz * vz;
    if (newSpeedSq <= 1e-6) {
      this.activeCurve = null;
      return;
    }

    const normalize = originalSpeed / Math.sqrt(newSpeedSq);
    velocity.x = vx * normalize;
    velocity.y = vy * normalize;
    velocity.z = vz * normalize;
  }

  private computeStrikePoint(event: PointerEvent): { x: number; y: number } | null {
    if (!this.updateBallScreenMetrics()) {
      return null;
    }

    const radius = Math.max(this.ballScreenRadius, 10);
    const localX = (event.clientX - this.ballScreenCenter.x) / radius;
    const localY = (event.clientY - this.ballScreenCenter.y) / radius;
    const distance = Math.hypot(localX, localY);
    const clampRange = STRIKE_ZONE_CONFIG.clampRange;
    const overshoot = Math.max(distance - 1, 0);
    const overshootRange = Math.max(clampRange - 1, 1e-6);
    const falloff = Math.max(0, 1 - (overshoot / overshootRange) * STRIKE_ZONE_CONFIG.falloffSlope);

    const contactX = THREE.MathUtils.clamp(localX, -clampRange, clampRange) * falloff;
    const contactY = THREE.MathUtils.clamp(localY, -clampRange, clampRange) * falloff;

    return { x: contactX, y: contactY };
  }

  private captureStrikeContact(event: PointerEvent): { x: number; y: number } | null {
    const contact = this.computeStrikePoint(event);
    this.strikeContact = contact;
    this.refreshStrikeGuide();
    return contact;
  }

  private computeSwipeVectorEnd(event: PointerEvent): { x: number; y: number } | null {
    if (!this.pointerStartNormalized || !this.pointerStart) {
      return this.computeStrikePoint(event);
    }
    if (!this.updateBallScreenMetrics()) {
      return null;
    }

    const radius = Math.max(this.ballScreenRadius, 10);
    const deltaX = (event.clientX - this.pointerStart.x) / radius;
    const deltaY = (event.clientY - this.pointerStart.y) / radius;

    return {
      x: this.pointerStartNormalized.x + deltaX,
      y: this.pointerStartNormalized.y + deltaY
    };
  }

  private updateLiveSwipeVectorEnd(event: PointerEvent) {
    if (!this.liveSwipeVector) {
      return;
    }
    const point = this.computeSwipeVectorEnd(event);
    if (!point) {
      this.refreshStrikeGuide();
      return;
    }
    this.liveSwipeVector.end = point;
    this.refreshStrikeGuide();
  }

  private updateBallScreenMetrics(): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return false;

    this.tempBallPosition.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
    this.tempBallPosition.project(this.camera);

    const screenX = rect.left + ((this.tempBallPosition.x + 1) * 0.5) * width;
    const screenY = rect.top + ((1 - (this.tempBallPosition.y + 1) * 0.5)) * height;

    this.tempBallOffset
      .set(this.ball.body.position.x + BALL_RADIUS, this.ball.body.position.y, this.ball.body.position.z)
      .project(this.camera);

    const offsetX = rect.left + ((this.tempBallOffset.x + 1) * 0.5) * width;
    const offsetY = rect.top + ((1 - (this.tempBallOffset.y + 1) * 0.5)) * height;

    this.ballScreenCenter = { x: screenX, y: screenY };
    this.ballScreenRadius = Math.max(Math.hypot(offsetX - screenX, offsetY - screenY), 16);
    return Number.isFinite(this.ballScreenRadius);
  }

  private refreshStrikeGuide(): void {
    this.renderStrikeGuide();
  }

  private renderStrikeGuide(): void {
    if (!this.debugMode) {
      this.strikeGuide.style.opacity = '0';
      this.strikeGuide.style.transform = 'translate(-9999px, -9999px)';
      return;
    }

    if (!this.updateBallScreenMetrics()) {
      this.strikeGuide.style.opacity = '0';
      this.strikeGuide.style.transform = 'translate(-9999px, -9999px)';
      return;
    }

    const baseRadius = this.ballScreenRadius * STRIKE_ZONE_CONFIG.clampRange;
    const radius = Math.max(baseRadius, this.ballScreenRadius);
    const size = radius * 2;
    const screenX = this.ballScreenCenter.x;
    const screenY = this.ballScreenCenter.y;

    this.strikeGuide.style.width = `${size}px`;
    this.strikeGuide.style.height = `${size}px`;
    this.strikeGuide.style.opacity = STRIKE_ZONE_CONFIG.guideOpacity.toString();
    this.strikeGuide.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
  }

  private createStrikeGuideSvg(): SVGSVGElement {
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.classList.add('strike-guide__svg');
    svg.setAttribute('viewBox', '-2.4 -2.6 4.8 4.8');

    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', '1');
    circle.setAttribute('fill', 'rgba(40, 120, 160, 0.18)');
    circle.setAttribute('stroke', 'rgba(160, 220, 255, 0.4)');
    circle.setAttribute('stroke-width', '0.035');
    svg.appendChild(circle);

    const addGuide = (x1: number, y1: number, x2: number, y2: number) => {
      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', x1.toString());
      line.setAttribute('y1', y1.toString());
      line.setAttribute('x2', x2.toString());
      line.setAttribute('y2', y2.toString());
      line.setAttribute('stroke', 'rgba(200, 240, 255, 0.35)');
      line.setAttribute('stroke-width', '0.03');
      line.setAttribute('stroke-dasharray', '0.12 0.12');
      svg.appendChild(line);
    };

    const horizontalExtent = 1.6;
    const verticalExtent = 1.9;
    addGuide(-horizontalExtent, STRIKE_GUIDE_THRESHOLDS.scoopY, horizontalExtent, STRIKE_GUIDE_THRESHOLDS.scoopY);
    addGuide(-horizontalExtent, STRIKE_GUIDE_THRESHOLDS.topY, horizontalExtent, STRIKE_GUIDE_THRESHOLDS.topY);
    addGuide(-STRIKE_GUIDE_THRESHOLDS.insideX, -verticalExtent, -STRIKE_GUIDE_THRESHOLDS.insideX, verticalExtent);
    addGuide(STRIKE_GUIDE_THRESHOLDS.insideX, -verticalExtent, STRIKE_GUIDE_THRESHOLDS.insideX, verticalExtent);

    const addLabel = (text: string, x: number, y: number) => {
      const label = document.createElementNS(svgNs, 'text');
      label.setAttribute('x', x.toString());
      label.setAttribute('y', y.toString());
      label.setAttribute('fill', 'rgba(220, 240, 255, 0.8)');
      label.setAttribute('font-size', '0.16');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = text;
      svg.appendChild(label);
    };

    addLabel('Scoop', 0, STRIKE_GUIDE_THRESHOLDS.scoopY + 0.38);
    addLabel('Top Spin', 0, STRIKE_GUIDE_THRESHOLDS.topY - 0.3);
    addLabel('Outside Curve', -1.1, 0.05);
    addLabel('Inside Curve', 1.1, 0.05);
    addLabel('No Spin', 0, 0.05);

    return svg;
  }

  private getNormalizedContact(contact: { x: number; y: number }): { x: number; y: number } {
    const range = Math.max(STRIKE_ZONE_CONFIG.clampRange, 1e-6);
    const invRange = 1 / range;
    return {
      x: THREE.MathUtils.clamp(contact.x * invRange, -1, 1),
      y: THREE.MathUtils.clamp(contact.y * invRange, -1, 1)
    };
  }

  private computeStrikeSpin(strikeContact: { x: number; y: number }, basePower: number): {
    side: number;
    top: number;
    roll: number;
  } {
    const normalized = this.getNormalizedContact(strikeContact);
    const horizontal = normalized.x;
    const vertical = normalized.y;
    const contactMagnitude = Math.min(Math.hypot(horizontal, vertical), 1);

    const powerScale = THREE.MathUtils.lerp(1.25, 2.4, THREE.MathUtils.clamp(basePower / 38, 0, 1));
    const baseSpin = basePower * 0.38 * powerScale;
    const magnitudeBoost = THREE.MathUtils.lerp(0.55, 1.25, contactMagnitude);

    const yawSpinRaw = -horizontal * baseSpin * 1.35 * magnitudeBoost; // (Z axis) curve component
    const pitchSpinRaw = -vertical * baseSpin * 0.88 * magnitudeBoost; // (X axis) top/bottom component
    const rollSpinRaw = -horizontal * baseSpin * 1.35 * magnitudeBoost; // (Y axis) inside/outside component

    const maxSpin = 65;
    const clampSpin = (value: number) => THREE.MathUtils.clamp(value, -maxSpin, maxSpin);
    const sideSpin = clampSpin(-pitchSpinRaw);
    const topSpin = clampSpin(-yawSpinRaw);
    const rollSpin = clampSpin(rollSpinRaw);

    return {
      side: sideSpin,
      top: topSpin,
      roll: rollSpin
    };
  }

  private scheduleStrikeSpin(contact: { x: number; y: number }, basePower: number, attempt = 0) {
    const applySpin = () => {
      const spin = this.computeStrikeSpin(contact, basePower);
      this.ball.body.angularVelocity.set(spin.side, spin.roll, spin.top);
    };

    const body = this.ball.body;
    if (body.position.y > BALL_RADIUS + 0.02 || attempt >= 3) {
      applySpin();
      return;
    }

    window.setTimeout(() => {
      this.scheduleStrikeSpin(contact, basePower, attempt + 1);
    }, 16);
  }
}
