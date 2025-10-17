import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gltfModel from '../assets/gltf/soccer_ball.gltf?url';
import gltfBinary from '../assets/gltf/soccer_ball.bin?url';
import baseColorTexture from '../assets/gltf/soccer_ball_mat_bcolor.png?url';
import normalTexture from '../assets/gltf/soccer_ball_Normal.png?url';
import metallicRoughnessTexture from '../assets/gltf/soccer_ball_Metallic-soccer_ball_Roughness.png?url';

export const BALL_RADIUS = 0.35;
const GLTF_SCALE = 0.05;
const START_POSITION = new CANNON.Vec3(0, BALL_RADIUS, 0);

export class Ball {
  private readonly rotationHelper = new THREE.Quaternion();

  public readonly body: CANNON.Body;
  public mesh: THREE.Object3D | null = null;

  constructor(world: CANNON.World, material: CANNON.Material) {
    this.body = new CANNON.Body({
      mass: 1.2,
      shape: new CANNON.Sphere(BALL_RADIUS),
      position: START_POSITION.clone(),
      material,
      linearDamping: 0.1,
      angularDamping: 0.9
    });
    world.addBody(this.body);
  }

  async load(scene: THREE.Scene): Promise<void> {
    const assetMap = new Map<string, string>([
      ['soccer_ball.bin', gltfBinary],
      ['soccer_ball_mat_bcolor.png', baseColorTexture],
      ['soccer_ball_Normal.png', normalTexture],
      ['soccer_ball_Metallic-soccer_ball_Roughness.png', metallicRoughnessTexture]
    ]);

    const urlModifier = (url: string) => {
      const key = url.split('/').pop() ?? url;
      return assetMap.get(key) ?? url;
    };

    const manager = new THREE.LoadingManager();
    manager.setURLModifier(urlModifier);

    const loader = new GLTFLoader(manager);
    const gltf = await loader.loadAsync(gltfModel);
    const mesh = this.prepareVisual(gltf.scene);
    scene.add(mesh);
    this.mesh = mesh;
    this.syncVisuals();
  }

  reset(): void {
    this.body.position.copy(START_POSITION);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);
    this.body.torque.set(0, 0, 0);
    this.syncVisuals();
  }

  syncVisuals(): void {
    if (!this.mesh) return;
    const { x, y, z } = this.body.position;
    this.mesh.position.set(x, y, z);
    this.rotationHelper.set(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    );
    this.mesh.setRotationFromQuaternion(this.rotationHelper);
  }

  private prepareVisual(model: THREE.Object3D): THREE.Object3D {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.updateWorldMatrix(true, true);
        const geometry = child.geometry.clone();
        geometry.applyMatrix4(child.matrixWorld);
        geometry.center();
        child.geometry = geometry;
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        child.scale.setScalar(1);
        child.castShadow = true;
        this.adjustMaterial(child.material);
      }
    });

    model.scale.setScalar(GLTF_SCALE);
    model.position.set(START_POSITION.x, START_POSITION.y, START_POSITION.z);

    return model;
  }

  private adjustMaterial(material: THREE.Material | THREE.Material[]): void {
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((mat) => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.metalness = 0.0;
        mat.roughness = 0.95;
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
        }
        mat.color.multiplyScalar(3.8);
        mat.needsUpdate = true;
      }
    });
  }
}
