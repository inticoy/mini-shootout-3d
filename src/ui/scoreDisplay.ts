/**
 * ScoreDisplay
 *
 * 게임 점수를 표시하고 업데이트하는 UI 컴포넌트
 */
export class ScoreDisplay {
  private element: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.id = 'score';
    this.element.textContent = '0';
    container.appendChild(this.element);
  }

  /**
   * 점수 업데이트 및 애니메이션
   */
  update(score: number): void {
    this.element.textContent = score.toString();
    this.element.classList.add('score-changed');
    setTimeout(() => {
      this.element.classList.remove('score-changed');
    }, 300);
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
