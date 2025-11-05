/**
 * ViewManager - 모달 내 여러 뷰 전환을 관리
 *
 * 기능:
 * - 뷰 등록 및 전환
 * - 타이틀 변경
 * - 뒤로가기 버튼 표시/숨김
 */

export interface ViewConfig {
  element: HTMLDivElement;
  title: string;
  showBackButton: boolean;
}

export class ViewManager {
  private views: Map<string, ViewConfig> = new Map();
  private currentView: string | null = null;
  private titleElement: HTMLDivElement;
  private backButton: HTMLButtonElement;
  private onBackCallback?: () => void;

  constructor(titleElement: HTMLDivElement, backButton: HTMLButtonElement) {
    this.titleElement = titleElement;
    this.backButton = backButton;
    this.setupBackButton();
  }

  /**
   * 뒤로가기 버튼 설정
   */
  private setupBackButton(): void {
    this.backButton.addEventListener('click', () => {
      if (this.onBackCallback) {
        this.onBackCallback();
      }
    });
    this.backButton.addEventListener('touchstart', () => {
      if (this.onBackCallback) {
        this.onBackCallback();
      }
    });
  }

  /**
   * 뷰 등록
   */
  registerView(name: string, config: ViewConfig): void {
    this.views.set(name, config);
  }

  /**
   * 뷰 전환
   */
  switchTo(viewName: string): void {
    const viewConfig = this.views.get(viewName);
    if (!viewConfig) {
      console.warn(`View "${viewName}" not found`);
      return;
    }

    // 모든 뷰 숨기기
    this.views.forEach((config) => {
      config.element.classList.add('hidden');
    });

    // 현재 뷰 보이기
    viewConfig.element.classList.remove('hidden');

    // 타이틀 변경
    this.titleElement.textContent = viewConfig.title;

    // 뒤로가기 버튼 표시/숨김
    if (viewConfig.showBackButton) {
      this.backButton.classList.remove('hidden');
    } else {
      this.backButton.classList.add('hidden');
    }

    this.currentView = viewName;
  }

  /**
   * 현재 뷰 이름 가져오기
   */
  getCurrentView(): string | null {
    return this.currentView;
  }

  /**
   * 뒤로가기 콜백 설정
   */
  setOnBack(callback: () => void): void {
    this.onBackCallback = callback;
  }
}
