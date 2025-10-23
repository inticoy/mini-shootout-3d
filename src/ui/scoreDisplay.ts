/**
 * ScoreDisplay
 *
 * 게임 점수를 표시하고 업데이트하는 UI 컴포넌트
 * - 현재 점수: 카운트업 애니메이션
 * - 최고 기록: localStorage 저장 및 표시
 */
export class ScoreDisplay {
  private scoreValue: HTMLDivElement;
  private scoreBest: HTMLDivElement;
  private bestScore: number;
  private isNewRecord = false;

  constructor(container: HTMLElement) {
    // localStorage에서 최고 기록 로드
    this.bestScore = this.loadBestScore();

    // BEST 표시 (최상단)
    this.scoreBest = document.createElement('div');
    this.scoreBest.id = 'score-best';
    this.scoreBest.textContent = `BEST: ${this.bestScore}`;

    // 현재 점수 (중앙)
    this.scoreValue = document.createElement('div');
    this.scoreValue.id = 'score-value';
    this.scoreValue.textContent = '0';

    container.appendChild(this.scoreBest);
    container.appendChild(this.scoreValue);
  }

  /**
   * 점수 업데이트 (게임에서 호출)
   */
  update(score: number): void {
    const oldScore = parseInt(this.scoreValue.textContent || '0');

    // 카운트업 애니메이션 (300ms)
    this.animateCount(oldScore, score, 300);

    // Bounce 애니메이션
    this.scoreValue.classList.add('score-changed');
    setTimeout(() => {
      this.scoreValue.classList.remove('score-changed');
    }, 400);

    // 최고 기록 체크
    if (score > this.bestScore) {
      this.isNewRecord = true;
      this.bestScore = score;
      this.saveBestScore(score);
      this.updateBestDisplay();
    }
  }

  /**
   * 숫자 카운트업 애니메이션 (부드러운 증가)
   */
  private animateCount(from: number, to: number, duration: number): void {
    const startTime = Date.now();
    const range = to - from;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(from + range * easeOut);

      this.scoreValue.textContent = current.toString();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  /**
   * BEST 표시 업데이트 (최고 기록 갱신 시)
   */
  private updateBestDisplay(): void {
    this.scoreBest.textContent = `BEST: ${this.bestScore}`;

    // 펄스 애니메이션
    this.scoreBest.classList.add('best-updated');
    setTimeout(() => {
      this.scoreBest.classList.remove('best-updated');
    }, 800);
  }

  /**
   * 최고 기록 여부 확인 (게임에서 체크용)
   */
  isNewRecordAchieved(): boolean {
    return this.isNewRecord;
  }

  /**
   * 최고 기록 플래그 리셋 (다음 라운드 준비)
   */
  resetNewRecordFlag(): void {
    this.isNewRecord = false;
  }

  private loadBestScore(): number {
    const saved = localStorage.getItem('snapshoot-best-score');
    return saved ? parseInt(saved) : 0;
  }

  private saveBestScore(score: number): void {
    localStorage.setItem('snapshoot-best-score', score.toString());
  }

  /**
   * 정리
   */
  destroy(): void {
    this.scoreValue.remove();
    this.scoreBest.remove();
  }
}
