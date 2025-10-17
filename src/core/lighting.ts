import * as THREE from 'three';

export interface SceneLighting {
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
  point: THREE.PointLight;
}

export function configureSceneLighting(scene: THREE.Scene): SceneLighting {
  scene.fog = new THREE.Fog(0x2a6f47, 50, 150);

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 2.5);
  directional.position.set(-20, 40, 50);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.left = -50;
  directional.shadow.camera.right = 50;
  directional.shadow.camera.top = 50;
  directional.shadow.camera.bottom = -50;
  directional.shadow.radius = 4;
  scene.add(directional);

  const point = new THREE.PointLight(0xffffff, 45, 110);
  point.position.set(10, 10, 10);
  point.castShadow = true;
  scene.add(point);

  const rim = new THREE.PointLight(0xb0d8ff, 10, 90);
  rim.position.set(-12, 15, -5);
  scene.add(rim);

  return { ambient, directional, point };
}
