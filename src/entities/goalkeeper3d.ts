import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GOALKEEPER_CONFIG } from '../config/players';
import keeperModelUrl from '../assets/models/goal_keeper/Ch03_nonPBR.fbx?url';
import idleAnimUrl from '../assets/models/goal_keeper/goalkeeper idle.fbx?url';

const { width: KEEPER_WIDTH, height: KEEPER_HEIGHT, depth: KEEPER_DEPTH } = GOALKEEPER_CONFIG;

export class GoalKeeper3D {
  public readonly body: CANNON.Body;

  private readonly pivot = new THREE.Group();
  private readonly debugMesh: THREE.Mesh;
  private readonly localizedLights: THREE.Light[] = [];

  // 애니메이션 시스템
  private mixer: THREE.AnimationMixer | null = null;
  private animations: Map<string, THREE.AnimationClip> = new Map();
  private currentAction: THREE.AnimationAction | null = null;

  constructor(scene: THREE.Scene, world: CANNON.World, depth: number, target: CANNON.Body) {
    void target; // 나중에 사용할 수도 있음

    // 위치 설정
    this.pivot.position.set(0, 0, depth);
    scene.add(this.pivot);
    this.createLocalizedLights();

    // 디버그 콜라이더 메쉬 생성
    const debugGeometry = new THREE.BoxGeometry(KEEPER_WIDTH, KEEPER_HEIGHT, KEEPER_DEPTH);
    debugGeometry.translate(0, KEEPER_HEIGHT / 2, 0); // 바닥에서 시작하도록
    const debugMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false
    });
    this.debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
    const debugEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xff6688 });
    const debugEdges = new THREE.LineSegments(new THREE.EdgesGeometry(debugGeometry), debugEdgeMaterial);
    this.debugMesh.add(debugEdges);
    this.debugMesh.visible = false; // 기본적으로 숨김
    this.pivot.add(this.debugMesh);
    console.log('🔲 디버그 콜라이더 생성:', { width: KEEPER_WIDTH, height: KEEPER_HEIGHT, depth: KEEPER_DEPTH });

    // FBX 모델 로드
    this.loadModel();

    // 물리 바디
    const halfExtents = new CANNON.Vec3(KEEPER_WIDTH / 2, KEEPER_HEIGHT / 2, KEEPER_DEPTH / 2);
    const shape = new CANNON.Box(halfExtents);

    this.body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC
    });
    this.body.position.set(0, 0, depth);
    this.body.addShape(shape, new CANNON.Vec3(0, KEEPER_HEIGHT / 2, 0));
    this.body.angularVelocity.set(0, 0, 0);
    this.body.velocity.set(0, 0, 0);
    world.addBody(this.body);
  }

  private createLocalizedLights() {
    const frontLight = new THREE.SpotLight(0xfff2d5, 1.4, 3.6, Math.PI / 6, 0.35, 2);
    frontLight.position.set(0, 1.4, 1.2);
    frontLight.target.position.set(0, 1.3, 0.1);
    frontLight.castShadow = false;

    const topLight = new THREE.PointLight(0xffffff, 1.1, 2.6, 2);
    topLight.position.set(0, 2.25, 0.2);

    this.localizedLights.push(frontLight, topLight);
    this.pivot.add(frontLight);
    this.pivot.add(frontLight.target);
    this.pivot.add(topLight);
  }

  update(deltaTime: number) {
    // 애니메이션 업데이트
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // 물리 바디 동기화
    this.body.angularVelocity.set(0, 0, 0);
    this.body.velocity.set(0, 0, 0);
  }

  private loadModel() {
    console.log('🔄 FBX 모델 로딩 시작');
    const loader = new FBXLoader();

    loader.load(
      keeperModelUrl,
      (fbx) => {
        console.log('✅ 골키퍼 모델 로드 성공');
        fbx.scale.setScalar(0.01);

        // 재질 설정
        fbx.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const oldMaterial = mesh.material as THREE.Material;
              mesh.material = new THREE.MeshStandardMaterial({
                roughness: 0.7,
                metalness: 0.1
              });
              if ((oldMaterial as any).color) {
                (mesh.material as THREE.MeshStandardMaterial).color = (oldMaterial as any).color;
              }
              if ((oldMaterial as any).map) {
                (mesh.material as THREE.MeshStandardMaterial).map = (oldMaterial as any).map;
              }
            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        this.pivot.add(fbx);

        // 애니메이션 믹서 생성
        this.mixer = new THREE.AnimationMixer(fbx);

        // Idle 애니메이션 로드
        this.loadAnimation('idle', idleAnimUrl);
      },
      undefined,
      (error) => {
        console.error('❌ 모델 로드 실패:', error);
      }
    );
  }

  private loadAnimation(name: string, url: string) {
    const loader = new FBXLoader();
    loader.load(
      url,
      (anim) => {
        console.log(`✅ ${name} 애니메이션 로드 성공`);
        if (anim.animations.length > 0) {
          const clip = anim.animations[0];
          this.animations.set(name, clip);

          // idle 애니메이션이면 자동 재생
          if (name === 'idle') {
            this.playAnimation('idle');
          }
        }
      },
      undefined,
      (error) => {
        console.error(`❌ ${name} 애니메이션 로드 실패:`, error);
      }
    );
  }

  playAnimation(name: string, loop: boolean = true) {
    if (!this.mixer) return;

    const clip = this.animations.get(name);
    if (!clip) {
      console.warn(`애니메이션 '${name}' 없음`);
      return;
    }

    const currentAction = this.currentAction;
    const isSameClip = currentAction?.getClip() === clip;

    if (isSameClip && currentAction) {
      currentAction.paused = false;
      currentAction.enabled = true;
      currentAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      currentAction.play();
      return;
    }

    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }

    const nextAction = this.mixer.clipAction(clip);
    nextAction.reset();
    nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    nextAction.fadeIn(0.2);
    nextAction.play();
    this.currentAction = nextAction;

    console.log(`🎬 애니메이션 재생: ${name}`);
  }

  setColliderDebugVisible(visible: boolean) {
    this.debugMesh.visible = visible;
    console.log('🔍 디버그 콜라이더 표시:', visible);
  }

  startTracking() {
    // 추후 구현: 공 추적 시작
    console.log('🥅 골키퍼 추적 시작');
  }

  stopTracking() {
    // 추후 구현: 세이브 애니메이션 중단 등
    console.log('🥅 골키퍼 추적 중지');
  }

  resetTracking() {
    // Idle 애니메이션으로 복귀
    this.playAnimation('idle');
  }
}
