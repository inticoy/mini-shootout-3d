import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import keeperTextureUrl from '../assets/keeper/keeper-korea.png?url';
import { BALL_RADIUS } from './ball';

const KEEPER_WIDTH = 1.2;
const KEEPER_HEIGHT = 3.7;
const KEEPER_DEPTH = 0.4;
const ROTATION_RANGE = Math.PI / 2; // ±90 degrees allowable lean
// const RESPONSE_SPEED = 50; // how quickly keeper follows target angle

export class GoalKeeper {
  public readonly mesh: THREE.Mesh;
  public readonly body: CANNON.Body;

  private readonly targetBody: CANNON.Body;
  private readonly rotationHelper = new THREE.Quaternion();
  private readonly tempAxis = new THREE.Vector3(0, 0, 1);
  private readonly pivot = new THREE.Group();
  private readonly debugMesh: THREE.Mesh;
  private shouldTrack = true;
  private currentAngle = 0;

  constructor(scene: THREE.Scene, world: CANNON.World, depth: number, target: CANNON.Body) {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(keeperTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const geometry = new THREE.PlaneGeometry(KEEPER_WIDTH, KEEPER_HEIGHT);
    geometry.translate(0, KEEPER_HEIGHT / 2, 0);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    const debugGeometry = new THREE.BoxGeometry(KEEPER_WIDTH, KEEPER_HEIGHT, KEEPER_DEPTH);
    debugGeometry.translate(0, KEEPER_HEIGHT / 2, 0);
    const debugMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      wireframe: true
    });
    this.debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
    this.debugMesh.visible = false;

    this.targetBody = target;
    this.pivot.position.set(0, 0, depth);
    this.pivot.add(this.mesh);
    this.pivot.add(this.debugMesh);
    scene.add(this.pivot);

    const halfExtents = new CANNON.Vec3(KEEPER_WIDTH / 2, KEEPER_HEIGHT / 2, KEEPER_DEPTH / 2);
    const shape = new CANNON.Box(halfExtents);

    this.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    this.body.position.set(0, 0, depth);
    this.body.addShape(shape, new CANNON.Vec3(0, KEEPER_HEIGHT / 2, 0));
    this.body.angularVelocity.set(0, 0, 0);
    this.body.velocity.set(0, 0, 0);
    world.addBody(this.body);
  }

  update(deltaTime: number) {
    if (!this.shouldTrack) return;
    void deltaTime;
    const dx = this.targetBody.position.x - this.body.position.x;
    const surfaceHeight = Math.max(this.targetBody.position.y - BALL_RADIUS, 0.05);
    const ratio = THREE.MathUtils.clamp(-dx / surfaceHeight, -1, 1);
    const rawAngle = Math.asin(ratio);
    const targetAngle = THREE.MathUtils.clamp(rawAngle, -ROTATION_RANGE, ROTATION_RANGE);

    // const lerpFactor = 1 - Math.exp(-RESPONSE_SPEED * deltaTime);
    // this.currentAngle = THREE.MathUtils.lerp(this.currentAngle, targetAngle, lerpFactor);
    this.currentAngle = targetAngle;

    this.rotationHelper.setFromAxisAngle(this.tempAxis, this.currentAngle);
    this.pivot.setRotationFromQuaternion(this.rotationHelper);
    this.body.quaternion.set(
      this.rotationHelper.x,
      this.rotationHelper.y,
      this.rotationHelper.z,
      this.rotationHelper.w
    );
    this.body.angularVelocity.set(0, 0, 0);
    this.body.velocity.set(0, 0, 0);
  }

  setColliderDebugVisible(visible: boolean) {
    this.debugMesh.visible = visible;
  }

  stopTracking() {
    this.shouldTrack = false;
  }

  resetTracking() {
    this.shouldTrack = true;
  }
}
