import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AD_BOARD_CONFIG } from '../config/adBoard';

export class AdBoard {
  public readonly mesh: THREE.Mesh;
  public readonly body: CANNON.Body;

  private readonly material: THREE.MeshStandardMaterial;
  private readonly textures: THREE.Texture[] = [];
  private canvasTexture: THREE.CanvasTexture | null = null;
  private scrollOffset = 0;

  constructor(scene: THREE.Scene, world: CANNON.World, depth: number) {
    this.material = new THREE.MeshStandardMaterial({
      roughness: AD_BOARD_CONFIG.material.roughness,
      metalness: AD_BOARD_CONFIG.material.metalness,
      emissive: new THREE.Color(AD_BOARD_CONFIG.material.emissive),
      emissiveIntensity: AD_BOARD_CONFIG.material.emissiveIntensity
    });

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        AD_BOARD_CONFIG.size.width,
        AD_BOARD_CONFIG.size.height,
        AD_BOARD_CONFIG.size.depth
      ),
      this.material
    );
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.position.set(AD_BOARD_CONFIG.position.x, AD_BOARD_CONFIG.position.y, depth);
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          AD_BOARD_CONFIG.size.width / 2,
          AD_BOARD_CONFIG.size.height / 2,
          AD_BOARD_CONFIG.size.depth / 2
        )
      ),
      position: new CANNON.Vec3(
        AD_BOARD_CONFIG.position.x,
        AD_BOARD_CONFIG.position.y,
        depth
      )
    });
    world.addBody(this.body);

    this.loadTextures();
  }

  update(deltaTime: number) {
    if (!this.canvasTexture) return;
    this.scrollOffset = (this.scrollOffset - deltaTime * AD_BOARD_CONFIG.scrollSpeed) % 1;
    this.canvasTexture.offset.x = this.scrollOffset;
  }

  reset() {
    this.scrollOffset = 0;
    if (this.canvasTexture) {
      this.canvasTexture.offset.x = 0;
    }
  }

  private loadTextures() {
    const loader = new THREE.TextureLoader();
    let loaded = 0;

    const refreshCanvasTexture = () => {
      if (loaded !== AD_BOARD_CONFIG.textures.length) return;
      const baseTexture = this.textures[0];
      if (!baseTexture.image) return;
      const imgWidth = baseTexture.image.width;
      const imgHeight = baseTexture.image.height;

      const canvas = document.createElement('canvas');
      canvas.width = imgWidth * this.textures.length;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      this.textures.forEach((texture, index) => {
        if (texture.image) {
          ctx.drawImage(texture.image, imgWidth * index, 0, imgWidth, imgHeight);
        }
      });

      const combined = new THREE.CanvasTexture(canvas);
      combined.colorSpace = THREE.SRGBColorSpace;
      combined.wrapS = THREE.RepeatWrapping;
      combined.wrapT = THREE.ClampToEdgeWrapping;
      combined.repeat.set(this.textures.length, 1);

      this.canvasTexture = combined;
      this.material.map = combined;
      this.material.needsUpdate = true;
    };

    AD_BOARD_CONFIG.textures.forEach((url) => {
      const texture = loader.load(
        url,
        () => {
          loaded += 1;
          texture.colorSpace = THREE.SRGBColorSpace;
          refreshCanvasTexture();
        },
        undefined,
        (error) => {
          console.warn(`Failed to load ad texture "${url}"`, error);
        }
      );
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      this.textures.push(texture);
    });
  }
}
