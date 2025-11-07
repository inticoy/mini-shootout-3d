/**
 * BaseModal - 모든 모달의 기본 클래스
 *
 * 공통 기능:
 * - 열기/닫기 애니메이션
 * - 배경 블러 처리
 * - ESC 키 처리
 * - 스크롤 잠금
 * - Safe area 처리
 */

export interface BaseModalOptions {
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  containerElement?: HTMLElement;
}

export abstract class BaseModal {
  protected overlay: HTMLDivElement;
  protected content: HTMLDivElement;
  protected closeOnEsc: boolean;
  protected closeOnBackdrop: boolean;
  protected isOpen: boolean = false;
  private keydownHandler?: (event: KeyboardEvent) => void;

  constructor(options: BaseModalOptions = {}) {
    this.closeOnEsc = options.closeOnEsc ?? true;
    this.closeOnBackdrop = options.closeOnBackdrop ?? false;

    this.overlay = this.createOverlay();
    this.content = this.createContentWrapper();

    this.overlay.appendChild(this.content);

    if (options.containerElement) {
      options.containerElement.appendChild(this.overlay);
    }

    this.setupEventListeners();
  }

  /**
   * 오버레이 생성 (배경)
   */
  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = `
      fixed inset-0
      flex
      bg-black/40 backdrop-blur-[2px] ios-backdrop
      opacity-0 pointer-events-none
      transition-opacity duration-300
      z-[30]
    `.trim().replace(/\s+/g, ' ');

    overlay.style.display = 'none';
    return overlay;
  }

  /**
   * 컨텐츠 래퍼 생성
   */
  private createContentWrapper(): HTMLDivElement {
    const content = document.createElement('div');
    content.className = `
      relative flex h-full w-full flex-col
      overflow-y-auto
      pt-[15vh] pb-[5vh]
      bg-black/30
      backdrop-blur-sm ios-backdrop
      text-white
      transition-all duration-300 ease-out
    `.trim().replace(/\s+/g, ' ');

    // Safe area padding
    content.style.paddingRight = 'calc(env(safe-area-inset-right, 0px) + 16px)';
    content.style.paddingLeft = 'calc(env(safe-area-inset-left, 0px) + 16px)';

    return content;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // ESC 키 처리
    if (this.closeOnEsc) {
      this.keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.keydownHandler);
    }

    // 배경 클릭 처리
    if (this.closeOnBackdrop) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }
  }

  /**
   * 모달 열기
   */
  open(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    this.onBeforeOpen();

    // display를 먼저 flex로 변경 (애니메이션을 위해)
    this.overlay.style.display = 'flex';

    // 다음 프레임에서 opacity 변경 (transition이 작동하도록)
    requestAnimationFrame(() => {
      this.overlay.classList.remove('opacity-0', 'pointer-events-none');
      this.overlay.classList.add('opacity-100', 'pointer-events-auto');
    });

    // 스크롤 잠금
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    this.onAfterOpen();
  }

  /**
   * 모달 닫기
   */
  close(): void {
    if (!this.isOpen) return;

    this.onBeforeClose();

    this.overlay.classList.add('opacity-0');
    this.overlay.classList.remove('opacity-100');

    // 애니메이션 완료 후 처리
    setTimeout(() => {
      this.overlay.classList.add('pointer-events-none');
      this.overlay.classList.remove('pointer-events-auto');
      this.overlay.style.display = 'none';

      // 스크롤 잠금 해제
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';

      this.isOpen = false;
      this.onAfterClose();
    }, 300); // transition duration과 동일
  }

  /**
   * 모달이 열려있는지 확인
   */
  isModalOpen(): boolean {
    return this.isOpen;
  }

  /**
   * 버튼에 press 효과 추가
   */
  protected addPressEffect(button: HTMLButtonElement): void {
    const onPress = () => {
      button.classList.add('button-pressed');
    };

    const onRelease = () => {
      button.classList.remove('button-pressed');
    };

    button.addEventListener('pointerdown', onPress);
    button.addEventListener('pointerup', onRelease);
    button.addEventListener('pointercancel', onRelease);
    button.addEventListener('pointerleave', onRelease);

    button.addEventListener('touchstart', onPress, { passive: true });
    button.addEventListener('touchend', onRelease, { passive: true });
    button.addEventListener('touchcancel', onRelease, { passive: true });
  }

  /**
   * 정사각형 아이콘 버튼 생성 헬퍼
   */
  protected createSquareIconButton(id: string, iconSvg: string, label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.className = `
      flex-1 aspect-[0.85]
      flex flex-col items-center justify-center gap-3
      rounded-2xl
      bg-white/12 border border-white/15
      shadow-[0_8px_20px_rgba(0,0,0,0.2)]
      transition-all duration-150
      hover:bg-white/16 hover:border-white/25 hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]
      active:bg-white/10 active:shadow-[0_2px_8px_rgba(0,0,0,0.15)]
      max-w-[120px] max-h-[140px]
    `.trim().replace(/\s+/g, ' ');

    button.innerHTML = `
      ${iconSvg}
      <span class="text-white/90 font-medium text-sm">${label}</span>
    `;
    return button;
  }

  /**
   * 라이프사이클 훅: 열리기 직전
   */
  protected onBeforeOpen(): void {}

  /**
   * 라이프사이클 훅: 열린 직후
   */
  protected onAfterOpen(): void {}

  /**
   * 라이프사이클 훅: 닫히기 직전
   */
  protected onBeforeClose(): void {}

  /**
   * 라이프사이클 훅: 닫힌 직후
   */
  protected onAfterClose(): void {}

  /**
   * 정리
   */
  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    this.overlay.remove();
  }
}
