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
    '정강이 보호대 착용 중...',
    '유니폼 입는 중...',
    '스트레칭 하는 중...',
    '잔디 맛보는 중...',
	'상대와 기싸움하는 중...',
	'심판과 악수 중...',
  ];

  private currentMessageIndex = 0;

  private static readonly CLASS_NAMES = {
    container: 'loading-screen fixed inset-0 z-[9999] flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#0f4d2e_0%,#1a5c3a_50%,#0a3d23_100%)] transition-opacity duration-500 ease-out text-white',
    titleSection: 'loading-screen__title mb-[60px] text-center animate-fade-in-down',
    titleText: 'loading-screen__title-text whitespace-nowrap text-[24px] font-black uppercase tracking-[1px] text-white md:text-[32px] md:tracking-[2px] lg:text-[56px] lg:tracking-[4px] [text-shadow:0_0_30px_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.5),0_0_60px_rgba(58,143,90,0.4)]',
    subtitle: 'loading-screen__subtitle mt-[10px] text-[16px] font-bold uppercase tracking-[4px] text-[#7dd3a0] md:text-[20px] md:tracking-[6px] lg:text-[32px] lg:tracking-[12px] [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]',
    message: 'loading-screen__message mb-10 min-h-[32px] text-center text-[16px] font-semibold text-[rgba(255,255,255,0.9)] md:text-[18px] lg:text-[24px] [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] animate-fade-in-up',
    progressContainer: 'loading-screen__progress-container relative w-[500px] max-w-[80vw]',
    progressBar: 'loading-screen__progress-bar relative h-[12px] w-full overflow-hidden rounded-[20px] border-[2px] border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.3)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4),0_0_20px_rgba(0,0,0,0.2)]',
    progressFill: 'loading-screen__progress-fill relative h-full w-0 overflow-hidden rounded-[20px] bg-[linear-gradient(90deg,#3a8f5a_0%,#4db870_50%,#3a8f5a_100%)] shadow-[0_0_20px_rgba(77,184,112,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
    progressShine: 'loading-screen__progress-shine absolute left-[-100%] top-0 h-full w-full animate-shine bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0)_100%)]',
    progressText: 'loading-screen__progress-text mt-4 block text-center text-[18px] font-bold text-[rgba(255,255,255,0.95)] tracking-[2px] [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]',
    tip: 'loading-screen__tip absolute left-1/2 bottom-[40px] max-w-[600px] -translate-x-1/2 px-[20px] text-center text-[14px] text-[rgba(255,255,255,0.7)] animate-fade-in-delayed lg:bottom-[60px] lg:text-[16px]',
    tipStrong: 'text-[#7dd3a0] font-bold'
  };

  constructor() {
    const bootstrap = document.querySelector<HTMLDivElement>('.loading-screen[data-preload="true"]');

    if (bootstrap) {
      this.container = bootstrap;
      this.container.className = LoadingScreen.CLASS_NAMES.container;
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
      const titleSection = this.container.querySelector<HTMLDivElement>('.loading-screen__title');
      const titleText = this.container.querySelector<HTMLHeadingElement>('.loading-screen__title-text');
      const subtitle = this.container.querySelector<HTMLParagraphElement>('.loading-screen__subtitle');
      const tipSection = this.container.querySelector<HTMLDivElement>('.loading-screen__tip');
      const tipStrong = tipSection?.querySelector<HTMLSpanElement | HTMLStrongElement>('strong');

      if (!message || !progressContainer || !progressBar || !progressFill || !progressText) {
        throw new Error('Preload loading screen markup is missing required elements.');
      }

      titleSection?.setAttribute('class', LoadingScreen.CLASS_NAMES.titleSection);
      titleText?.setAttribute('class', LoadingScreen.CLASS_NAMES.titleText);
      subtitle?.setAttribute('class', LoadingScreen.CLASS_NAMES.subtitle);
      tipSection?.setAttribute('class', LoadingScreen.CLASS_NAMES.tip);
      tipStrong?.setAttribute('class', LoadingScreen.CLASS_NAMES.tipStrong);

      this.messageText = message;
      this.messageText.setAttribute('class', LoadingScreen.CLASS_NAMES.message);
      this.progressBar = progressBar;
      this.progressBar.setAttribute('class', LoadingScreen.CLASS_NAMES.progressBar);
      this.progressFill = progressFill;
      this.progressFill.setAttribute('class', LoadingScreen.CLASS_NAMES.progressFill);
      this.progressText = progressText;
      this.progressText.setAttribute('class', LoadingScreen.CLASS_NAMES.progressText);
      progressContainer.setAttribute('class', LoadingScreen.CLASS_NAMES.progressContainer);

      let shine = this.progressFill.querySelector<HTMLDivElement>('.loading-screen__progress-shine');
      if (!shine) {
        shine = document.createElement('div');
        shine.className = LoadingScreen.CLASS_NAMES.progressShine;
        this.progressFill.appendChild(shine);
      } else {
        shine.className = LoadingScreen.CLASS_NAMES.progressShine;
      }

      this.progressFill.style.width = '0%';
      this.progressText.textContent = '0%';
      this.messageText.textContent = this.footballMessages[0];
    } else {
      this.container = document.createElement('div');
      this.container.className = LoadingScreen.CLASS_NAMES.container;

      // 로고/타이틀 영역
      const titleSection = document.createElement('div');
      titleSection.className = LoadingScreen.CLASS_NAMES.titleSection;

      const title = document.createElement('h1');
      title.className = LoadingScreen.CLASS_NAMES.titleText;
      title.textContent = 'MINI SHOOTOUT';
      titleSection.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.className = LoadingScreen.CLASS_NAMES.subtitle;
      subtitle.textContent = '3D';
      titleSection.appendChild(subtitle);

      // 메시지 영역
      this.messageText = document.createElement('div');
      this.messageText.className = LoadingScreen.CLASS_NAMES.message;
      this.messageText.textContent = this.footballMessages[0];

      // 프로그레스 바 컨테이너
      const progressContainer = document.createElement('div');
      progressContainer.className = LoadingScreen.CLASS_NAMES.progressContainer;

      this.progressBar = document.createElement('div');
      this.progressBar.className = LoadingScreen.CLASS_NAMES.progressBar;

      this.progressFill = document.createElement('div');
      this.progressFill.className = LoadingScreen.CLASS_NAMES.progressFill;

      // 프로그레스 바 내부 shine 효과
      const progressShine = document.createElement('div');
      progressShine.className = LoadingScreen.CLASS_NAMES.progressShine;
      this.progressFill.appendChild(progressShine);

      this.progressBar.appendChild(this.progressFill);

      // 퍼센트 텍스트
      this.progressText = document.createElement('span');
      this.progressText.className = LoadingScreen.CLASS_NAMES.progressText;
      this.progressText.textContent = '0%';

      progressContainer.appendChild(this.progressBar);
      progressContainer.appendChild(this.progressText);

      // 팁 영역
      const tipSection = document.createElement('div');
      tipSection.className = LoadingScreen.CLASS_NAMES.tip;
      const tipStrong = document.createElement('strong');
      tipStrong.className = LoadingScreen.CLASS_NAMES.tipStrong;
      tipStrong.textContent = 'TIP:';
      const tipText = document.createTextNode(' 공의 다른 부분을 스와이프하여 커브와 스핀을 제어하세요!');
      tipSection.appendChild(tipStrong);
      tipSection.appendChild(tipText);

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
