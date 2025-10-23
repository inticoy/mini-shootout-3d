import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BALL_CONFIG, BALL_RADIUS, BALL_START_POSITION } from '../config/ball';
import type { BallTheme } from '../config/ball';

const START_POSITION = new CANNON.Vec3(
  BALL_START_POSITION.x,
  BALL_START_POSITION.y,
  BALL_START_POSITION.z
);

export class Ball {
  private readonly rotationHelper = new THREE.Quaternion();
  private theme: BallTheme;
  private scene: THREE.Scene | null = null;
  private loadingManager: THREE.LoadingManager | null = null;

  public readonly body: CANNON.Body;
  public mesh: THREE.Object3D | null = null;

  constructor(world: CANNON.World, material: CANNON.Material, theme?: BallTheme) {
    this.theme = theme ?? BALL_CONFIG.theme;

    this.body = new CANNON.Body({
      mass: BALL_CONFIG.mass,
      shape: new CANNON.Sphere(BALL_RADIUS),
      position: START_POSITION.clone(),
      material,
      linearDamping: BALL_CONFIG.linearDamping,
      angularDamping: BALL_CONFIG.angularDamping
    });
    world.addBody(this.body);
  }

  async load(scene: THREE.Scene, manager: THREE.LoadingManager = THREE.DefaultLoadingManager): Promise<void> {
    this.scene = scene;
    this.loadingManager = manager;

    const loader = new GLTFLoader(manager);
    // 테마에서 직접 모델 URL 가져오기
    const gltf = await loader.loadAsync(this.theme.modelUrl);
    const mesh = this.prepareVisual(gltf.scene);
    scene.add(mesh);
    this.mesh = mesh;
    this.syncVisuals();
  }

  async changeTheme(newTheme: BallTheme): Promise<void> {
    if (!this.scene || !this.loadingManager) {
      throw new Error('Ball must be loaded before changing theme. Call load() first.');
    }

    // 기존 메시 제거
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }

    // 새 테마 설정
    this.theme = newTheme;

    // 새 메시 로드
    const loader = new GLTFLoader(this.loadingManager);
    const gltf = await loader.loadAsync(this.theme.modelUrl);
    const mesh = this.prepareVisual(gltf.scene);
    this.scene.add(mesh);
    this.mesh = mesh;
    this.syncVisuals();
  }

  getTheme(): BallTheme {
    return this.theme;
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

    // 테마별 스케일 적용
    model.scale.setScalar(this.theme.gltfScale);
    model.position.set(START_POSITION.x, START_POSITION.y, START_POSITION.z);

    return model;
  }

  private adjustMaterial(material: THREE.Material | THREE.Material[]): void {
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((mat) => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        // GLB 파일의 원본 머티리얼 색상과 속성을 그대로 사용
        // 텍스처가 있는 경우에만 colorSpace 설정
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
        }

        // 테마별 material 속성 오버라이드 (있는 경우)
        if (this.theme.material) {
          if (this.theme.material.roughness !== undefined) {
            mat.roughness = this.theme.material.roughness;
          }
          if (this.theme.material.metalness !== undefined) {
            mat.metalness = this.theme.material.metalness;
          }
        }

        mat.needsUpdate = true;
      }
    });
  }
}
