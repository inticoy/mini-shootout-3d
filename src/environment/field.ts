import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import grassAlbedoUrl from '../assets/grass1-unity/grass1-albedo3.png?url';
import grassNormalUrl from '../assets/grass1-unity/grass1-normal1-ogl.png?url';
import grassAoUrl from '../assets/grass1-unity/grass1-ao.png?url';
import adTexture1Url from '../assets/ad/burger_queen.png?url';
import adTexture2Url from '../assets/ad/coloc_coloc.png?url';
import adTexture3Url from '../assets/ad/sansung.png?url';
import adTexture4Url from '../assets/ad/star_cups.png?url';

export interface Field {
  groundMesh: THREE.Mesh;
  stripeMeshes: THREE.Mesh[];
  verticalStripes: THREE.Mesh[];
  groundBody: CANNON.Body;
  adBoardMesh: THREE.Mesh;
  adBoardBody: CANNON.Body;
  update(deltaTime: number): void;
  resetAds(): void;
}

export interface FieldOptions {
  goalDepth?: number;
  stripeWidth?: number;
}

export function createField(
  scene: THREE.Scene,
  world: CANNON.World,
  groundMaterial: CANNON.Material,
  options: FieldOptions = {}
): Field {
  const textureLoader = new THREE.TextureLoader();
  const grassTexture = textureLoader.load(grassAlbedoUrl);
  grassTexture.colorSpace = THREE.SRGBColorSpace;
  grassTexture.anisotropy = 8;
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(100, 100);

  const normalTexture = textureLoader.load(grassNormalUrl);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.repeat.set(100, 100);

  const aoTexture = textureLoader.load(grassAoUrl);
  aoTexture.wrapS = THREE.RepeatWrapping;
  aoTexture.wrapT = THREE.RepeatWrapping;
  aoTexture.repeat.set(100, 100);

  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
      map: grassTexture,
      normalMap: normalTexture,
      roughnessMap: aoTexture,
      roughness: 1.0,
      metalness: 0.0
    })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const stripeMeshes: THREE.Mesh[] = [];
  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A5A1A,  // 더 어두운 초록색
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.3  // 더 연하게
  });
  const stripeWidth = options.stripeWidth ?? 5;
  const stripeDepth = 100;
  const stripeCenterX = 0;

  for (let i = -50; i < 50; i += stripeWidth * 2) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(stripeWidth, stripeDepth),
      stripeMaterial
    );
    stripe.position.set(stripeCenterX, 0.01, i + stripeWidth / 2);
    stripe.rotation.x = -Math.PI / 2;
    stripe.rotation.z = Math.PI / 2;
    stripe.receiveShadow = true;
    scene.add(stripe);
    stripeMeshes.push(stripe);
  }

  const verticalStripes: THREE.Mesh[] = [];
  const verticalStripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4A6F4A,  // 아주 살짝 밝은 탁한 초록색
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.3,  // 더 연하게
    depthWrite: false  // 겹치는 부분에서도 보이게
  });
  const verticalStripeDepth = 100;  // 골대 앞쪽 길이
  const stripeCenterZ = 0;  // 중앙 위치

  for (let i = -50; i < 50; i += stripeWidth * 2) {
    const verticalStripe = new THREE.Mesh(
      new THREE.PlaneGeometry(stripeWidth, verticalStripeDepth),
      verticalStripeMaterial
    );
    verticalStripe.position.set(i + stripeWidth / 2, 0.03, stripeCenterZ);
    verticalStripe.rotation.x = -Math.PI / 2;
    verticalStripe.receiveShadow = true;
    scene.add(verticalStripe);
    verticalStripes.push(verticalStripe);
  }

  const groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: groundMaterial
  });
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);

  const goalDepth = options.goalDepth ?? -10;
  const boardWidth = 100;
  const boardHeight = 1.5;
  const boardThickness = 0.3;
  const boardOffsetZ = -8;

  // 텍스처 로딩 및 결합
  const adTextureUrls = [adTexture1Url, adTexture2Url, adTexture3Url, adTexture4Url];
  const adTextures: THREE.Texture[] = [];
  let loadedCount = 0;
  let combinedTexture: THREE.CanvasTexture | null = null;

  const onTextureLoad = () => {
    loadedCount++;
    if (loadedCount === 4) {
      // 모든 텍스처 로드 완료 후 canvas에 결합
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const imgWidth = adTextures[0].image.width;
      const imgHeight = adTextures[0].image.height;
      canvas.width = imgWidth * 4;
      canvas.height = imgHeight;
      for (let i = 0; i < 4; i++) {
        ctx.drawImage(adTextures[i].image, i * imgWidth, 0, imgWidth, imgHeight);
      }
      combinedTexture = new THREE.CanvasTexture(canvas);
      combinedTexture.colorSpace = THREE.SRGBColorSpace;
      combinedTexture.wrapS = THREE.RepeatWrapping;
      combinedTexture.wrapT = THREE.ClampToEdgeWrapping;
      combinedTexture.repeat.set(4, 1);
      if (boardMaterial.map !== combinedTexture) {
        boardMaterial.map = combinedTexture;
        boardMaterial.needsUpdate = true;
      }
    }
  };

  for (const url of adTextureUrls) {
    const texture = textureLoader.load(url, onTextureLoad);
    texture.colorSpace = THREE.SRGBColorSpace;
    adTextures.push(texture);
  }

  const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth, boardHeight, boardThickness),
    new THREE.MeshStandardMaterial({
      roughness: 0.45,
      metalness: 0.05,
      emissive: new THREE.Color(0x111111),
      emissiveIntensity: 0.4
    })
  );
  boardMesh.castShadow = false;
  boardMesh.receiveShadow = false;
  boardMesh.position.set(0, boardHeight / 2, goalDepth + boardOffsetZ);
  scene.add(boardMesh);

  const boardBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(boardWidth / 2, boardHeight / 2, boardThickness / 2)),
    position: new CANNON.Vec3(0, boardHeight / 2, goalDepth + boardOffsetZ)
  });
  world.addBody(boardBody);

  let scrollOffset = 0;
  const boardMaterial = boardMesh.material as THREE.MeshStandardMaterial;

  return {
    groundMesh,
    stripeMeshes,
    verticalStripes,
    groundBody,
    adBoardMesh: boardMesh,
    adBoardBody: boardBody,
    update(deltaTime: number) {
      if (combinedTexture) {
        scrollOffset = (scrollOffset - deltaTime * 0.1) % 1;
        combinedTexture.offset.x = scrollOffset;
      }
    },
    resetAds() {
      scrollOffset = 0;
      if (combinedTexture) {
        combinedTexture.offset.x = 0;
      }
    }
  };
}
