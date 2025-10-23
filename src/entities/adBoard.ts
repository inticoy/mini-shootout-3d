import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AD_BOARD_CONFIG, type AdTextItem } from '../config/adBoard';

export class AdBoard {
  public readonly mesh: THREE.Mesh;
  public readonly body: CANNON.Body;

  private readonly material: THREE.MeshStandardMaterial;
  private canvasTexture: THREE.CanvasTexture | null = null;
  private scrollOffset = 0;
  private currentAdSet: 'default' | 'goal' = 'default';
  private autoResetTimer: number | null = null;

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

    this.createAdTexture();
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

  /**
   * 광고 세트를 변경합니다.
   * @param adSetName - 광고 세트 이름 ('default' | 'goal')
   * @param autoResetMs - 자동으로 default로 돌아갈 시간(ms). 0이면 자동 복원 안함
   */
  switchAdSet(adSetName: 'default' | 'goal', autoResetMs = 0) {
    if (this.currentAdSet === adSetName) return;

    // 기존 타이머 취소
    if (this.autoResetTimer !== null) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }

    this.currentAdSet = adSetName;
    this.createAdTexture();

    // 자동 복원 타이머 설정
    if (autoResetMs > 0 && adSetName !== 'default') {
      this.autoResetTimer = window.setTimeout(() => {
        this.currentAdSet = 'default';
        this.createAdTexture();
        this.autoResetTimer = null;
      }, autoResetMs);
    }
  }

  /**
   * 현재 광고 세트의 텍스트 광고들을 생성하고 하나의 텍스처로 결합합니다.
   */
  private createAdTexture() {
    const ads = AD_BOARD_CONFIG.adSets[this.currentAdSet];

    // 모든 광고를 텍스트 캔버스로 생성
    const canvases = ads.map(ad => this.createTextAd(ad));

    // 즉시 결합
    this.combineCanvases(canvases);
  }


  /**
   * 텍스트 광고를 생성합니다.
   */
  private createTextAd(config: AdTextItem): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = AD_BOARD_CONFIG.canvas.width;
    canvas.height = AD_BOARD_CONFIG.canvas.height;
    const ctx = canvas.getContext('2d')!;

    // 배경색
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 텍스트 스타일 설정
    const fontWeight = config.fontWeight || 'bold';
    const fontFamily = config.fontFamily || 'Arial, sans-serif';
    ctx.font = `${fontWeight} ${config.fontSize}px ${fontFamily}`;
    ctx.fillStyle = config.textColor;
    ctx.textAlign = config.textAlign || 'center';
    ctx.textBaseline = 'middle';

    // 텍스트 그리기
    const x = config.textAlign === 'left'
      ? 20
      : config.textAlign === 'right'
      ? canvas.width - 20
      : canvas.width / 2;

    ctx.fillText(config.text, x, canvas.height / 2);

    return canvas;
  }

  /**
   * 여러 캔버스를 하나로 결합하여 텍스처를 생성합니다.
   */
  private combineCanvases(canvases: HTMLCanvasElement[]) {
    if (canvases.length === 0) return;

    const canvasWidth = AD_BOARD_CONFIG.canvas.width;
    const canvasHeight = AD_BOARD_CONFIG.canvas.height;

    // 결합된 캔버스 생성
    const combined = document.createElement('canvas');
    combined.width = canvasWidth * canvases.length;
    combined.height = canvasHeight;
    const ctx = combined.getContext('2d');
    if (!ctx) return;

    // 모든 캔버스를 가로로 이어붙이기
    canvases.forEach((canvas, index) => {
      ctx.drawImage(canvas, canvasWidth * index, 0, canvasWidth, canvasHeight);
    });

    // THREE.js 텍스처로 변환
    const texture = new THREE.CanvasTexture(combined);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(AD_BOARD_CONFIG.display.repeatX, AD_BOARD_CONFIG.display.repeatY);

    // 기존 텍스처 교체
    if (this.canvasTexture) {
      this.canvasTexture.dispose();
    }

    this.canvasTexture = texture;
    this.material.map = texture;
    this.material.needsUpdate = true;

    // 스크롤 오프셋 초기화
    this.scrollOffset = 0;
    this.canvasTexture.offset.x = 0;
  }

  /**
   * 리소스 정리
   */
  destroy() {
    if (this.autoResetTimer !== null) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }

    if (this.canvasTexture) {
      this.canvasTexture.dispose();
      this.canvasTexture = null;
    }
  }
}
