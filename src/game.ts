import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createRenderer } from './core/graphics';
import { createPerspectiveCamera } from './core/camera';
import { configureSceneLighting } from './core/lighting';
import { createPhysicsWorld } from './physics/world';
import { createField } from './environment/field';
import { Ball } from './entities/ball';
import { Goal } from './entities/goal';

export class MiniShootout3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly onScoreChange: (score: number) => void;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly goal: Goal;

  private pointerStart: { x: number; y: number } | null = null;
  private isShooting = false;
  private goalScoredThisShot = false;
  private score = 0;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handlePointerDownBound = (event: PointerEvent) => this.handlePointerDown(event);
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

    createField(this.scene, this.world, materials.ground);

    this.ball = new Ball(this.world, materials.ball);
    void this.ball.load(this.scene).catch((error) => {
      console.error('Failed to load ball model', error);
    });

    this.goal = new Goal(this.scene, this.world);
    this.goal.bodies.sensor.addEventListener('collide', this.handleGoalCollisionBound);

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
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.pointerStart || this.isShooting) return;

    const end = { x: event.clientX, y: event.clientY };
    const delta = {
      x: end.x - this.pointerStart.x,
      y: end.y - this.pointerStart.y
    };

    this.pointerStart = null;
    this.isShooting = true;
    this.goalScoredThisShot = false;

    const forceMagnitude = 2.2;
    const upwardForce = Math.max(0, -delta.y / 40);
    const sideForce = delta.x / 40;
    const force = new CANNON.Vec3(sideForce, upwardForce, -20 * forceMagnitude);
    this.ball.body.applyImpulse(force, new CANNON.Vec3(0, 0, 0));

    window.setTimeout(() => this.resetShot(), 3000);
  }

  private resetShot() {
    this.isShooting = false;
    this.goalScoredThisShot = false;
    this.ball.reset();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.world.step(1 / 60, deltaTime, 3);

    this.ball.syncVisuals();

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
  }
}
