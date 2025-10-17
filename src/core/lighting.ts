import * as THREE from 'three';

export interface SceneLighting {
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
  point: THREE.PointLight;
}

export function configureSceneLighting(scene: THREE.Scene): SceneLighting {
  scene.fog = new THREE.Fog(0x2a6f47, 50, 150);

  const ambient = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 3.0);
  directional.position.set(-20, 40, 50);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.left = -50;
  directional.shadow.camera.right = 50;
  directional.shadow.camera.top = 50;
  directional.shadow.camera.bottom = -50;
  scene.add(directional);

  const point = new THREE.PointLight(0xffffff, 1.5, 100);
  point.position.set(10, 10, 10);
  scene.add(point);

  return { ambient, directional, point };
}
