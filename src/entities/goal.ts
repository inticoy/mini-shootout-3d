import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const GOAL_WIDTH = 6.0;
export const GOAL_HEIGHT = 4.0;
export const POST_RADIUS = 0.2;
export const GOAL_DEPTH = -12;
const CROSSBAR_LENGTH = GOAL_WIDTH + POST_RADIUS * 1.5;

export interface GoalBodies {
  leftPost: CANNON.Body;
  rightPost: CANNON.Body;
  crossbar: CANNON.Body;
  sensor: CANNON.Body;
}

export class Goal {
  public readonly bodies: GoalBodies;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    const postMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf4f6fa,
      roughness: 0.4,
      metalness: 0.0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.15
    });

    const postGeometry = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 32);
    const leftPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    leftPostMesh.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH);
    leftPostMesh.castShadow = true;
    scene.add(leftPostMesh);

    const rightPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rightPostMesh.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH);
    rightPostMesh.castShadow = true;
    scene.add(rightPostMesh);

    const crossbarGeometry = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, CROSSBAR_LENGTH, 32);
    const crossbarMesh = new THREE.Mesh(crossbarGeometry, postMaterial);
    crossbarMesh.position.set(0, GOAL_HEIGHT, GOAL_DEPTH);
    crossbarMesh.rotation.z = Math.PI / 2;
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

    const crossbarBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(CROSSBAR_LENGTH / 2, POST_RADIUS, POST_RADIUS)),
      position: new CANNON.Vec3(0, GOAL_HEIGHT, GOAL_DEPTH)
    });
    world.addBody(crossbarBody);

    const sensorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0.1)),
      position: new CANNON.Vec3(0, GOAL_HEIGHT / 2, GOAL_DEPTH - 0.5)
    });
    sensorBody.collisionResponse = false;
    world.addBody(sensorBody);

    this.bodies = {
      leftPost: leftPostBody,
      rightPost: rightPostBody,
      crossbar: crossbarBody,
      sensor: sensorBody
    };
  }
}
