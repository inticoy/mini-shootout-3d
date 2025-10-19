import * as THREE from 'three';

export function createPerspectiveCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 3, 10);
  camera.lookAt(0, 0, -6);
  return camera;
}
