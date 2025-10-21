export interface LoadingItem {
  id: string;
  message: string;
  weight?: number; // 가중치 (기본값 1)
}

export class LoadingScreen {
  private container: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private progressText: HTMLSpanElement;
  private messageText: HTMLDivElement;
  private loadingItems: LoadingItem[] = [];
  private currentItemIndex = 0;
  private totalWeight = 0;
  private loadedWeight = 0;
  private isComplete = false;

  // 축구 테마 로딩 메시지
  private readonly footballMessages: string[] = [
    '양말 신는 중...',
    '축구화 끈 묶는 중...',
    '머리 만지는 중...',
    '정강이 보호대 착용 중...',
    '유니폼 입는 중...',
    '스트레칭 중...',
    '몸풀기 중...',
    '경기장 입장 준비 중...',
    '잔디 확인 중...',
    '골대 점검 중...',
    '공 터치감 확인 중...',
    '킥오프 준비 중...'
  ];

  private currentMessageIndex = 0;

  constructor() {
    const bootstrap = document.querySelector<HTMLDivElement>('.loading-screen[data-preload="true"]');

    if (bootstrap) {
      this.container = bootstrap;
      this.container.classList.remove('loading-screen--initial');
      this.container.removeAttribute('data-preload');

      if (this.container.parentElement !== document.body) {
        document.body.appendChild(this.container);
      }

      const message = this.container.querySelector<HTMLDivElement>('.loading-screen__message');
      const progressContainer = this.container.querySelector<HTMLDivElement>('.loading-screen__progress-container');
      const progressBar = progressContainer?.querySelector<HTMLDivElement>('.loading-screen__progress-bar');
      const progressFill = progressBar?.querySelector<HTMLDivElement>('.loading-screen__progress-fill');
      const progressText = progressContainer?.querySelector<HTMLSpanElement>('.loading-screen__progress-text');

      if (!message || !progressContainer || !progressBar || !progressFill || !progressText) {
        throw new Error('Preload loading screen markup is missing required elements.');
      }

      this.messageText = message;
      this.progressBar = progressBar;
      this.progressFill = progressFill;
      this.progressText = progressText;

      let shine = this.progressFill.querySelector<HTMLDivElement>('.loading-screen__progress-shine');
      if (!shine) {
        shine = document.createElement('div');
        shine.className = 'loading-screen__progress-shine';
        this.progressFill.appendChild(shine);
      }

      this.progressFill.style.width = '0%';
      this.progressText.textContent = '0%';
      this.messageText.textContent = this.footballMessages[0];
    } else {
      this.container = document.createElement('div');
      this.container.className = 'loading-screen';

      // 로고/타이틀 영역
      const titleSection = document.createElement('div');
      titleSection.className = 'loading-screen__title';

      const title = document.createElement('h1');
      title.className = 'loading-screen__title-text';
      title.textContent = 'MINI SHOOTOUT';
      titleSection.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.className = 'loading-screen__subtitle';
      subtitle.textContent = '3D';
      titleSection.appendChild(subtitle);

      // 메시지 영역
      this.messageText = document.createElement('div');
      this.messageText.className = 'loading-screen__message';
      this.messageText.textContent = this.footballMessages[0];

      // 프로그레스 바 컨테이너
      const progressContainer = document.createElement('div');
      progressContainer.className = 'loading-screen__progress-container';

      this.progressBar = document.createElement('div');
      this.progressBar.className = 'loading-screen__progress-bar';

      this.progressFill = document.createElement('div');
      this.progressFill.className = 'loading-screen__progress-fill';

      // 프로그레스 바 내부 shine 효과
      const progressShine = document.createElement('div');
      progressShine.className = 'loading-screen__progress-shine';
      this.progressFill.appendChild(progressShine);

      this.progressBar.appendChild(this.progressFill);

      // 퍼센트 텍스트
      this.progressText = document.createElement('span');
      this.progressText.className = 'loading-screen__progress-text';
      this.progressText.textContent = '0%';

      progressContainer.appendChild(this.progressBar);
      progressContainer.appendChild(this.progressText);

      // 팁 영역
      const tipSection = document.createElement('div');
      tipSection.className = 'loading-screen__tip';
      tipSection.innerHTML = '<strong>TIP:</strong> 공의 다른 부분을 스와이프하여 커브와 스핀을 제어하세요!';

      // 모두 조립
      this.container.appendChild(titleSection);
      this.container.appendChild(this.messageText);
      this.container.appendChild(progressContainer);
      this.container.appendChild(tipSection);

      document.body.appendChild(this.container);
    }
  }

  /**
   * 로딩할 아이템 목록 설정
   */
  public setLoadingItems(items: LoadingItem[]) {
    this.loadingItems = items;
    this.totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    this.loadedWeight = 0;
    this.currentItemIndex = 0;
    this.updateProgress();
  }

  /**
   * 다음 아이템 로딩 완료 처리
   */
  public completeItem(itemId: string) {
    const item = this.loadingItems.find(i => i.id === itemId);
    if (!item) return;

    this.loadedWeight += item.weight || 1;
    this.currentItemIndex++;

    // 메시지 업데이트
    if (this.currentItemIndex < this.footballMessages.length) {
      this.messageText.textContent = this.footballMessages[this.currentItemIndex];
    }

    this.updateProgress();
  }

  /**
   * 프로그레스 직접 설정 (0-1)
   */
  public setProgress(progress: number) {
    const percent = Math.min(Math.max(progress * 100, 0), 100);
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = `${Math.floor(percent)}%`;

    // 메시지 업데이트 (진행도에 따라)
    const messageIndex = Math.min(
      Math.floor((progress * this.footballMessages.length)),
      this.footballMessages.length - 1
    );

    if (messageIndex !== this.currentMessageIndex) {
      this.currentMessageIndex = messageIndex;
      this.messageText.textContent = this.footballMessages[messageIndex];

      // 메시지 변경 애니메이션
      this.messageText.style.animation = 'none';
      setTimeout(() => {
        this.messageText.style.animation = 'fadeInUp 0.4s ease-out';
      }, 10);
    }

    if (percent >= 100 && !this.isComplete) {
      this.isComplete = true;
      setTimeout(() => this.hide(), 300);
    }
  }

  /**
   * 내부 프로그레스 업데이트
   */
  private updateProgress() {
    if (this.totalWeight === 0) return;

    const progress = this.loadedWeight / this.totalWeight;
    this.setProgress(progress);
  }

  /**
   * 로딩 화면 숨기기
   */
  public hide() {
    this.container.classList.add('loading-screen--hidden');
    setTimeout(() => {
      if (this.container.parentElement) {
        this.container.remove();
      }
    }, 500);
  }

  /**
   * 로딩 화면 표시
   */
  public show() {
    this.container.classList.remove('loading-screen--hidden');
  }
}
