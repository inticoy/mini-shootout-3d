/**
 * ScoreDisplay - Glass Morphism Style with Tailwind
 *
 * 게임 점수를 표시하고 업데이트하는 UI 컴포넌트
 * - 현재 점수: 카운트업 애니메이션
 * - 최고 기록: localStorage 저장 및 표시
 * - Tailwind CSS 기반 스타일링
 */
export class ScoreDisplay {
  private scoreContainer: HTMLDivElement;
  private bestContainer: HTMLDivElement;
  private bestScore: number;
  private isNewRecord = false;

  constructor(container: HTMLElement) {
    // localStorage에서 최고 기록 로드
    this.bestScore = this.loadBestScore();

    // BEST 표시 (최상단)
    this.bestContainer = this.createBestScore();

    // 현재 점수 (중앙)
    this.scoreContainer = this.createMainScore();

    container.appendChild(this.bestContainer);
    container.appendChild(this.scoreContainer);
  }

  /**
   * BEST 스코어 컨테이너 생성 (전광판 스타일)
   */
  private createBestScore(): HTMLDivElement {
    const container = document.createElement('div');

    container.className = `
      pointer-events-none absolute top-0 left-3 z-20
      inline-flex items-center gap-2
      px-3.5 py-1.5
      rounded-[36px]
      border border-white/10
      bg-[#0000009A]
      shadow-[0_6px_18px_rgba(0,0,0,0.45)]
      font-montserrat text-base font-semibold text-white
      landscape-xs:top-0 landscape-xs:px-3 landscape-xs:py-1.5
      landscape-xs:text-sm
    `.trim().replace(/\s+/g, ' ');

    const isAppInToss =
      typeof navigator !== 'undefined' ? /TossApp/i.test(navigator.userAgent) : false;

    if (!isAppInToss) {
      container.style.top = 'calc(env(safe-area-inset-top, 0px) + 1rem)';
      container.style.left = 'calc(env(safe-area-inset-left, 0px) + 1rem)';
    }

    const label = document.createElement('span');
    label.textContent = 'Best:';
    label.className = 'text-[#FFEE00] drop-shadow-[0_0_6px_rgba(255,238,0,0.45)]';

    const number = document.createElement('span');
    number.id = 'best-score-number';
    number.className = 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.45)]';
    number.textContent = this.bestScore.toString();

    container.appendChild(label);
    container.appendChild(number);

    return container;
  }

  /**
   * 메인 스코어 컨테이너 생성 (더미 - 전광판에 통합됨)
   */
  private createMainScore(): HTMLDivElement {
    const container = document.createElement('div');

    container.className = `
      pointer-events-none absolute top-[12%] left-1/2 -translate-x-1/2
      flex flex-col items-center justify-center
      w-[148px] px-6 py-4
      rounded-[24px]
      border border-white/10
      bg-[#00000099]
      shadow-[0_12px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.35)]
      transition-all duration-300
      landscape-xs:w-[140px] landscape-xs:px-5 landscape-xs:py-3
    `.trim().replace(/\s+/g, ' ');

    const currentScore = document.createElement('div');
    currentScore.id = 'scoreboard-current-score';
    currentScore.className = `
      font-montserrat text-[72px] font-black tracking-wide leading-none
      text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]
      landscape-xs:text-[32px]
    `.trim().replace(/\s+/g, ' ');
    currentScore.textContent = '0';

    container.appendChild(currentScore);

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
    const scoreboard = this.scoreContainer;
    if (scoreboard) {
      const animationClass = 'animate-scoreboard-pulse';
      scoreboard.classList.add(animationClass);
      setTimeout(() => {
        scoreboard.classList.remove(animationClass);
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
    const animationClass = 'animate-best-score-pop';
    this.bestContainer.classList.add(animationClass);
    setTimeout(() => {
      this.bestContainer.classList.remove(animationClass);
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
    this.scoreContainer.remove();
    this.bestContainer.remove();
  }
}
