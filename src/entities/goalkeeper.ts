import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import keeperTextureUrl from '../assets/keeper/wall.png?url';
import { GOALKEEPER_CONFIG } from '../config/players';
import type { KeeperBehaviorConfig } from '../config/difficulty';

const { width: KEEPER_WIDTH, height: KEEPER_HEIGHT, depth: KEEPER_DEPTH } = GOALKEEPER_CONFIG;

export class GoalKeeper {
  public readonly mesh: THREE.Mesh;
  public readonly body: CANNON.Body;

  private readonly pivot = new THREE.Group();
  private readonly debugMesh: THREE.Mesh;
  private readonly debugEdges: THREE.LineSegments;
  private shouldTrack = true;

  private behavior: KeeperBehaviorConfig | null = null;
  private movementTime = 0;
  private patrolPhase = 0;
  private spinAngle = 0;

  constructor(scene: THREE.Scene, world: CANNON.World, depth: number, target: CANNON.Body) {
    void target; // 현재 난이도 시스템에서는 목표 추적을 사용하지 않음

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(keeperTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const geometry = new THREE.PlaneGeometry(KEEPER_WIDTH, KEEPER_HEIGHT);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = KEEPER_HEIGHT / 2;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    const debugGeometry = new THREE.BoxGeometry(KEEPER_WIDTH, KEEPER_HEIGHT, KEEPER_DEPTH);
    const debugMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false
    });
    this.debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
    this.debugMesh.position.y = KEEPER_HEIGHT / 2;
    const debugEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xff6688 });
    const debugEdges = new THREE.LineSegments(new THREE.EdgesGeometry(debugGeometry), debugEdgeMaterial);
    this.debugMesh.add(debugEdges);
    this.debugEdges = debugEdges;
    this.debugMesh.visible = false;
    this.debugMesh.castShadow = false;

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
    if (!this.shouldTrack || !this.behavior) {
      this.body.angularVelocity.set(0, 0, 0);
      this.body.velocity.set(0, 0, 0);
      return;
    }

    this.movementTime += deltaTime;

    switch (this.behavior.type) {
      case 'static':
        // 위치 유지
        break;
      case 'patrol': {
        const speed = this.behavior.patrolSpeed ?? 1.0;
        const min = this.behavior.xRange[0];
        const max = this.behavior.xRange[1];
        const center = (min + max) * 0.5;
        const amplitude = Math.max((max - min) * 0.5, 0);
        const angle = this.patrolPhase + this.movementTime * speed;
        this.setKeeperX(center + amplitude * Math.sin(angle));
        break;
      }
      case 'spin': {
        const spinSpeed = this.behavior.spinSpeed ?? 1.2;
        this.spinAngle = (this.spinAngle + deltaTime * spinSpeed) % (Math.PI * 2);

        const min = this.behavior.xRange[0];
        const max = this.behavior.xRange[1];
        const center = (min + max) * 0.5;
        const amplitude = Math.max((max - min) * 0.5, 0);
        const lateralSpeed = this.behavior.patrolSpeed ?? 0;

        if (amplitude > 0 && lateralSpeed !== 0) {
          const lateralAngle = this.patrolPhase + this.movementTime * lateralSpeed;
          this.setKeeperX(center + amplitude * Math.sin(lateralAngle));
        } else {
          this.setKeeperX(center);
        }

        this.mesh.rotation.set(0, 0, this.spinAngle);
        this.debugMesh.rotation.set(0, 0, this.spinAngle);
        break;
      }
    }

    this.body.angularVelocity.set(0, 0, 0);
    this.body.velocity.set(0, 0, 0);
  }

  setColliderDebugVisible(visible: boolean) {
    this.debugMesh.visible = visible;
  }

  startTracking() {
    this.shouldTrack = true;
  }

  stopTracking() {
    this.shouldTrack = false;
  }

  resetTracking() {
    this.shouldTrack = true;
  }

  applyBehavior(behavior: KeeperBehaviorConfig) {
    this.behavior = behavior;
    this.movementTime = 0;
    this.patrolPhase = 0;
    this.spinAngle = 0;
    this.pivot.rotation.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.debugMesh.rotation.set(0, 0, 0);
    this.mesh.position.y = KEEPER_HEIGHT / 2;
    this.debugMesh.position.y = KEEPER_HEIGHT / 2;

    this.setKeeperZ(behavior.z);
    this.refreshBehaviorState();
  }

  refreshBehaviorState() {
    if (!this.behavior) return;
    this.movementTime = 0;

    if (this.behavior.type === 'patrol' || this.behavior.type === 'spin') {
      this.patrolPhase = Math.random() * Math.PI * 2;
    }

    if (this.behavior.type === 'spin') {
      this.spinAngle = Math.random() * Math.PI * 2;
    }

    switch (this.behavior.type) {
      case 'static':
        this.applyStaticPosition();
        break;
      case 'patrol':
        this.applyPatrolStartPosition();
        break;
      case 'spin':
        this.applySpinStartPosition();
        break;
    }
  }

  private applyStaticPosition() {
    const [min, max] = this.behavior!.xRange;
    const randomX = THREE.MathUtils.lerp(min, max, Math.random());
    this.setKeeperX(randomX);
    this.mesh.rotation.set(0, 0, 0);
    this.debugMesh.rotation.set(0, 0, 0);
    this.mesh.position.y = KEEPER_HEIGHT / 2;
    this.debugMesh.position.y = KEEPER_HEIGHT / 2;
  }

  private applyPatrolStartPosition() {
    const [min, max] = this.behavior!.xRange;
    const center = (min + max) * 0.5;
    const amplitude = Math.max((max - min) * 0.5, 0);
    this.setKeeperX(center + amplitude * Math.sin(this.patrolPhase));
    this.mesh.rotation.set(0, 0, 0);
    this.debugMesh.rotation.set(0, 0, 0);
    this.mesh.position.y = KEEPER_HEIGHT / 2;
    this.debugMesh.position.y = KEEPER_HEIGHT / 2;
  }

  private applySpinStartPosition() {
    const [min, max] = this.behavior!.xRange;
    const center = (min + max) * 0.5;
    const amplitude = Math.max((max - min) * 0.5, 0);

    if (amplitude > 0 && (this.behavior!.patrolSpeed ?? 0) !== 0) {
      this.setKeeperX(center + amplitude * Math.sin(this.patrolPhase));
    } else {
      this.setKeeperX(center);
    }

    this.mesh.position.y = KEEPER_HEIGHT / 2;
    this.debugMesh.position.y = KEEPER_HEIGHT / 2;
    this.mesh.rotation.set(0, 0, this.spinAngle);
    this.debugMesh.rotation.set(0, 0, this.spinAngle);
  }

  dispose() {
    if (this.body.world) {
      this.body.world.removeBody(this.body);
    }

    if (this.pivot.parent) {
      this.pivot.parent.remove(this.pivot);
    }

    this.disposeMaterial(this.mesh.material);
    this.mesh.geometry.dispose();
    this.disposeMaterial(this.debugMesh.material);
    this.debugMesh.geometry.dispose();
    this.disposeMaterial(this.debugEdges.material);
    this.debugEdges.geometry.dispose();
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[]) {
    if (Array.isArray(material)) {
      material.forEach((mat) => mat.dispose());
    } else {
      material.dispose();
    }
  }

  private setKeeperX(x: number) {
    this.pivot.position.x = x;
    this.body.position.x = x;
    this.body.previousPosition.x = x;
    this.body.interpolatedPosition.x = x;
    this.body.aabbNeedsUpdate = true;
    this.body.updateAABB();
  }

  private setKeeperZ(z: number) {
    this.pivot.position.z = z;
    this.body.position.z = z;
    this.body.previousPosition.z = z;
    this.body.interpolatedPosition.z = z;
    this.body.aabbNeedsUpdate = true;
    this.body.updateAABB();
  }
}
