import * as THREE from 'three';

export function createPerspectiveCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 1.5, 3.2);
  camera.lookAt(0, 0.5, -6);
  return camera;
}
