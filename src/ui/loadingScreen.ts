import soccerBallUrl from '/soccer_ball.svg?url';
import { SwipeTracker } from '../input/swipeTracker';

export interface LoadingItem {
  id: string;
  message: string;
  weight?: number; // 가중치 (기본값 1)
}

export class LoadingScreen {
  private container: HTMLDivElement;
  private stage1Container: HTMLDivElement | null = null;
  private titleSection: HTMLDivElement | null = null; // 타이틀 섹션
  private progressBar!: HTMLDivElement;
  private progressFill!: HTMLDivElement;
  private progressText!: HTMLSpanElement;
  private messageText!: HTMLDivElement;
  private loadingItems: LoadingItem[] = [];
  private currentItemIndex = 0;
  private totalWeight = 0;
  private loadedWeight = 0;

  // 축구공 슛 메커니즘
  private soccerBall: HTMLImageElement | null = null;
  private soccerBallContainer: HTMLDivElement | null = null;
  private swipeCanvas: HTMLCanvasElement | null = null;
  private swipeTracker: SwipeTracker | null = null;
  private isReadyToEnter = false; // 슛을 쏘았는지
  private isLoadingComplete = false; // 로딩이 완료되었는지

  // 콜백
  private onSwipe?: () => void;
  private onLoadingComplete?: () => void;

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
    container: 'loading-screen fixed inset-0 z-[9999] flex h-full w-full flex-col items-center justify-start pt-[18vh] bg-[linear-gradient(180deg,#87CEEB_0%,#5BA3D8_50%,#4A90E2_100%)] transition-opacity duration-500 ease-out text-white overflow-hidden',
    titleSection: 'loading-screen__title mb-20 text-center animate-fade-in-down-large',
    titleText: 'loading-screen__title-text mx-6 w-[80vw] max-w-[500px] h-auto whitespace-nowrap text-[56px] font-black tracking-[2px] text-white md:text-[56px] md:tracking-[2px] lg:text-[56px] lg:tracking-[2px] [text-shadow:0_2px_6px_rgba(0,0,0,0.1)]',
    subtitle: 'loading-screen__subtitle mt-[10px] text-[18px] font-bold tracking-[3px] text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]',
    
    stage1Container: 'loading-screen__stage1-container absolute left-1/2 bottom-[80px] -translate-x-1/2 flex w-[500px] max-w-[80vw] flex-col items-center gap-12 opacity-100 transition-opacity duration-300 ease-out',
    
    message: 'loading-screen__message min-h-[24px] text-center text-[20px] font-bold text-[rgba(255,255,255,0.95)] [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]',

    progressContainer: 'loading-screen__progress-container relative w-full',
    progressBar: 'loading-screen__progress-bar relative h-5 w-full overflow-hidden rounded-full bg-black/30 backdrop-blur-sm border-2 border-white/20 shadow-inner',
    progressFill: 'loading-screen__progress-fill relative h-full w-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7),0_0_20px_rgba(74,144,226,0.5)] transition-[width] duration-300 ease-out',
    progressShine: 'loading-screen__progress-shine absolute left-[-100%] top-0 h-full w-full animate-shine bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0)_100%)]',
    progressText: 'loading-screen__progress-text absolute inset-0 flex items-center justify-center text-xs font-bold text-black [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]',

    tip: 'loading-screen__tip absolute left-1/2 bottom-[20px] max-w-[600px] -translate-x-1/2 px-[20px] text-center text-[14px] text-[rgba(255,255,255,0.7)] animate-fade-in-delayed lg:bottom-[30px] lg:text-[16px]',
    tipStrong: 'text-[#7dd3a0] font-bold',
    soccerBallContainer: 'loading-screen__soccer-ball-container absolute left-1/2 bottom-[80px] -translate-x-1/2 flex flex-col items-center gap-8 opacity-0 transition-opacity duration-1000',
    soccerBall: 'loading-screen__soccer-ball w-[96px] h-[96px] cursor-pointer animate-bounce-slow drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]',
    swipeCanvas: 'loading-screen__swipe-canvas fixed inset-0 z-[10000] touch-none pointer-events-auto'
  };

  constructor(onSwipe?: () => void, onLoadingComplete?: () => void) {
    this.onSwipe = onSwipe;
    this.onLoadingComplete = onLoadingComplete;
    const bootstrap = document.querySelector<HTMLDivElement>('.loading-screen[data-preload="true"]');

    if (bootstrap) {
      this.container = bootstrap;
      this.container.className = LoadingScreen.CLASS_NAMES.container;
      this.container.classList.remove('loading-screen--initial');
      this.container.removeAttribute('data-preload');

      if (this.container.parentElement !== document.body) {
        document.body.appendChild(this.container);
      }

      const titleSection = this.container.querySelector<HTMLDivElement>('.loading-screen__title');
      const titleText = this.container.querySelector<HTMLHeadingElement>('.loading-screen__title-text');
      
      // Find existing stage 1 elements
      const stage1Container = this.container.querySelector<HTMLDivElement>('.loading-screen__stage1-container');
      const message = this.container.querySelector<HTMLDivElement>('.loading-screen__message');
      const progressContainer = this.container.querySelector<HTMLDivElement>('.loading-screen__progress-container');
      const progressBar = progressContainer?.querySelector<HTMLDivElement>('.loading-screen__progress-bar');
      const progressFill = progressBar?.querySelector<HTMLDivElement>('.loading-screen__progress-fill');
      const progressText = progressBar?.querySelector<HTMLSpanElement>('.loading-screen__progress-text');

      if (!stage1Container || !message || !progressContainer || !progressBar || !progressFill || !progressText) {
        // If markup is not what we expect, recreate it
        this.clearContainer();
        this.buildDOM();
      } else {
        // Re-apply classes to ensure consistency
        titleSection?.setAttribute('class', LoadingScreen.CLASS_NAMES.titleSection);
        titleText?.setAttribute('class', LoadingScreen.CLASS_NAMES.titleText);
        if (titleText) {
          titleText.style.fontFamily = "'Russo One', sans-serif";
          titleText.innerHTML = '<span style="color: #ffe600ff;">Snap</span><span style="color: #ffffffff;">shoot!</span>';
        }

        // Subtitle 추가 (없으면)
        let subtitle = titleSection?.querySelector<HTMLParagraphElement>('.loading-screen__subtitle');
        if (!subtitle && titleSection) {
          subtitle = document.createElement('p');
          subtitle.className = LoadingScreen.CLASS_NAMES.subtitle;
          subtitle.textContent = 'by Inticoy';
          subtitle.style.fontFamily = "'Outfit', sans-serif";
          titleSection.appendChild(subtitle);
        } else if (subtitle) {
          subtitle.setAttribute('class', LoadingScreen.CLASS_NAMES.subtitle);
          subtitle.textContent = 'by Inticoy';
          subtitle.style.fontFamily = "'Outfit', sans-serif";
        }

        this.titleSection = titleSection;

        this.stage1Container = stage1Container;
        this.stage1Container.className = LoadingScreen.CLASS_NAMES.stage1Container;
        
        this.messageText = message;
        this.messageText.className = LoadingScreen.CLASS_NAMES.message;
        this.messageText.style.fontFamily = "'Chiron GoRound TC', sans-serif";
        
        progressContainer.className = LoadingScreen.CLASS_NAMES.progressContainer;
        
        this.progressBar = progressBar;
        this.progressBar.className = LoadingScreen.CLASS_NAMES.progressBar;
        
        this.progressFill = progressFill;
        this.progressFill.className = LoadingScreen.CLASS_NAMES.progressFill;
        
        this.progressText = progressText;
        this.progressText.className = LoadingScreen.CLASS_NAMES.progressText;

        // Ensure shine effect exists
        let shine = this.progressFill.querySelector<HTMLDivElement>('.loading-screen__progress-shine');
        if (!shine) {
          shine = document.createElement('div');
          shine.className = LoadingScreen.CLASS_NAMES.progressShine;
          this.progressFill.appendChild(shine);
        } else {
          shine.className = LoadingScreen.CLASS_NAMES.progressShine;
        }

        // Reset progress
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '0%';
        this.messageText.textContent = this.footballMessages[0];
      }
    } else {
      this.container = document.createElement('div');
      this.container.className = LoadingScreen.CLASS_NAMES.container;
      document.body.appendChild(this.container);
      this.buildDOM();
    }

    // 축구공 UI 초기화
    this.initializeSoccerBall();
  }

  private clearContainer() {
    while(this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  private buildDOM() {
      // 로고/타이틀 영역
      const titleSection = document.createElement('div');
      titleSection.className = LoadingScreen.CLASS_NAMES.titleSection;

      const title = document.createElement('img');
      title.src = '/assets/Snapshoot!.png';
      title.alt = 'Snapshoot!';
      title.className = LoadingScreen.CLASS_NAMES.titleText;
      titleSection.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.className = LoadingScreen.CLASS_NAMES.subtitle;
      subtitle.textContent = 'by Inticoy';
      subtitle.style.fontFamily = "'Outfit', sans-serif";
      titleSection.appendChild(subtitle);

      this.titleSection = titleSection;

      // 스테이지 1 컨테이너 (로딩 메시지 + 프로그레스 바)
      this.stage1Container = document.createElement('div');
      this.stage1Container.className = LoadingScreen.CLASS_NAMES.stage1Container;

      // 프로그레스 바 컨테이너
      const progressContainer = document.createElement('div');
      progressContainer.className = LoadingScreen.CLASS_NAMES.progressContainer;

      this.progressBar = document.createElement('div');
      this.progressBar.className = LoadingScreen.CLASS_NAMES.progressBar;

      this.progressFill = document.createElement('div');
      this.progressFill.className = LoadingScreen.CLASS_NAMES.progressFill;

      const progressShine = document.createElement('div');
      progressShine.className = LoadingScreen.CLASS_NAMES.progressShine;
      this.progressFill.appendChild(progressShine);

      this.progressBar.appendChild(this.progressFill);
      
      // 퍼센트 텍스트 (프로그레스 바 안에 위치)
      this.progressText = document.createElement('span');
      this.progressText.className = LoadingScreen.CLASS_NAMES.progressText;
      this.progressText.textContent = '0%';
      this.progressBar.appendChild(this.progressText);

      progressContainer.appendChild(this.progressBar);

      // 메시지 영역
      this.messageText = document.createElement('div');
      this.messageText.className = LoadingScreen.CLASS_NAMES.message;
      this.messageText.textContent = this.footballMessages[0];
      this.messageText.style.fontFamily = "'Chiron GoRound TC', sans-serif";

      // 스테이지 1 컨테이너에 순서대로 추가 (프로그레스 바가 위)
      this.stage1Container.appendChild(progressContainer);
      this.stage1Container.appendChild(this.messageText);

      // 모두 조립
      this.container.appendChild(titleSection);
      this.container.appendChild(this.stage1Container);
  }

  /**
   * 축구공 UI 및 스와이프 트래커 초기화
   */
  private initializeSoccerBall() {
    // 축구공 컨테이너 생성
    this.soccerBallContainer = document.createElement('div');
    this.soccerBallContainer.className = LoadingScreen.CLASS_NAMES.soccerBallContainer;

    // 축구공 이미지 생성
    this.soccerBall = document.createElement('img');
    this.soccerBall.src = soccerBallUrl;
    this.soccerBall.className = LoadingScreen.CLASS_NAMES.soccerBall;
    this.soccerBall.alt = 'Soccer Ball';

    // 안내 메시지
    const shootMessage = document.createElement('div');
    shootMessage.className = 'text-center text-[20px] font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]';
    shootMessage.textContent = '위로 스와이프해 스냅슛!';
    shootMessage.style.fontFamily = "'Chiron GoRound TC', sans-serif";

    this.soccerBallContainer.appendChild(this.soccerBall);
    this.soccerBallContainer.appendChild(shootMessage);
    this.container.appendChild(this.soccerBallContainer);

    // 투명 캔버스 생성 (스와이프 감지용)
    this.swipeCanvas = document.createElement('canvas');
    this.swipeCanvas.className = LoadingScreen.CLASS_NAMES.swipeCanvas;
    this.swipeCanvas.width = window.innerWidth;
    this.swipeCanvas.height = window.innerHeight;
    this.container.appendChild(this.swipeCanvas);

    // SwipeTracker 초기화
    this.swipeTracker = new SwipeTracker(this.swipeCanvas, 10);

    // 스와이프 이벤트 감지
    this.swipeCanvas.addEventListener('pointerup', () => {
      this.handleSwipe();
    });
  }

  /**
   * 스와이프 감지 시 호출되는 핸들러
   */
  private handleSwipe() {
    if (!this.swipeTracker || this.isReadyToEnter) return;

    const swipeData = this.swipeTracker.getLastSwipe();
    if (!swipeData || swipeData.points.length < 2) return;

    // 슛을 쏜 것으로 표시
    this.isReadyToEnter = true;

    // onSwipe 콜백 호출 (배경음악 시작)
    this.onSwipe?.();

    // 스와이프 방향 계산
    const firstPoint = swipeData.points[0];
    const lastPoint = swipeData.points[swipeData.points.length - 1];
    const deltaX = lastPoint.x - firstPoint.x;
    const deltaY = lastPoint.y - firstPoint.y;

    // 스와이프 강도 계산
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = swipeData.duration;
    const speed = distance / (duration || 1);

    // 슛 애니메이션 실행
    this.animateShot(deltaX, deltaY, speed);
  }

  /**
   * 축구공이 날아가는 애니메이션
   */
  private animateShot(deltaX: number, _deltaY: number, speed: number) {
    if (!this.soccerBall) return;

    // Stop the bounce animation and reset transform
    this.soccerBall.classList.remove('animate-bounce-slow');
    this.soccerBall.style.transform = ''; // 초기화

    // 스와이프 캔버스 숨기기 (더 이상 스와이프 불가)
    if (this.swipeCanvas) {
      this.swipeCanvas.style.pointerEvents = 'none';
      this.swipeCanvas.style.opacity = '0';
    }

    // 이동 거리 계산 (속도에 비례, 화면 밖으로 충분히 멀리)
    const force = Math.min(Math.max(speed, 0.5), 5);
    const translateX = deltaX * force * 1.5;
    const translateY = -window.innerHeight * 0.8; // 높이로는 무조건 화면 최상단 밖으로 나감

    // 회전 각도 (스핀 효과)
    const rotation = (deltaX / Math.abs(deltaX || 1)) * 720; // 2바퀴 회전

    // 다음 프레임에서 애니메이션 시작 (transform 충돌 방지)
    requestAnimationFrame(() => {
      this.soccerBall!.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      this.soccerBall!.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.3) rotate(${rotation}deg)`;

      // 언덕 배경을 아래로 내리는 애니메이션 (CSS custom property 사용)
      this.container.style.setProperty('--hill-offset', '200px');

      // 타이틀을 위로 올리면서 페이드아웃
      if (this.titleSection) {
        this.titleSection.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out';
        this.titleSection.style.transform = 'translateY(-150px)';
        this.titleSection.style.opacity = '0';
      }
    });

    // 0.5초 후 화면 전체 페이드아웃 시작
    setTimeout(() => {
      this.container.style.transition = 'opacity 0.6s ease-out';
      this.container.style.opacity = '0';

      // 페이드아웃 완료 후 게임 진입
      setTimeout(() => {
        this.checkAndEnterGame();
      }, 600);
    }, 500);
  }

  /**
   * 로딩 완료 및 슛 완료 시 게임 진입
   */
  private checkAndEnterGame() {
    if (this.isReadyToEnter && this.isLoadingComplete) {
      this.hide();
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

    if (percent >= 100 && !this.isLoadingComplete) {
      this.isLoadingComplete = true;
      this.transitionToStage2();
    }
  }

  /**
   * 1단계 → 2단계 전환 (프로그레스 바 숨기고 축구공 표시)
   */
  private transitionToStage2() {
    // BG 음악 시작
    this.onLoadingComplete?.();

    // 스테이지 1 컨테이너를 페이드아웃
    if (this.stage1Container) {
        this.stage1Container.style.opacity = '0';
    }

    // 0.8초 후 축구공을 페이드인
    setTimeout(() => {
      if (this.soccerBallContainer) {
        this.soccerBallContainer.style.opacity = '1';
      }

      // 게임 진입 체크
      this.checkAndEnterGame();
    }, 800);
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
    // SwipeTracker 정리
    if (this.swipeTracker) {
      this.swipeTracker.destroy();
      this.swipeTracker = null;
    }

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