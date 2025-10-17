import * as THREE from 'three';

export function createPerspectiveCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2.5, 20);
  camera.lookAt(0, 0, 0);
  return camera;
}
