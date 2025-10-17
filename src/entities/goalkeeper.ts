import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const KEEPER_WIDTH = 1.2;
const KEEPER_HEIGHT = 3.8;
const KEEPER_DEPTH = 0.6;
const ROTATION_RANGE = Math.PI / 2; // ±90 degrees
const ROTATION_SPEED = 6.0; // radians per second (controls sweep speed)

export class GoalKeeper {
  public readonly mesh: THREE.Mesh;
  public readonly body: CANNON.Body;

  private elapsed = 0;
  private readonly rotationHelper = new THREE.Quaternion();
  private readonly tempAxis = new THREE.Vector3(0, 0, 1);
  private readonly pivot = new THREE.Group();

  constructor(scene: THREE.Scene, world: CANNON.World, depth: number) {
    const geometry = new THREE.BoxGeometry(KEEPER_WIDTH, KEEPER_HEIGHT, KEEPER_DEPTH);
    geometry.translate(0, KEEPER_HEIGHT / 2, 0);

    const material = new THREE.MeshStandardMaterial({
      color: 0xa7b3ff,
      metalness: 0.15,
      roughness: 0.55
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.pivot.position.set(0, 0, depth);
    this.pivot.add(this.mesh);
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
    this.elapsed += deltaTime;
    const angle = Math.sin(this.elapsed * ROTATION_SPEED) * ROTATION_RANGE;

    this.rotationHelper.setFromAxisAngle(this.tempAxis, angle);
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
}
