import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createRenderer } from './core/graphics';
import { createPerspectiveCamera } from './core/camera';
import { configureSceneLighting } from './core/lighting';
import { createPhysicsWorld } from './physics/world';
import { createField } from './environment/field';
import { Ball } from './entities/ball';
import { Goal, GOAL_DEPTH } from './entities/goal';
import { GoalKeeper } from './entities/goalkeeper';

export class MiniShootout3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly onScoreChange: (score: number) => void;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly goal: Goal;
  private readonly goalKeeper: GoalKeeper;

  private pointerStart: { x: number; y: number } | null = null;
  private pointerStartTime = 0;
  private pointerHistory: Array<{ x: number; y: number; time: number }> = [];
  private isShooting = false;
  private goalScoredThisShot = false;
  private score = 0;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handlePointerDownBound = (event: PointerEvent) => this.handlePointerDown(event);
  private readonly handlePointerMoveBound = (event: PointerEvent) => this.handlePointerMove(event);
  private readonly handlePointerUpBound = (event: PointerEvent) => this.handlePointerUp(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);

  constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
    this.canvas = canvas;
    this.onScoreChange = onScoreChange;

    this.scene = new THREE.Scene();
    this.renderer = createRenderer(canvas);
    this.camera = createPerspectiveCamera();
    configureSceneLighting(this.scene);

    const { world, materials } = createPhysicsWorld();
    this.world = world;

    createField(this.scene, this.world, materials.ground, {
      goalDepth: GOAL_DEPTH,
      frontExtent: 30
    });

    this.ball = new Ball(this.world, materials.ball);
    void this.ball.load(this.scene).catch((error) => {
      console.error('Failed to load ball model', error);
    });

    this.goal = new Goal(this.scene, this.world);
    this.goal.bodies.sensor.addEventListener('collide', this.handleGoalCollisionBound);

    this.goalKeeper = new GoalKeeper(this.scene, this.world, GOAL_DEPTH + 0.8);

    this.attachEventListeners();
    this.animate();
  }

  private handleGoalCollision(event: { body: CANNON.Body }) {
    if (event.body !== this.ball.body || !this.isShooting || this.goalScoredThisShot) return;
    this.goalScoredThisShot = true;
    this.score += 1;
    this.onScoreChange(this.score);
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
  }

  private handlePointerDown(event: PointerEvent) {
    if (this.isShooting) return;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.pointerStartTime = performance.now();
    this.pointerHistory = [{ x: event.clientX, y: event.clientY, time: this.pointerStartTime }];
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.pointerStart || this.isShooting) return;
    const now = performance.now();
    this.pointerHistory.push({ x: event.clientX, y: event.clientY, time: now });
    if (this.pointerHistory.length > 8) {
      this.pointerHistory.shift();
    }
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.pointerStart || this.isShooting) return;

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
    if (flickVector.lengthSq() < 4 && fallback.lengthSq() > 0) {
      flickVector.copy(fallback);
    }
    const flickLength = flickVector.length();
    const flickDuration = Math.max(endTime - flickStart.time, 30);
    const flickSpeed = flickLength / flickDuration;

    this.pointerStart = null;
    this.pointerHistory = [];
    this.isShooting = true;
    this.goalScoredThisShot = false;

    const basePower = THREE.MathUtils.clamp(flickSpeed * 32 + flickLength / 24, 8, 38);

    const direction = flickLength > 0 ? flickVector.clone().normalize() : new THREE.Vector2();
    const verticalComponent = Math.max(-direction.y, 0);
    const loftFactorRaw = THREE.MathUtils.clamp((verticalComponent - 0.25) / 0.55, 0, 1);
    const loftFactor = Math.pow(loftFactorRaw, 1.15);
    const straightBias = 1 - loftFactor;
    const lateralFactor = THREE.MathUtils.clamp(direction.x, -0.85, 0.85);

    const forwardImpulse = -basePower * (1.22 - loftFactor * 0.2);
    const upwardImpulse = basePower * loftFactor * 0.42 + verticalComponent * 1.35;
    const sideImpulse = basePower * lateralFactor * 0.6;

    const impulse = new CANNON.Vec3(sideImpulse, upwardImpulse, forwardImpulse);
    this.ball.body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));

    const spinStrength = basePower * 0.55;
    const sideSpin = -lateralFactor * spinStrength;
    const topSpin =
      loftFactor > 0.6 ? -spinStrength * loftFactor * 0.7 : spinStrength * straightBias * 0.22;
    const rollSpin = lateralFactor * 1.4;
    this.ball.body.angularVelocity.set(sideSpin, rollSpin, topSpin);

    window.setTimeout(() => this.resetShot(), 3000);
  }

  private resetShot() {
    const missed = !this.goalScoredThisShot && this.isShooting;
    this.isShooting = false;

    if (missed && this.score !== 0) {
      this.score = 0;
      this.onScoreChange(this.score);
    }

    this.goalScoredThisShot = false;
    this.pointerStartTime = 0;
    this.pointerHistory = [];
    this.ball.reset();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.goalKeeper.update(deltaTime);
    this.world.step(1 / 60, deltaTime, 3);

    this.ball.syncVisuals();

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
  }
}
