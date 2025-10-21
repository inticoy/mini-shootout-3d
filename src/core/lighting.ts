import * as THREE from 'three';

export interface SceneLighting {
  ambient: THREE.AmbientLight;
  hemisphere: THREE.HemisphereLight;
  directional: THREE.DirectionalLight;
  point: THREE.PointLight;
}

export function configureSceneLighting(scene: THREE.Scene): SceneLighting {
  scene.fog = new THREE.Fog(0x2a6f47, 50, 150);

  const ambient = new THREE.AmbientLight(0xffffff, 0.99);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xd8f1de, 0x3a6b46, 0.6);
  scene.add(hemisphere);

  const directional = new THREE.DirectionalLight(0xffffff, 1.);
  directional.position.set(5, 20, 5);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.left = -35;
  directional.shadow.camera.right = 35;
  directional.shadow.camera.top = 35;
  directional.shadow.camera.bottom = -35;
  directional.shadow.radius = 9;
  directional.shadow.bias = -0.0002;
  directional.shadow.normalBias = 0.03;
  scene.add(directional);

  const point = new THREE.PointLight(0xffffff, 10, 120);
  point.position.set(-6, 12, 18);
  point.castShadow = true;
  point.shadow.mapSize.width = 1024;
  point.shadow.mapSize.height = 1024;
  point.shadow.bias = -0.0003;
  scene.add(point);

  const rim = new THREE.PointLight(0xb0d8ff, 10, 90);
  rim.position.set(-12, 15, -5);
  scene.add(rim);

  return { ambient, hemisphere, directional, point };
}
