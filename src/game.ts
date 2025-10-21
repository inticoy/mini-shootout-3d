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
import { BALL_RADIUS } from './config/ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from './config/goal';
import { GOAL_NET_CONFIG } from './config/net';
import { AD_BOARD_CONFIG } from './config/adBoard';
// import { GoalKeeper } from './entities/goalkeeper'; // 기존 2D 골키퍼
// import { GoalKeeper3D as GoalKeeper } from './entities/goalkeeper3d'; // FBX 모델 골키퍼
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { createDebugButton, updateDebugButtonState } from './ui/debugHud';
import { AudioManager } from './core/audio';
import { LoadingScreen } from './ui/loadingScreen';

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
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly tempAxisX = new THREE.Vector3();
  private readonly tempAxisY = new THREE.Vector3();
  private readonly tempAxisZ = new THREE.Vector3();
  private readonly tempBallPosition = new THREE.Vector3();
  private lastBounceSoundTime = 0;
  private score = 0;
  private readonly debugButton: HTMLButtonElement;
  private debugMode = false;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handleBallCollideBound = (event: { body: CANNON.Body }) => this.handleBallCollide(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);
  private readonly handleDebugButtonClickBound = () => this.toggleDebugMode();
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
    this.score += 1;
    this.onScoreChange(this.score);
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
  }

  private handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.trajectoryMaterial.resolution.set(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.world.step(1 / 60, deltaTime, 3);
    this.goalKeeper.update(deltaTime);
    this.goal.update(deltaTime);
    this.field.update(deltaTime);

    this.ball.syncVisuals();
    this.updateColliderVisuals();

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
    this.ball.body.removeEventListener('collide', this.handleBallCollideBound);
    this.scene.remove(this.goalColliderGroup);
    this.scene.remove(this.adBoardColliderGroup);
    this.axisArrows.forEach((arrow) => this.scene.remove(arrow));
    this.debugButton.removeEventListener('click', this.handleDebugButtonClickBound);
    this.debugButton.remove();
    this.goalKeeper.setColliderDebugVisible(false);
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

}
