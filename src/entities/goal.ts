import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BALL_RADIUS } from '../config/ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from '../config/goal';
import { GOAL_NET_CONFIG } from '../config/net';
import { GoalNet } from './goalNet';
import { GoalNetAnimator } from './goalNetAnimator';

const CROSSBAR_LENGTH = GOAL_WIDTH;

export interface GoalBodies {
  leftPost: CANNON.Body;
  rightPost: CANNON.Body;
  rearLeftPost: CANNON.Body;
  rearRightPost: CANNON.Body;
  topLeftBar: CANNON.Body;
  topRightBar: CANNON.Body;
  floorLeft: CANNON.Body;
  floorRight: CANNON.Body;
  floorBack: CANNON.Body;
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
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 0.25,
      clearcoatRoughness: 0.15
    });

    const postWidth = POST_RADIUS * 2;
    const postGeometry = new THREE.BoxGeometry(postWidth, GOAL_HEIGHT, postWidth);
    const rearPostXOffset = GOAL_WIDTH / 2;
    const rearPostZ = GOAL_DEPTH - GOAL_NET_CONFIG.layout.depthBottom;
    const depthSpan = GOAL_NET_CONFIG.layout.depthBottom;
    const floorHeight = postWidth / 2;
    const leftPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    leftPostMesh.position.set(-GOAL_WIDTH / 2, (GOAL_HEIGHT) / 2, GOAL_DEPTH);
    leftPostMesh.castShadow = true;
    scene.add(leftPostMesh);

    const rightPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rightPostMesh.position.set(GOAL_WIDTH / 2, (GOAL_HEIGHT) / 2, GOAL_DEPTH);
    rightPostMesh.castShadow = true;
    scene.add(rightPostMesh);

    const rearLeftPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rearLeftPostMesh.position.set(-rearPostXOffset, GOAL_HEIGHT / 2, rearPostZ);
    rearLeftPostMesh.castShadow = true;
    scene.add(rearLeftPostMesh);

    const rearRightPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rearRightPostMesh.position.set(rearPostXOffset, GOAL_HEIGHT / 2, rearPostZ);
    rearRightPostMesh.castShadow = true;
    scene.add(rearRightPostMesh);

    const sideBarGeometry = new THREE.BoxGeometry(postWidth, postWidth, depthSpan);
    const leftFloorBarMesh = new THREE.Mesh(sideBarGeometry, postMaterial);
    leftFloorBarMesh.position.set(-rearPostXOffset, floorHeight, GOAL_DEPTH - depthSpan / 2);
    leftFloorBarMesh.castShadow = true;
    scene.add(leftFloorBarMesh);

    const rightFloorBarMesh = new THREE.Mesh(sideBarGeometry, postMaterial);
    rightFloorBarMesh.position.set(rearPostXOffset, floorHeight, GOAL_DEPTH - depthSpan / 2);
    rightFloorBarMesh.castShadow = true;
    scene.add(rightFloorBarMesh);

    const backBarWidth = rearPostXOffset * 2;
    const backBarGeometry = new THREE.BoxGeometry(backBarWidth, postWidth, postWidth);
    const backFloorBarMesh = new THREE.Mesh(backBarGeometry, postMaterial);
    backFloorBarMesh.position.set(0, floorHeight, rearPostZ);
    backFloorBarMesh.castShadow = true;
    scene.add(backFloorBarMesh);

    const topBarGeometry = new THREE.BoxGeometry(postWidth, postWidth, depthSpan);
    const leftTopBarMesh = new THREE.Mesh(topBarGeometry, postMaterial);
    leftTopBarMesh.position.set(-rearPostXOffset, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2);
    leftTopBarMesh.castShadow = true;
    scene.add(leftTopBarMesh);

    const rightTopBarMesh = new THREE.Mesh(topBarGeometry, postMaterial);
    rightTopBarMesh.position.set(rearPostXOffset, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2);
    rightTopBarMesh.castShadow = true;
    scene.add(rightTopBarMesh);

    const crossbarGeometry = new THREE.BoxGeometry(CROSSBAR_LENGTH, postWidth, postWidth);
    const crossbarMesh = new THREE.Mesh(crossbarGeometry, postMaterial);
    crossbarMesh.position.set(0, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH);
    crossbarMesh.castShadow = true;
    scene.add(crossbarMesh);

    const postShape = new CANNON.Box(new CANNON.Vec3(POST_RADIUS, GOAL_HEIGHT / 2, POST_RADIUS));

    const leftPostBody = new CANNON.Body({
      mass: 0,
      shape: postShape,
      position: new CANNON.Vec3(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH)
    });
    world.addBody(leftPostBody);

    const rightPostBody = new CANNON.Body({
      mass: 0,
      shape: postShape,
      position: new CANNON.Vec3(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH)
    });
    world.addBody(rightPostBody);

    const floorBarShape = new CANNON.Box(new CANNON.Vec3(postWidth / 2, postWidth / 2, depthSpan / 2));

    const floorLeftBody = new CANNON.Body({
      mass: 0,
      shape: floorBarShape,
      position: new CANNON.Vec3(-rearPostXOffset, floorHeight, GOAL_DEPTH - depthSpan / 2)
    });
    world.addBody(floorLeftBody);

    const floorRightBody = new CANNON.Body({
      mass: 0,
      shape: floorBarShape,
      position: new CANNON.Vec3(rearPostXOffset, floorHeight, GOAL_DEPTH - depthSpan / 2)
    });
    world.addBody(floorRightBody);

    const backBarShape = new CANNON.Box(new CANNON.Vec3(backBarWidth / 2, postWidth / 2, postWidth / 2));

    const floorBackBody = new CANNON.Body({
      mass: 0,
      shape: backBarShape,
      position: new CANNON.Vec3(0, floorHeight, rearPostZ)
    });
    world.addBody(floorBackBody);

    const topBarShape = new CANNON.Box(new CANNON.Vec3(postWidth / 2, postWidth / 2, depthSpan / 2));

    const topLeftBody = new CANNON.Body({
      mass: 0,
      shape: topBarShape,
      position: new CANNON.Vec3(-rearPostXOffset, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2)
    });
    world.addBody(topLeftBody);

    const topRightBody = new CANNON.Body({
      mass: 0,
      shape: topBarShape,
      position: new CANNON.Vec3(rearPostXOffset, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2)
    });
    world.addBody(topRightBody);

    const rearLeftPostBody = new CANNON.Body({
      mass: 0,
      shape: postShape,
      position: new CANNON.Vec3(-rearPostXOffset, GOAL_HEIGHT / 2, rearPostZ)
    });
    world.addBody(rearLeftPostBody);

    const rearRightPostBody = new CANNON.Body({
      mass: 0,
      shape: postShape,
      position: new CANNON.Vec3(rearPostXOffset, GOAL_HEIGHT / 2, rearPostZ)
    });
    world.addBody(rearRightPostBody);

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
      rearLeftPost: rearLeftPostBody,
      rearRightPost: rearRightPostBody,
      topLeftBar: topLeftBody,
      topRightBar: topRightBody,
      floorLeft: floorLeftBody,
      floorRight: floorRightBody,
      floorBack: floorBackBody,
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

    const postWidth = POST_RADIUS * 2;
    const frameThickness = Math.max(postWidth * 0.75, 0.02);
    const halfFrameThickness = frameThickness / 2;

    const netHeight = Math.max(bounds.maxY - bounds.minY, 0.1);
    const netCenterY = (bounds.maxY + bounds.minY) / 2;
    const depthSpan = GOAL_NET_CONFIG.layout.depthBottom;
    const rearPostZ = GOAL_DEPTH - depthSpan;
    const midZ = GOAL_DEPTH - depthSpan / 2;
    const interiorHalfWidth = Math.max(GOAL_WIDTH / 2 - halfFrameThickness, halfFrameThickness);

    const backHalfExtents = new CANNON.Vec3(interiorHalfWidth, netHeight / 2, halfFrameThickness);
    const backCenter = new CANNON.Vec3(0, netCenterY, rearPostZ);
    this.addNetCollider(world, netMaterial, backHalfExtents, backCenter);

    const sideHalfExtents = new CANNON.Vec3(halfFrameThickness, netHeight / 2, depthSpan / 2);
    const leftCenter = new CANNON.Vec3(-GOAL_WIDTH / 2 + halfFrameThickness, netCenterY, midZ);
    const rightCenter = new CANNON.Vec3(GOAL_WIDTH / 2 - halfFrameThickness, netCenterY, midZ);
    this.addNetCollider(world, netMaterial, sideHalfExtents, leftCenter);
    this.addNetCollider(world, netMaterial, sideHalfExtents, rightCenter);

    const topHalfExtents = new CANNON.Vec3(interiorHalfWidth, halfFrameThickness, depthSpan / 2);
    const topCenter = new CANNON.Vec3(0, GOAL_HEIGHT - POST_RADIUS - halfFrameThickness, midZ);
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
