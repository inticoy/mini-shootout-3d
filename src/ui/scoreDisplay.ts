/**
 * ScoreDisplay - Glass Morphism Style with Tailwind
 *
 * 게임 점수를 표시하고 업데이트하는 UI 컴포넌트
 * - 현재 점수: 카운트업 애니메이션
 * - 최고 기록: localStorage 저장 및 표시
 * - Tailwind CSS 기반 스타일링
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
    this.scoreBest = this.createBestScore();

    // 현재 점수 (중앙)
    this.scoreValue = this.createMainScore();

    container.appendChild(this.scoreBest);
    container.appendChild(this.scoreValue);
  }

  /**
   * BEST 스코어 컨테이너 생성 (전광판 스타일)
   */
  private createBestScore(): HTMLDivElement {
    const container = document.createElement('div');

    // 전광판 스타일 컨테이너
    container.className = `
      absolute top-10 left-1/2 -translate-x-1/2
      flex flex-col items-center gap-2
      px-12 py-4
      rounded-lg
      backdrop-blur-[10px]
      transition-all duration-300
      landscape-xs:px-6 landscape-xs:py-2 landscape-xs:gap-0.5
      scoreboard-display
    `.trim().replace(/\s+/g, ' ');

    // BEST: nnn 라인
    const bestLine = document.createElement('div');
    bestLine.className = `
      font-orbitron text-sm font-bold tracking-[0.2em]
      landscape-xs:text-[10px]
    `.trim().replace(/\s+/g, ' ');
    bestLine.style.color = '#aaaaaa';
    bestLine.style.textShadow = '0 0 8px rgba(170, 170, 170, 0.6), 0 0 16px rgba(170, 170, 170, 0.3)';

    const bestLabel = document.createElement('span');
    bestLabel.textContent = 'BEST';
    bestLabel.style.color = '#fbbf24'; // 노란색
    bestLabel.style.textShadow = '0 0 8px rgba(251, 191, 36, 0.8), 0 0 16px rgba(251, 191, 36, 0.6)';

    const bestColon = document.createTextNode(': ');

    const number = document.createElement('span');
    number.id = 'best-score-number';
    number.style.color = '#ffffff';
    number.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.6)';
    number.textContent = this.bestScore.toString();

    bestLine.appendChild(bestLabel);
    bestLine.appendChild(bestColon);
    bestLine.appendChild(number);

    // 현재 스코어 (큰 숫자)
    const currentScore = document.createElement('div');
    currentScore.id = 'scoreboard-current-score';
    currentScore.className = `
      font-orbitron text-[72px] font-black tracking-wide
      landscape-xs:text-[32px]
    `.trim().replace(/\s+/g, ' ');
    currentScore.style.color = '#ffffff';
    currentScore.style.textShadow = '0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.6), 0 0 45px rgba(255, 255, 255, 0.4)';
    currentScore.style.lineHeight = '1';
    currentScore.textContent = '0';

    container.appendChild(bestLine);
    container.appendChild(currentScore);

    return container;
  }

  /**
   * 메인 스코어 컨테이너 생성 (더미 - 전광판에 통합됨)
   */
  private createMainScore(): HTMLDivElement {
    const container = document.createElement('div');
    // 전광판에 통합되었으므로 빈 컨테이너 반환
    container.className = 'hidden';
    return container;
  }

  /**
   * 점수 업데이트 (게임에서 호출)
   */
  update(score: number): void {
    const currentScoreEl = document.getElementById('scoreboard-current-score');
    if (!currentScoreEl) return;

    const oldScore = parseInt(currentScoreEl.textContent || '0');

    // 카운트업 애니메이션 (300ms)
    this.animateScoreboardCount(oldScore, score, 300);

    // Bounce 애니메이션
    const scoreboard = this.scoreBest;
    if (scoreboard) {
      scoreboard.classList.add('score-animate');
      setTimeout(() => {
        scoreboard.classList.remove('score-animate');
      }, 400);
    }

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
  private animateScoreboardCount(from: number, to: number, duration: number): void {
    const startTime = Date.now();
    const range = to - from;
    const numberEl = document.getElementById('scoreboard-current-score');
    if (!numberEl) return;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(from + range * easeOut);

      numberEl.textContent = current.toString();

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
    const numberEl = document.getElementById('best-score-number');
    if (!numberEl) return;

    numberEl.textContent = this.bestScore.toString();

    // 펄스 애니메이션
    this.scoreBest.classList.add('best-animate');
    setTimeout(() => {
      this.scoreBest.classList.remove('best-animate');
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
