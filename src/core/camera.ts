import * as THREE from 'three';

export function createPerspectiveCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 2000);
//   camera.position.set(8, 5, 0.5);
  camera.position.set(0, 3, 20);
//   camera.lookAt(0, 0, -11);
  camera.lookAt(0, 0, -11);
  return camera;
}
