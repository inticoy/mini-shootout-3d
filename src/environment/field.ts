import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface Field {
  groundMesh: THREE.Mesh;
  stripeMeshes: THREE.Mesh[];
  verticalStripes: THREE.Mesh[];
  groundBody: CANNON.Body;
}

export interface FieldOptions {
  goalDepth?: number;
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
      color: 0x2E7D32,  // Hex(2E7D32)로 설정
      roughness: 1.0,
      metalness: 0.0
    })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const stripeMeshes: THREE.Mesh[] = [];
  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x32CD32,  // 밝은 초록색 (축구 필드 줄무늬처럼)
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.5
  });
  const stripeWidth = options.stripeWidth ?? 5;
  const stripeDepth = 100;
  const stripeCenterX = 0;

  for (let i = -50; i < 50; i += stripeWidth * 2) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(stripeWidth, stripeDepth),
      stripeMaterial
    );
    stripe.position.set(stripeCenterX, 0.01, i + stripeWidth / 2);
    stripe.rotation.x = -Math.PI / 2;
    stripe.rotation.z = Math.PI / 2;
    stripe.receiveShadow = true;
    scene.add(stripe);
    stripeMeshes.push(stripe);
  }

  const verticalStripes: THREE.Mesh[] = [];
  const verticalStripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x32CD32,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.5,
    depthWrite: false  // 겹치는 부분에서도 보이게
  });
  const verticalStripeDepth = 100;  // 골대 앞쪽 길이
  const stripeCenterZ = 0;  // 중앙 위치

  for (let i = -50; i < 50; i += stripeWidth * 2) {
    const verticalStripe = new THREE.Mesh(
      new THREE.PlaneGeometry(stripeWidth, verticalStripeDepth),
      verticalStripeMaterial
    );
    verticalStripe.position.set(i + stripeWidth / 2, 0.03, stripeCenterZ);
    verticalStripe.rotation.x = -Math.PI / 2;
    verticalStripe.receiveShadow = true;
    scene.add(verticalStripe);
    verticalStripes.push(verticalStripe);
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
    verticalStripes,
    groundBody
  };
}
