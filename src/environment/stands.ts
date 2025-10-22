import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { STANDS_CONFIG } from '../config/stands';
import crowdTextureUrl from '../assets/crowd/crowd.png?url';

export class Stands {
  private readonly mesh: THREE.Mesh;
  private readonly body: CANNON.Body;

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    adBoardDepth: number
  ) {
    const config = STANDS_CONFIG;

    // 삼각기둥 지오메트리 생성
    // 삼각형 단면을 만들어서 ExtrudeGeometry 대신 직접 BufferGeometry 사용
    const geometry = this.createPrismGeometry(
      config.geometry.width,
      config.geometry.height,
      config.geometry.depth
    );

    // 텍스처 로드
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(crowdTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    const slopedEdgeLength = Math.hypot(
      config.geometry.height,
      config.geometry.depth
    );
    const perimeter =
      config.geometry.depth + config.geometry.height + slopedEdgeLength;

    // ExtrudeGeometry가 경사면을 전체 둘레 대비 비율로 UV를 잡기 때문에
    // 경사면 하나에 텍스처를 1회 채우려면 보정 계수가 필요하다.
    const baseRepeatX = 1; // 폭 방향은 0~1로 매핑됨
    const baseRepeatY = perimeter / slopedEdgeLength;

    texture.repeat.set(
      baseRepeatX * config.crowdTexture.repeat.x,
      baseRepeatY * config.crowdTexture.repeat.y
    );
    texture.rotation = -Math.PI / 2;
    texture.center.set(0.5, 0.5); // 중심점 기준으로 회전

    // 재질
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff, // 흰색 기본 (텍스처 색상 그대로)
      roughness: config.material.roughness,
      metalness: config.material.metalness,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // 위치 설정 (geometry 회전 + mesh Z축 회전)
    const centerZ = adBoardDepth + config.position.zOffset - config.geometry.depth / 2;
    const centerY = config.position.y + config.geometry.height / 2;

    this.mesh.position.set(config.position.x, centerY, centerZ);
    this.mesh.rotation.z = Math.PI;

    scene.add(this.mesh);

    // 물리 바디 생성 (경사진 평면)
    // 삼각 기둥의 경사면을 물리 평면으로 근사
    const planeShape = new CANNON.Box(new CANNON.Vec3(
      config.geometry.width / 2,
      0.1, // 얇은 평면
      config.geometry.depth / 2
    ));

    this.body = new CANNON.Body({
      mass: 0, // 정적 오브젝트
      shape: planeShape
    });

    // 물리 바디 위치 및 회전 설정
    this.body.position.set(config.position.x, centerY, centerZ);
    this.body.quaternion.setFromEuler(0, 0, Math.PI);

    world.addBody(this.body);

    console.log(`🏟️ 삼각기둥 관중석 생성 완료 (각도: ${config.angle.degrees}°)`);
  }

  // 삼각기둥 지오메트리 생성
  private createPrismGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();

    // 직각삼각형 단면 (빗변이 경사면)
    // 바닥에서 시작해서 뒤쪽 상단으로 올라가는 형태
    shape.moveTo(0, 0);        // 왼쪽 아래 (앞쪽 바닥)
    shape.lineTo(depth, 0);    // 오른쪽 아래 (뒤쪽 바닥)
    shape.lineTo(0, height);   // 왼쪽 위 (앞쪽 상단)
    shape.lineTo(0, 0);        // 닫기

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: width,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 중심점을 원점으로 이동
    geometry.translate(-depth / 2, -height / 2, -width / 2);

    // 회전: 삼각형이 z축을 따라 배치되도록
    geometry.rotateY(Math.PI / 2);
    geometry.rotateX(Math.PI);

    return geometry;
  }

  // 필요시 관중석 제거
  dispose(scene: THREE.Scene, world: CANNON.World) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(mat => mat.dispose());
    } else {
      this.mesh.material.dispose();
    }

    world.removeBody(this.body);
  }
}
