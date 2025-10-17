import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface Field {
  groundMesh: THREE.Mesh;
  stripeMeshes: THREE.Mesh[];
  groundBody: CANNON.Body;
}

export interface FieldOptions {
  goalDepth?: number;
  frontExtent?: number;
  stripeWidth?: number;
}

export function createField(
  scene: THREE.Scene,
  world: CANNON.World,
  groundMaterial: CANNON.Material,
  options: FieldOptions = {}
): Field {
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
      color: 0x3a8f5a,
      roughness: 0.8,
      metalness: 0.2
    })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const stripeMeshes: THREE.Mesh[] = [];
  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x419c65,
    roughness: 0.8,
    metalness: 0.2
  });
  const stripeWidth = options.stripeWidth ?? 5;
  const goalDepth = options.goalDepth ?? -22;
  const backExtent = Math.abs(goalDepth);
  const frontExtent = options.frontExtent ?? 28;
  const stripeDepth = frontExtent + backExtent;
  const stripeCenterZ = (frontExtent - backExtent) / 2;

  for (let i = -50; i < 50; i += stripeWidth * 2) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(stripeWidth, stripeDepth),
      stripeMaterial
    );
    stripe.position.set(i + stripeWidth / 2, 0.01, stripeCenterZ);
    stripe.rotation.x = -Math.PI / 2;
    stripe.receiveShadow = true;
    scene.add(stripe);
    stripeMeshes.push(stripe);
  }

  const groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: groundMaterial
  });
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);

  return {
    groundMesh,
    stripeMeshes,
    groundBody
  };
}
