/**
 * TouchGuide
 *
 * 스와이프 가이드 UI 컴포넌트
 * 사용자에게 위로 스와이프하라는 시각적 힌트를 제공
 */
export class TouchGuide {
  private element: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.element = this.createTouchGuide();
    container.appendChild(this.element);
  }

  /**
   * TouchGuide 엘리먼트 생성
   */
  private createTouchGuide(): HTMLDivElement {
    const guide = document.createElement('div');
    guide.id = 'touch-guide';
    guide.className = 'touch-guide';

    // Trail 1-4 생성
    for (let i = 1; i <= 4; i++) {
      const trail = document.createElement('div');
      trail.className = `touch-guide__trail touch-guide__trail--${i}`;
      guide.appendChild(trail);
    }

    // Icon 생성
    const icon = document.createElement('div');
    icon.className = 'touch-guide__icon';
    guide.appendChild(icon);

    return guide;
  }

  /**
   * 가이드 표시/숨김
   */
  show(visible: boolean): void {
    if (visible) {
      this.element.classList.add('show');
    } else {
      this.element.classList.remove('show');
    }
  }

  /**
   * 정리
   */
  destroy(): void {
    if (this.element.parentElement) {
      this.element.remove();
    }
  }
}
