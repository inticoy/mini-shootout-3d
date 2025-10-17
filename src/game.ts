import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gltfModel from './assets/gltf/soccer_ball.gltf?url';

export class MiniShootout3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly onScoreChange: (score: number) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private world!: CANNON.World;

  private ballMesh!: THREE.Object3D;
  private ballBody!: CANNON.Body;

  private groundMesh!: THREE.Mesh;
  private groundBody!: CANNON.Body;

  private goalSensorBody!: CANNON.Body;

  private groundMaterial!: CANNON.Material;
  private ballMaterial!: CANNON.Material;

  private isShooting = false;
  private goalScoredThisShot = false;

  private score = 0;
  private clock = new THREE.Clock();
  private pointerStart: { x: number; y: number } | null = null;

  private readonly handleResizeBound = this.handleResize.bind(this);
  private readonly handlePointerDownBound = this.handlePointerDown.bind(this);
  private readonly handlePointerUpBound = this.handlePointerUp.bind(this);

  constructor(canvas: HTMLCanvasElement, onScoreChange: (score: number) => void) {
    this.canvas = canvas;
    this.onScoreChange = onScoreChange;

    this.initGraphics();
    this.initPhysics();
    this.createScene();
    this.attachEventListeners();

    this.animate();
  }

  private initGraphics() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2.5, 20);
    this.camera.lookAt(0, 0, 0);
  }

  private initPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -30, 0)
    });

    this.groundMaterial = new CANNON.Material('ground');
    this.ballMaterial = new CANNON.Material('ball');

    const contactMaterial = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.ballMaterial,
      {
        restitution: 0.65, // bounciness
        friction: 0.4
      }
    );
    this.world.addContactMaterial(contactMaterial);
  }

  private createStripedGround() {
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a8f5a,
      roughness: 0.8,
      metalness: 0.2
    });

    this.groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      groundMaterial
    );
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0x419c65,
      roughness: 0.8,
      metalness: 0.2
    });
    const stripeWidth = 5;
    for (let i = -50; i < 50; i += stripeWidth * 2) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(stripeWidth, 100),
        stripeMaterial
      );
      stripe.position.set(i + stripeWidth / 2, 0.01, 0);
      stripe.rotation.x = -Math.PI / 2;
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }
  }

  private createScene() {
    // Lighting & Fog
    this.scene.fog = new THREE.Fog(0x2a6f47, 50, 150);
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
    directionalLight.position.set(-20, 40, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);

    // 추가 포인트 라이트
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);

    // Ground
    this.createStripedGround();
    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this.groundMaterial
    });
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(this.groundBody);

    // Ball
    const ballRadius = 0.35;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      gltfModel,
      (gltf) => {
        // GLTF scene의 transform을 완전히 리셋하고 geometry를 center시킴
        const scene = gltf.scene;
        
        // 모든 메쉬의 geometry를 world space로 변환하고 center시키기
        scene.traverse((child) => {
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
            
            // PBR 머티리얼 반짝거림 조정 및 밝기 향상
            if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.metalness = 0.3; // 메탈릭 효과 줄임
              child.material.roughness = 0.7; // 러프니스 높여서 반짝거림 줄임
              child.material.color.multiplyScalar(2.5); // 베이스 컬러 밝기 증가
              child.material.needsUpdate = true;
            }
          }
        });
        
        // scene의 transform 리셋
        scene.position.set(0, 0, 0);
        scene.rotation.set(0, 0, 0);
        scene.scale.setScalar(0.05);
        scene.position.y = 0.35; // 물리 엔진의 구체 높이에 맞춤
        
        this.ballMesh = scene;
        this.scene.add(this.ballMesh);
        console.log('GLTF loaded with centered geometry');
      },
      (progress) => {
        console.log('GLTF loading progress:', progress);
      },
      (error) => {
        console.error('Error loading GLTF model:', error);
      }
    );

    // Physics body (still using sphere for collision)
    this.ballBody = new CANNON.Body({
      mass: 1.2,
      shape: new CANNON.Sphere(ballRadius),
      position: new CANNON.Vec3(0, ballRadius, 15),
      material: this.ballMaterial,
      linearDamping: 0.1,
      angularDamping: 0.9
    });
    this.world.addBody(this.ballBody);

    // Goal
    this.createGoal();
  }

  private createGoal() {
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 0.8 });
    const goalWidth = 14.6;
    const goalHeight = 4.8;
    const postRadius = 0.2;
    const goalDepth = -15;

    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16);

    const leftPostMesh = new THREE.Mesh(postGeo, postMaterial);
    leftPostMesh.position.set(-goalWidth / 2, goalHeight / 2, goalDepth);
    leftPostMesh.castShadow = true;
    this.scene.add(leftPostMesh);

    const rightPostMesh = new THREE.Mesh(postGeo, postMaterial);
    rightPostMesh.position.set(goalWidth / 2, goalHeight / 2, goalDepth);
    rightPostMesh.castShadow = true;
    this.scene.add(rightPostMesh);

    const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 16);
    const crossbarMesh = new THREE.Mesh(crossbarGeo, postMaterial);
    crossbarMesh.position.set(0, goalHeight, goalDepth);
    crossbarMesh.rotation.z = Math.PI / 2;
    crossbarMesh.castShadow = true;
    this.scene.add(crossbarMesh);

    const postShape = new CANNON.Box(new CANNON.Vec3(postRadius, goalHeight / 2, postRadius));
    const leftPostBox = new CANNON.Body({ mass: 0, shape: postShape, position: new CANNON.Vec3(-goalWidth / 2, goalHeight / 2, goalDepth) });
    this.world.addBody(leftPostBox);

    const rightPostBox = new CANNON.Body({ mass: 0, shape: postShape, position: new CANNON.Vec3(goalWidth / 2, goalHeight / 2, goalDepth) });
    this.world.addBody(rightPostBox);

    const crossbarShape = new CANNON.Box(new CANNON.Vec3(goalWidth / 2, postRadius, postRadius));
    const crossbarBox = new CANNON.Body({ mass: 0, shape: crossbarShape, position: new CANNON.Vec3(0, goalHeight, goalDepth) });
    this.world.addBody(crossbarBox);

    // Goal Sensor
    const sensorShape = new CANNON.Box(new CANNON.Vec3(goalWidth / 2, goalHeight / 2, 0.1));
    this.goalSensorBody = new CANNON.Body({
        isTrigger: true,
        mass: 0,
        shape: sensorShape,
        position: new CANNON.Vec3(0, goalHeight / 2, goalDepth - 0.5)
    });
    this.world.addBody(this.goalSensorBody);

    this.goalSensorBody.addEventListener('collide', (e: any) => {
        if (e.body === this.ballBody && this.isShooting && !this.goalScoredThisShot) {
            this.goalScoredThisShot = true;
            this.score++;
            this.onScoreChange(this.score);
        }
    });
  }

  private attachEventListeners() {
    window.addEventListener('resize', this.handleResizeBound);
    this.canvas.addEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.addEventListener('pointerup', this.handlePointerUpBound);
  }

  private handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handlePointerDown(event: PointerEvent) {
    if (this.isShooting) return;
    this.pointerStart = { x: event.clientX, y: event.clientY };
  }

  private resetShot() {
    this.isShooting = false;
    this.goalScoredThisShot = false;
    this.ballBody.position.set(0, 0.35, 15);
    this.ballBody.velocity.set(0, 0, 0);
    this.ballBody.angularVelocity.set(0, 0, 0);
    if (this.ballMesh) {
      this.ballMesh.position.set(0, 0.35, 15);
    }
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.pointerStart || this.isShooting) return;

    const end = { x: event.clientX, y: event.clientY };
    const delta = {
      x: end.x - this.pointerStart.x,
      y: end.y - this.pointerStart.y
    };

    this.pointerStart = null;
    this.isShooting = true;
    this.goalScoredThisShot = false;

    // Apply force
    const forceMagnitude = 2.2;
    const upwardForce = Math.max(0, -delta.y / 40);
    const sideForce = delta.x / 40;
    
    const force = new CANNON.Vec3(sideForce, upwardForce, -20 * forceMagnitude);
    this.ballBody.applyImpulse(force, new CANNON.Vec3(0,0,0));

    setTimeout(() => this.resetShot(), 3000);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    this.world.step(1 / 60, deltaTime, 3);

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ballBody.position as unknown as THREE.Vector3);
      // 물리 엔진의 quaternion만 적용하고 모델의 로컬 회전은 유지하지 않음
      this.ballMesh.setRotationFromQuaternion(this.ballBody.quaternion as unknown as THREE.Quaternion);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
  }
}
