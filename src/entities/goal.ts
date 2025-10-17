import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const GOAL_WIDTH = 14.6;
const GOAL_HEIGHT = 4.8;
const POST_RADIUS = 0.2;
const GOAL_DEPTH = -15;

export interface GoalBodies {
  leftPost: CANNON.Body;
  rightPost: CANNON.Body;
  crossbar: CANNON.Body;
  sensor: CANNON.Body;
}

export class Goal {
  public readonly bodies: GoalBodies;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.2,
      metalness: 0.8
    });

    const postGeometry = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 16);
    const leftPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    leftPostMesh.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH);
    leftPostMesh.castShadow = true;
    scene.add(leftPostMesh);

    const rightPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rightPostMesh.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH);
    rightPostMesh.castShadow = true;
    scene.add(rightPostMesh);

    const crossbarGeometry = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_WIDTH, 16);
    const crossbarMesh = new THREE.Mesh(crossbarGeometry, postMaterial);
    crossbarMesh.position.set(0, GOAL_HEIGHT, GOAL_DEPTH);
    crossbarMesh.rotation.z = Math.PI / 2;
    crossbarMesh.castShadow = true;
    scene.add(crossbarMesh);

    const postShape = new CANNON.Box(new CANNON.Vec3(POST_RADIUS, GOAL_HEIGHT / 2, POST_RADIUS));
    const crossbarShape = new CANNON.Box(new CANNON.Vec3(GOAL_WIDTH / 2, POST_RADIUS, POST_RADIUS));

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
      shape: crossbarShape,
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
