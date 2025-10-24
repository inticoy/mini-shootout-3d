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
   * BEST 스코어 컨테이너 생성 (Tailwind + Glass Morphism)
   */
  private createBestScore(): HTMLDivElement {
    const container = document.createElement('div');

    // Tailwind classes (햄버거 버튼과 통일)
    container.className = `
      absolute top-5 left-1/2 -translate-x-1/2
      h-12 flex items-center gap-2
      px-4
      rounded-2xl
      backdrop-blur-[10px]
      transition-all duration-300
      xs-height:h-8 xs-height:px-2.5 xs-height:top-2.5
      landscape-xs:h-7 landscape-xs:px-2 landscape-xs:top-2 landscape-xs:gap-1.5
      glass-best
    `.trim().replace(/\s+/g, ' ');

    // Label (스코어 숫자와 같은 크기)
    const label = document.createElement('span');
    label.className = `
      text-xl font-russo tracking-[0.15em] text-yellow-400 leading-5
      xs-height:text-sm xs-height:leading-3 xs-height:tracking-wider
      landscape-xs:text-xs landscape-xs:leading-3
    `.trim().replace(/\s+/g, ' ');
    label.textContent = 'BEST';

    // Number
    const number = document.createElement('span');
    number.id = 'best-score-number';
    number.className = `
      text-xl font-russo text-white leading-5
      xs-height:text-sm xs-height:leading-3
      landscape-xs:text-xs landscape-xs:leading-3
    `.trim().replace(/\s+/g, ' ');
    number.textContent = this.bestScore.toString();

    container.appendChild(label);
    container.appendChild(number);

    return container;
  }

  /**
   * 메인 스코어 컨테이너 생성 (Tailwind + Glass Morphism)
   */
  private createMainScore(): HTMLDivElement {
    const container = document.createElement('div');

    // Outer container (positioning)
    container.className = `
      absolute left-1/2 -translate-x-1/2
      transition-all duration-400
    `.trim().replace(/\s+/g, ' ');
    container.style.top = '13vh';

    // 반응형: 작은 화면에서 top 값 조정
    if (typeof window !== 'undefined') {
      const updatePosition = () => {
        if (window.innerHeight <= 550) {
          container.style.top = '15vh';
        } else {
          container.style.top = '13vh';
        }
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
    }

    // Inner glass container (햄버거 버튼과 통일)
    const glassBox = document.createElement('div');
    glassBox.id = 'main-score-glass';
    glassBox.className = `
      relative
      px-8 py-4
      rounded-2xl
      backdrop-blur-[12px]
      transition-all duration-400
      xs-height:px-4 xs-height:py-2 xs-height:rounded-xl
      landscape-xs:px-3 landscape-xs:py-1.5 landscape-xs:rounded-lg
      glass-main-score
    `.trim().replace(/\s+/g, ' ');

    // Number
    const number = document.createElement('div');
    number.id = 'score-number';
    number.className = `
      font-russo text-[60px] text-white
      leading-none tracking-wide
      transition-all duration-400
      xs-height:text-[36px]
      landscape-xs:text-[28px]
    `.trim().replace(/\s+/g, ' ');
    number.textContent = '0';

    glassBox.appendChild(number);
    container.appendChild(glassBox);

    return container;
  }

  /**
   * 점수 업데이트 (게임에서 호출)
   */
  update(score: number): void {
    const oldScore = parseInt(
      document.getElementById('score-number')?.textContent || '0'
    );

    // 카운트업 애니메이션 (300ms)
    this.animateCount(oldScore, score, 300);

    // Bounce 애니메이션
    const glassBox = document.getElementById('main-score-glass');
    if (glassBox) {
      glassBox.classList.add('score-animate');
      setTimeout(() => {
        glassBox.classList.remove('score-animate');
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
  private animateCount(from: number, to: number, duration: number): void {
    const startTime = Date.now();
    const range = to - from;
    const numberEl = document.getElementById('score-number');
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
