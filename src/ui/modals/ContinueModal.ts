/**
 * ContinueModal - 광고보고 이어하기 모달 (1단계)
 *
 * 프로덕션 레벨 UI:
 * - 원형 버튼 + 진행바 (3-5초 카운트다운)
 * - 중앙 정렬 레이아웃
 * - 부드러운 애니메이션
 * - 모바일 게임 스타일
 */

import { BaseModal } from './BaseModal';

export interface ContinueModalCallbacks {
  onBeforeOpen?: () => void;       // 모달 열리기 전 (광고 로드용)
  onContinue?: () => void;         // 광고보고 이어하기
  onGiveUp?: () => void;           // 포기하기 (GameOver로 전환)
  onTimeout?: () => void;          // 타임아웃 (GameOver로 전환)
}

export interface ContinueModalOptions {
  timeoutSeconds?: number;         // 타임아웃 시간 (기본 5초)
}

export class ContinueModal extends BaseModal {
  private callbacks: ContinueModalCallbacks;
  private timeoutSeconds: number;
  private continueButton!: HTMLButtonElement;
  private giveUpButton!: HTMLButtonElement;
  private progressCircle!: SVGCircleElement;
  private percentageText!: HTMLSpanElement;
  private timerText!: HTMLSpanElement;
  private timerInterval?: number;
  private startTime?: number;

  constructor(
    container: HTMLElement,
    callbacks: ContinueModalCallbacks = {},
    options: ContinueModalOptions = {}
  ) {
    super({
      closeOnEsc: false,      // ESC로 닫기 비활성화
      closeOnBackdrop: false, // 배경 클릭으로 닫기 비활성화
      containerElement: container
    });

    this.callbacks = callbacks;
    this.timeoutSeconds = options.timeoutSeconds ?? 5;

    this.createModalContent();
  }

  /**
   * 모달 컨텐츠 생성
   */
  private createModalContent(): void {
    // BaseModal의 content를 완전히 새로 구성
    this.content.className = `
      absolute inset-0
      flex items-center justify-center
      px-6
    `.trim().replace(/\s+/g, ' ');

    const contentWrapper = document.createElement('div');
    contentWrapper.className = `
      w-full max-w-md
      flex flex-col items-center justify-center
      gap-8
    `.trim().replace(/\s+/g, ' ');

    // 타이틀
    const title = document.createElement('div');
    title.className = `
      font-russo text-white tracking-tight font-black text-center
      animate-fade-in
    `.trim().replace(/\s+/g, ' ');
    title.style.fontSize = 'clamp(24px, 5vw, 32px)';
    title.textContent = '게임을 계속하시겠습니까?';

    // 원형 버튼 + 진행바
    const continueButtonWrapper = this.createContinueButton();

    // 포기하기 버튼
    this.giveUpButton = this.createGiveUpButton();

    contentWrapper.appendChild(title);
    contentWrapper.appendChild(continueButtonWrapper);
    contentWrapper.appendChild(this.giveUpButton);

    this.content.appendChild(contentWrapper);
  }

  /**
   * 원형 진행바가 있는 이어하기 버튼 생성
   */
  private createContinueButton(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative flex items-center justify-center';

    // SVG 원형 진행바
    const size = 200;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size.toString());
    svg.setAttribute('height', size.toString());
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('absolute', '-rotate-90');
    svg.style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))';

    // 배경 원
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', (size / 2).toString());
    bgCircle.setAttribute('cy', (size / 2).toString());
    bgCircle.setAttribute('r', radius.toString());
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
    bgCircle.setAttribute('stroke-width', strokeWidth.toString());

    // 진행 원
    this.progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.progressCircle.setAttribute('cx', (size / 2).toString());
    this.progressCircle.setAttribute('cy', (size / 2).toString());
    this.progressCircle.setAttribute('r', radius.toString());
    this.progressCircle.setAttribute('fill', 'none');
    this.progressCircle.setAttribute('stroke', '#ffffff');
    this.progressCircle.setAttribute('stroke-width', strokeWidth.toString());
    this.progressCircle.setAttribute('stroke-linecap', 'round');
    this.progressCircle.setAttribute('stroke-dasharray', circumference.toString());
    this.progressCircle.setAttribute('stroke-dashoffset', '0');
    this.progressCircle.style.transition = 'stroke-dashoffset 0.1s linear';

    svg.appendChild(bgCircle);
    svg.appendChild(this.progressCircle);

    // 중앙 버튼
    this.continueButton = document.createElement('button');
    this.continueButton.type = 'button';
    this.continueButton.className = `
      relative z-10
      w-[180px] h-[180px]
      flex flex-col items-center justify-center gap-3
      rounded-full
      bg-gradient-to-br from-white/25 to-white/15
      border-2 border-white/40
      shadow-[0_12px_32px_rgba(0,0,0,0.4)]
      backdrop-blur-sm
      transition-all duration-200
      hover:scale-105 hover:border-white/60 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]
      active:scale-95
    `.trim().replace(/\s+/g, ' ');

    const icon = document.createElement('i');
    icon.className = 'ph-fill ph-play-circle text-5xl text-white drop-shadow-lg';

    const text = document.createElement('span');
    text.className = 'text-white font-bold text-sm px-4 text-center leading-tight';
    text.textContent = '광고보고 이어하기';

    // 타이머 표시
    this.timerText = document.createElement('span');
    this.timerText.className = 'text-white/90 font-black text-3xl font-russo';
    this.timerText.textContent = this.timeoutSeconds.toString();

    // 퍼센트 표시 (작게)
    this.percentageText = document.createElement('span');
    this.percentageText.className = 'text-white/60 font-semibold text-xs';
    this.percentageText.textContent = '';

    this.continueButton.appendChild(icon);
    this.continueButton.appendChild(text);
    this.continueButton.appendChild(this.timerText);
    this.continueButton.appendChild(this.percentageText);

    this.addPressEffect(this.continueButton);

    this.continueButton.addEventListener('click', () => {
      this.stopTimer();
      this.close();
      this.callbacks.onContinue?.();
    });

    wrapper.appendChild(svg);
    wrapper.appendChild(this.continueButton);

    return wrapper;
  }

  /**
   * 포기하기 버튼 생성
   */
  private createGiveUpButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `
      px-8 py-3 rounded-xl
      bg-white/8 border border-white/20
      shadow-[0_4px_12px_rgba(0,0,0,0.2)]
      text-white/70 font-medium text-sm
      transition-all duration-200
      hover:bg-white/12 hover:border-white/30 hover:text-white/90
      active:bg-white/6 active:scale-95
    `.trim().replace(/\s+/g, ' ');
    button.textContent = '포기하기';

    this.addPressEffect(button);

    button.addEventListener('click', () => {
      this.stopTimer();
      this.close();
      this.callbacks.onGiveUp?.();
    });

    return button;
  }

  /**
   * 타이머 시작
   */
  private startTimer(): void {
    this.startTime = Date.now();
    const duration = this.timeoutSeconds * 1000;
    const size = 200;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const updateProgress = () => {
      if (!this.startTime) return;

      const elapsed = Date.now() - this.startTime;
      const progress = Math.min(elapsed / duration, 1);
      const remaining = Math.max(0, this.timeoutSeconds - elapsed / 1000);

      // 진행바 업데이트 (시계방향으로 진행)
      const offset = circumference * progress;
      this.progressCircle.setAttribute('stroke-dashoffset', offset.toString());

      // 타이머 텍스트 업데이트 (남은 시간)
      this.timerText.textContent = Math.ceil(remaining).toString();

      // 색상 변화 (시간이 줄어들면 빨간색으로)
      if (remaining <= 2) {
        this.progressCircle.setAttribute('stroke', '#ff6b6b');
        this.timerText.style.color = '#ff6b6b';
      } else if (remaining <= 3) {
        this.progressCircle.setAttribute('stroke', '#ffd93d');
        this.timerText.style.color = '#ffd93d';
      }

      // 버튼 펄스 애니메이션 (마지막 3초)
      if (remaining <= 3 && remaining > 0) {
        const pulseScale = 1 + Math.sin(elapsed * 0.008) * 0.03;
        this.continueButton.style.transform = `scale(${pulseScale})`;
      }

      if (progress >= 1) {
        // 타임아웃
        this.stopTimer();
        this.close();
        this.callbacks.onTimeout?.();
      }
    };

    // 60fps로 업데이트
    this.timerInterval = window.setInterval(updateProgress, 1000 / 60);
  }

  /**
   * 타이머 중지
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    this.startTime = undefined;
  }

  /**
   * 타이머 리셋
   */
  private resetTimer(): void {
    this.stopTimer();

    this.progressCircle.setAttribute('stroke-dashoffset', '0');
    this.progressCircle.setAttribute('stroke', '#ffffff');
    this.timerText.textContent = this.timeoutSeconds.toString();
    this.timerText.style.color = '';
    this.percentageText.textContent = '';
    this.continueButton.style.transform = '';
  }

  /**
   * 모달 열린 후 타이머 시작
   */
  protected onAfterOpen(): void {
    this.startTimer();
  }

  /**
   * 모달 열리기 전 광고 로드 시작
   */
  protected onBeforeOpen(): void {
    if (this.callbacks.onBeforeOpen) {
      this.callbacks.onBeforeOpen();
    }
  }

  /**
   * 모달 닫히기 전 타이머 중지
   */
  protected onBeforeClose(): void {
    this.stopTimer();
  }

  /**
   * 모달 닫힌 후 타이머 리셋
   */
  protected onAfterClose(): void {
    this.resetTimer();
  }

  /**
   * 정리
   */
  destroy(): void {
    this.stopTimer();
    super.destroy();
  }
}
