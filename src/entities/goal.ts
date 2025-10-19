import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BALL_RADIUS } from '../config/ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from '../config/goal';
import { GoalNet } from './goalNet';
import { GoalNetAnimator } from './goalNetAnimator';

const CROSSBAR_LENGTH = GOAL_WIDTH;

export interface GoalBodies {
  leftPost: CANNON.Body;
  rightPost: CANNON.Body;
  crossbar: CANNON.Body;
  sensor: CANNON.Body;
  netPanels: readonly CANNON.Body[];
}

export class Goal {
  public readonly bodies: GoalBodies;
  public readonly net: GoalNet;
  public readonly netAnimator: GoalNetAnimator;
  private netAnimationEnabled = false;
  private readonly netColliders: CANNON.Body[] = [];
  private readonly netColliderInfos: Array<{ size: THREE.Vector3; position: THREE.Vector3 }> = [];
  private readonly netImpactPoint = new THREE.Vector3();

  constructor(scene: THREE.Scene, world: CANNON.World, ballMaterial: CANNON.Material) {
    const postMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf4f6fa,
      roughness: 0.4,
      metalness: 0.0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.15
    });

    const postGeometry = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 32);
    const leftPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    leftPostMesh.position.set(-GOAL_WIDTH / 2, (GOAL_HEIGHT) / 2, GOAL_DEPTH);
    leftPostMesh.castShadow = true;
    scene.add(leftPostMesh);

    const rightPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rightPostMesh.position.set(GOAL_WIDTH / 2, (GOAL_HEIGHT) / 2, GOAL_DEPTH);
    rightPostMesh.castShadow = true;
    scene.add(rightPostMesh);

    const crossbarGeometry = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, CROSSBAR_LENGTH, 32);
    const crossbarMesh = new THREE.Mesh(crossbarGeometry, postMaterial);
    crossbarMesh.position.set(0, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH);
    crossbarMesh.rotation.z = Math.PI / 2;
    crossbarMesh.castShadow = true;
    scene.add(crossbarMesh);

    const postShape = new CANNON.Box(new CANNON.Vec3(POST_RADIUS, (GOAL_HEIGHT - POST_RADIUS) / 2, POST_RADIUS));

    const leftPostBody = new CANNON.Body({
      mass: 0,
      shape: postShape,
      position: new CANNON.Vec3(-GOAL_WIDTH / 2, (GOAL_HEIGHT - POST_RADIUS) / 2, GOAL_DEPTH)
    });
    world.addBody(leftPostBody);

    const rightPostBody = new CANNON.Body({
      mass: 0,
      shape: postShape,
      position: new CANNON.Vec3(GOAL_WIDTH / 2, (GOAL_HEIGHT - POST_RADIUS) / 2, GOAL_DEPTH)
    });
    world.addBody(rightPostBody);

    const crossbarBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(CROSSBAR_LENGTH / 2, POST_RADIUS, POST_RADIUS)),
      position: new CANNON.Vec3(0, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH)
    });
    world.addBody(crossbarBody);

    const sensorWidth = Math.max(GOAL_WIDTH - POST_RADIUS * 2, 0.1);
    const sensorHeight = Math.max(GOAL_HEIGHT - POST_RADIUS * 1.8, 0.1);
    const sensorDepth = BALL_RADIUS * 0.6;
    const sensorOffset = -(sensorDepth * 0.5 + BALL_RADIUS);
    const sensorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(sensorWidth / 2, sensorHeight / 2, sensorDepth / 2)),
      position: new CANNON.Vec3(0, sensorHeight / 2, GOAL_DEPTH + sensorOffset)
    });
    sensorBody.collisionResponse = false;
    world.addBody(sensorBody);

    this.bodies = {
      leftPost: leftPostBody,
      rightPost: rightPostBody,
      crossbar: crossbarBody,
      sensor: sensorBody,
      netPanels: this.netColliders
    };
    this.net = new GoalNet(scene);
    this.netAnimator = new GoalNetAnimator(this.net);
    this.createNetColliders(world, ballMaterial);
  }

  update(deltaTime: number): void {
    if (this.netAnimationEnabled) {
      this.netAnimator.update(deltaTime);
    }
  }

  resetNet(): void {
    this.netAnimator.reset();
  }

  setNetAnimationEnabled(enabled: boolean): void {
    this.netAnimationEnabled = enabled;
    this.netAnimator.setIdleEnabled(enabled);
    if (!enabled) {
      this.netAnimator.reset();
    }
  }

  triggerNetPulse(worldPoint: THREE.Vector3, strength: number): void {
    this.netAnimator.triggerPulse(worldPoint, strength);
  }

  isNetCollider(body: CANNON.Body): boolean {
    return this.netColliders.includes(body);
  }

  handleNetCollision(ballBody: CANNON.Body): void {
    const speedSq = ballBody.velocity.lengthSquared();
    if (speedSq > 0) {
      ballBody.velocity.scale(0.3, ballBody.velocity);
    }
    if (ballBody.angularVelocity.lengthSquared() > 0) {
      ballBody.angularVelocity.scale(0.45, ballBody.angularVelocity);
    }

    this.netImpactPoint.set(ballBody.position.x, ballBody.position.y, ballBody.position.z);
    const strength = THREE.MathUtils.clamp(Math.sqrt(speedSq) / 10, 0.25, 1.4);
    this.netAnimator.triggerPulse(this.netImpactPoint, strength);
  }

  getNetColliderInfos(): ReadonlyArray<{ size: THREE.Vector3; position: THREE.Vector3 }> {
    return this.netColliderInfos;
  }

  private createNetColliders(world: CANNON.World, ballMaterial: CANNON.Material): void {
    const bounds = this.net.restBounds;
    const netMaterial = new CANNON.Material('goalNet');
    const contact = new CANNON.ContactMaterial(ballMaterial, netMaterial, {
      restitution: 0.05,
      friction: 0.6
    });
    world.addContactMaterial(contact);

    const backThickness = BALL_RADIUS * 0.6;
    const backWidth = Math.max(bounds.maxX - bounds.minX, 0.1);
    const backHeight = Math.max(bounds.maxY - bounds.minY, 0.1);
    const centerX = (bounds.maxX + bounds.minX) / 2;
    const centerY = (bounds.maxY + bounds.minY) / 2;
    const backZ = GOAL_DEPTH + bounds.minZ - backThickness / 2;
    const depthSpan = Math.max(bounds.maxZ - bounds.minZ, 0.1);
    const midZ = GOAL_DEPTH + (bounds.maxZ + bounds.minZ) / 2;

    const backHalfExtents = new CANNON.Vec3(backWidth / 2, backHeight / 2, backThickness / 2);
    const backCenter = new CANNON.Vec3(centerX, centerY, backZ);
    this.addNetCollider(world, netMaterial, backHalfExtents, backCenter);

    const sideThickness = BALL_RADIUS * 0.45;
    const sideHeight = backHeight;
    const sideHalfExtents = new CANNON.Vec3(sideThickness / 2, sideHeight / 2, depthSpan / 2);
    const sideCenterZ = midZ;

    const leftCenter = new CANNON.Vec3(bounds.minX - sideThickness / 2, centerY, sideCenterZ);
    const rightCenter = new CANNON.Vec3(bounds.maxX + sideThickness / 2, centerY, sideCenterZ);
    this.addNetCollider(world, netMaterial, sideHalfExtents, leftCenter);
    this.addNetCollider(world, netMaterial, sideHalfExtents, rightCenter);

    const topThickness = BALL_RADIUS * 0.45;
    const topHalfExtents = new CANNON.Vec3(backWidth / 2, topThickness / 2, depthSpan / 2);
    const topCenter = new CANNON.Vec3(centerX, bounds.maxY + topThickness / 2, sideCenterZ);
    this.addNetCollider(world, netMaterial, topHalfExtents, topCenter);
  }

  private addNetCollider(
    world: CANNON.World,
    material: CANNON.Material,
    halfExtents: CANNON.Vec3,
    center: CANNON.Vec3
  ): void {
    const body = new CANNON.Body({
      mass: 0,
      material,
      position: new CANNON.Vec3(center.x, center.y, center.z)
    });
    body.addShape(new CANNON.Box(halfExtents));
    world.addBody(body);
    this.netColliders.push(body);
    this.netColliderInfos.push({
      size: new THREE.Vector3(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2),
      position: new THREE.Vector3(center.x, center.y, center.z)
    });
  }
}
