import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import grassColorUrl from '../assets/Grass005_2K-PNG/Grass005_2K-PNG_Color.png?url';
import grassNormalUrl from '../assets/Grass005_2K-PNG/Grass005_2K-PNG_NormalGL.png?url';
import grassAoUrl from '../assets/Grass005_2K-PNG/Grass005_2K-PNG_AmbientOcclusion.png?url';
import grassRoughnessUrl from '../assets/Grass005_2K-PNG/Grass005_2K-PNG_Roughness.png?url';
import { GOAL_DEPTH, GOAL_WIDTH } from '../config/goal';
import { FIELD_DIMENSIONS, FIELD_OFFSETS, FIELD_STRIPES, FIELD_TEXTURE_REPEAT } from '../config/field';
import { AD_BOARD_CONFIG } from '../config/adBoard';
import { AdBoard } from '../entities/adBoard';
import { Stands } from './stands';

export interface FieldOptions {
  goalDepth?: number;
  stripeWidth?: number;
}

export class Field {
  public readonly groundMesh: THREE.Mesh;
  public readonly stripeMeshes: THREE.Mesh[];
  public readonly verticalStripes: THREE.Mesh[];
  public readonly linesGroup: THREE.Group;
  public readonly groundBody: CANNON.Body;
  public readonly adBoard: AdBoard;
  public readonly stands: Stands;

  private readonly goalDepth: number;

  constructor(scene: THREE.Scene, world: CANNON.World, groundMaterial: CANNON.Material, options: FieldOptions = {}) {
    this.goalDepth = options.goalDepth ?? GOAL_DEPTH;

    const loader = new THREE.TextureLoader();
    const grassTexture = loader.load(grassColorUrl);
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.anisotropy = 8;
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(FIELD_TEXTURE_REPEAT, FIELD_TEXTURE_REPEAT);

    const normalTexture = loader.load(grassNormalUrl);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(FIELD_TEXTURE_REPEAT, FIELD_TEXTURE_REPEAT);

    const aoTexture = loader.load(grassAoUrl);
    aoTexture.wrapS = THREE.RepeatWrapping;
    aoTexture.wrapT = THREE.RepeatWrapping;
    aoTexture.repeat.set(FIELD_TEXTURE_REPEAT, FIELD_TEXTURE_REPEAT);

    const roughnessTexture = loader.load(grassRoughnessUrl);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(FIELD_TEXTURE_REPEAT, FIELD_TEXTURE_REPEAT);

    const groundGeometry = new THREE.PlaneGeometry(
      FIELD_DIMENSIONS.planeWidth,
      FIELD_DIMENSIONS.planeHeight
    );
    groundGeometry.setAttribute('uv2', groundGeometry.attributes.uv.clone());

    this.groundMesh = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshStandardMaterial({
        map: grassTexture,
        normalMap: normalTexture,
        aoMap: aoTexture,
        roughnessMap: roughnessTexture,
        roughness: 1,
        metalness: 0
      })
    );
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    scene.add(this.groundMesh);

    const stripeWidth = options.stripeWidth ?? FIELD_DIMENSIONS.defaultStripeWidth;
    this.stripeMeshes = this.createStripes(scene, stripeWidth);
    this.verticalStripes = this.createVerticalStripes(scene, stripeWidth);
    this.linesGroup = this.createFieldLines(scene);

    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundMaterial
    });
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(this.groundBody);

    this.adBoard = new AdBoard(
      scene,
      world,
      this.goalDepth + AD_BOARD_CONFIG.position.depthOffset
    );

    // 샘플 관중석 추가
    this.stands = new Stands(
      scene,
      world,
      this.goalDepth + AD_BOARD_CONFIG.position.depthOffset
    );
  }

  update(deltaTime: number) {
    this.adBoard.update(deltaTime);
  }

  resetAds() {
    this.adBoard.reset();
  }

  private createStripes(scene: THREE.Scene, stripeWidth: number): THREE.Mesh[] {
    if (stripeWidth <= 0) return [];

    const config = FIELD_STRIPES.horizontal;
    const yOffset = FIELD_OFFSETS.stripes.horizontal;
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: config.opacity,
      depthWrite: config.depthWrite
    });

    const meshes: THREE.Mesh[] = [];
    const halfLength = FIELD_DIMENSIONS.planeHeight / 2;

    const stripeSpacing = stripeWidth * 2;
    const positions: number[] = [];
    const offset = stripeSpacing / 2;
    for (
      let center = offset;
      center + stripeWidth / 2 <= halfLength;
      center += stripeSpacing
    ) {
      positions.push(center, -center);
    }
    positions.sort((a, b) => a - b);

    for (const center of positions) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(stripeWidth, FIELD_DIMENSIONS.planeWidth),
        stripeMaterial
      );
      stripe.position.set(0, yOffset, center - stripeSpacing / 4);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = Math.PI / 2;
      stripe.receiveShadow = true;
      scene.add(stripe);
      meshes.push(stripe);
    }
    return meshes;
  }

  private createVerticalStripes(scene: THREE.Scene, stripeWidth: number): THREE.Mesh[] {
    if (stripeWidth <= 0) return [];

    const config = FIELD_STRIPES.vertical;
    const yOffset = FIELD_OFFSETS.stripes.vertical;
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: config.opacity,
      depthWrite: config.depthWrite
    });

    const meshes: THREE.Mesh[] = [];
    const halfWidth = FIELD_DIMENSIONS.planeWidth / 2;

    const stripeSpacing = stripeWidth * 2;
    const positions: number[] = [];
    const offset = stripeSpacing / 2;
    for (
      let center = offset;
      center + stripeWidth / 2 <= halfWidth;
      center += stripeSpacing
    ) {
      positions.push(center, -center);
    }
    positions.sort((a, b) => a - b);

    for (const center of positions) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(stripeWidth, FIELD_DIMENSIONS.planeHeight),
        material
      );
      stripe.position.set(center - stripeSpacing / 4, yOffset, 0);
      stripe.rotation.x = -Math.PI / 2;
      stripe.receiveShadow = true;
      scene.add(stripe);
      meshes.push(stripe);
    }
    return meshes;
  }

  private createFieldLines(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const lineHeight = FIELD_OFFSETS.lines;

    const addMesh = (mesh: THREE.Mesh) => {
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      group.add(mesh);
    };

    const goalLineGeometry = new THREE.BoxGeometry(
      FIELD_DIMENSIONS.goalLineLength,
      FIELD_DIMENSIONS.lineMeshHeight,
      FIELD_DIMENSIONS.goalLineThickness
    );
    const goalLineMesh = new THREE.Mesh(goalLineGeometry, lineMaterial);
    goalLineMesh.position.set(0, lineHeight, this.goalDepth);
    addMesh(goalLineMesh);

    const penaltyBoxWidth = GOAL_WIDTH + FIELD_DIMENSIONS.penaltyBoxWidthPadding;
    const penaltyBoxDepth = FIELD_DIMENSIONS.penaltyBoxDepth;
    const penaltyAreaWidth = GOAL_WIDTH + FIELD_DIMENSIONS.penaltyAreaWidthPadding;
    const penaltyAreaDepth = FIELD_DIMENSIONS.penaltyAreaDepth;

    const createSideLine = (width: number, depth: number, offsetX: number, offsetZ: number) => {
      const geometry = new THREE.BoxGeometry(width, FIELD_DIMENSIONS.lineMeshHeight, depth);
      const mesh = new THREE.Mesh(geometry, lineMaterial);
      mesh.position.set(offsetX, lineHeight, offsetZ);
      addMesh(mesh);
    };

    // Penalty box sides
    createSideLine(
      FIELD_DIMENSIONS.goalLineThickness,
      penaltyBoxDepth,
      -penaltyBoxWidth / 2,
      this.goalDepth + penaltyBoxDepth / 2
    );
    createSideLine(
      FIELD_DIMENSIONS.goalLineThickness,
      penaltyBoxDepth,
      penaltyBoxWidth / 2,
      this.goalDepth + penaltyBoxDepth / 2
    );
    createSideLine(
      penaltyBoxWidth,
      FIELD_DIMENSIONS.goalLineThickness,
      0,
      this.goalDepth + penaltyBoxDepth
    );

    // Penalty area sides
    createSideLine(
      FIELD_DIMENSIONS.goalLineThickness,
      penaltyAreaDepth,
      -penaltyAreaWidth / 2,
      this.goalDepth + penaltyAreaDepth / 2
    );
    createSideLine(
      FIELD_DIMENSIONS.goalLineThickness,
      penaltyAreaDepth,
      penaltyAreaWidth / 2,
      this.goalDepth + penaltyAreaDepth / 2
    );
    createSideLine(
      penaltyAreaWidth,
      FIELD_DIMENSIONS.goalLineThickness,
      0,
      this.goalDepth + penaltyAreaDepth
    );

    const penaltyMarkGeometry = new THREE.CircleGeometry(
      FIELD_DIMENSIONS.penaltyMarkRadius,
      FIELD_DIMENSIONS.penaltyMarkSegments
    );
    const penaltyMarkMesh = new THREE.Mesh(penaltyMarkGeometry, lineMaterial);
    penaltyMarkMesh.position.set(0, FIELD_OFFSETS.penaltyMark, 0);
    penaltyMarkMesh.rotation.x = -Math.PI / 2;
    addMesh(penaltyMarkMesh);

    class PenaltyArcCurve extends THREE.Curve<THREE.Vector3> {
      constructor() {
        super();
      }

      getPoint(t: number): THREE.Vector3 {
        const angle = Math.PI * t;
        const radius = FIELD_DIMENSIONS.penaltyArcRadius;
        return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      }
    }
    const arcGeometry = new THREE.TubeGeometry(
      new PenaltyArcCurve(),
      FIELD_DIMENSIONS.penaltyArcTubularSegments,
      FIELD_DIMENSIONS.penaltyArcTubeRadius,
      FIELD_DIMENSIONS.penaltyArcRadialSegments,
      false
    );
    const arcMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]
    });
    const penaltyArcMesh = new THREE.Mesh(arcGeometry, arcMaterial);
    penaltyArcMesh.position.set(0, FIELD_OFFSETS.penaltyArc, this.goalDepth + penaltyAreaDepth);
    addMesh(penaltyArcMesh);

    scene.add(group);
    return group;
  }
}

export function createField(
  scene: THREE.Scene,
  world: CANNON.World,
  groundMaterial: CANNON.Material,
  options: FieldOptions = {}
): Field {
  return new Field(scene, world, groundMaterial, options);
}
