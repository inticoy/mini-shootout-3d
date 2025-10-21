import type { ShotAnalysis } from '../shooting/shotAnalyzer';
import type { ShotParameters } from '../shooting/shotParameters';
import * as CANNON from 'cannon-es';

/**
 * 슈팅 정보 HUD
 * 디버그 모드에서 중앙 하단에 슈팅 정보를 표시
 */
export class ShotInfoHud {
  private readonly container: HTMLDivElement;
  private readonly typeElement: HTMLSpanElement;
  private readonly powerElement: HTMLSpanElement;
  private readonly spinElement: HTMLSpanElement;
  private readonly curveElement: HTMLSpanElement;
  private readonly heightElement: HTMLSpanElement;
  private readonly targetElement: HTMLSpanElement;
  private readonly speedElement: HTMLSpanElement;

  constructor() {
    // 컨테이너 생성
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.bottom = '20px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.display = 'none';
    this.container.style.padding = '10px 16px';
    this.container.style.background = 'rgba(0, 0, 0, 0.7)';
    this.container.style.border = '1px solid rgba(100, 180, 255, 0.4)';
    this.container.style.borderRadius = '8px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '11px';
    this.container.style.color = '#e0f7ff';
    this.container.style.zIndex = '998';
    this.container.style.backdropFilter = 'blur(4px)';
    this.container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    this.container.style.maxWidth = '95vw';
    this.container.style.boxSizing = 'border-box';

    // 2줄 레이아웃을 위한 래퍼들
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'center';
    topRow.style.flexWrap = 'wrap';
    topRow.style.gap = '8px 12px';
    topRow.style.marginBottom = '6px';

    const bottomRow = document.createElement('div');
    bottomRow.style.display = 'flex';
    bottomRow.style.justifyContent = 'center';
    bottomRow.style.flexWrap = 'wrap';
    bottomRow.style.gap = '8px 12px';

    // 정보 항목들 생성
    const createInfoItem = (label: string): HTMLSpanElement => {
      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline-block';
      wrapper.style.whiteSpace = 'nowrap';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = label + ': ';
      labelSpan.style.color = '#88c0d0';
      labelSpan.style.fontWeight = 'bold';

      const valueSpan = document.createElement('span');
      valueSpan.style.color = '#ffffff';

      wrapper.appendChild(labelSpan);
      wrapper.appendChild(valueSpan);

      return valueSpan;
    };

    // 첫 번째 줄: TYPE, PWR, CURVE, HGT
    this.typeElement = createInfoItem('TYPE');
    topRow.appendChild(this.typeElement.parentElement!);

    this.powerElement = createInfoItem('PWR');
    topRow.appendChild(this.powerElement.parentElement!);

    this.curveElement = createInfoItem('CRV');
    topRow.appendChild(this.curveElement.parentElement!);

    this.heightElement = createInfoItem('HGT');
    topRow.appendChild(this.heightElement.parentElement!);

    // 두 번째 줄: SPIN, SPD, TGT
    this.spinElement = createInfoItem('SPIN');
    bottomRow.appendChild(this.spinElement.parentElement!);

    this.speedElement = createInfoItem('SPD');
    bottomRow.appendChild(this.speedElement.parentElement!);

    this.targetElement = createInfoItem('TGT');
    bottomRow.appendChild(this.targetElement.parentElement!);

    this.container.appendChild(topRow);
    this.container.appendChild(bottomRow);
    document.body.appendChild(this.container);
  }

  /**
   * 슈팅 정보 업데이트
   */
  update(
    analysis: ShotAnalysis,
    shotParams: ShotParameters,
    velocity: CANNON.Vec3,
    angularVelocity: CANNON.Vec3
  ) {
    // Shot Type
    this.typeElement.textContent = analysis.type;
    this.typeElement.style.color = this.getShotTypeColor(analysis.type);

    // Power
    const powerPercent = Math.round(analysis.power * 100);
    this.powerElement.textContent = `${powerPercent}%`;

    // Curve
    const curvePercent = Math.round(analysis.curveAmount * 100);
    const curveDir = analysis.curveDirection === 1 ? 'R' :
                     analysis.curveDirection === -1 ? 'L' : '-';
    this.curveElement.textContent = `${curvePercent}% ${curveDir}`;

    // Height
    const heightPercent = Math.round(analysis.heightFactor * 100);
    this.heightElement.textContent = `${heightPercent}%`;

    // Spin (angular velocity magnitude)
    const spinMag = Math.sqrt(
      angularVelocity.x ** 2 +
      angularVelocity.y ** 2 +
      angularVelocity.z ** 2
    );
    this.spinElement.textContent = `${spinMag.toFixed(1)} rad/s`;

    // Speed
    const speed = Math.sqrt(
      velocity.x ** 2 +
      velocity.y ** 2 +
      velocity.z ** 2
    );
    this.speedElement.textContent = `${speed.toFixed(1)} m/s`;

    // Target
    const target = shotParams.targetPosition;
    this.targetElement.textContent = `(${target.x.toFixed(1)}, ${target.y.toFixed(1)})`;
  }

  /**
   * 슈팅 타입별 색상
   */
  private getShotTypeColor(type: string): string {
    switch (type) {
      case 'NORMAL':
        return '#81a1c1'; // 파란색
      case 'CURVE':
        return '#b48ead'; // 보라색
      case 'INVALID':
        return '#d08770'; // 주황색
      default:
        return '#ffffff';
    }
  }

  /**
   * HUD 표시/숨김
   */
  setVisible(visible: boolean) {
    this.container.style.display = visible ? 'block' : 'none';
  }

  /**
   * HUD 제거
   */
  destroy() {
    this.container.remove();
  }
}
