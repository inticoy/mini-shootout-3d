/**
 * Settings - 테마 및 설정 UI
 *
 * 왼쪽 상단 햄버거 버튼 + 설정 모달
 * Tailwind CSS 기반
 */
export interface SettingsCallbacks {
  onToggleDebug?: () => void;
  onSetMusicEnabled?: (enabled: boolean) => void;
  onSetSfxEnabled?: (enabled: boolean) => void;
  onSetMasterVolume?: (volume: number) => void;
  onNextTheme?: () => void;
}

const LS_KEYS = {
  musicEnabled: 'snapshoot.audio.musicEnabled',
  sfxEnabled: 'snapshoot.audio.sfxEnabled',
  masterVolume: 'snapshoot.audio.masterVolume'
} as const;

export class Settings {
  private pauseButton: HTMLButtonElement;
  private settingsButton: HTMLButtonElement;
  private buttonsContainer: HTMLDivElement;
  private modalOverlay: HTMLDivElement;
  private pauseModalOverlay: HTMLDivElement;
  private callbacks: SettingsCallbacks;

  constructor(container: HTMLElement, callbacks: SettingsCallbacks = {}) {
    this.callbacks = callbacks;

    // 버튼 컨테이너 생성
    this.buttonsContainer = this.createButtonsContainer();

    // 일시정지 버튼 생성
    this.pauseButton = this.createPauseButton();

    // 설정 버튼 생성
    this.settingsButton = this.createSettingsButton();

    // 설정 모달 생성
    this.modalOverlay = this.createModal();

    // 일시정지 모달 생성
    this.pauseModalOverlay = this.createPauseModal();

    this.buttonsContainer.appendChild(this.pauseButton);
    this.buttonsContainer.appendChild(this.settingsButton);
    container.appendChild(this.buttonsContainer);
    container.appendChild(this.modalOverlay);
    container.appendChild(this.pauseModalOverlay);

    // 이벤트 리스너 설정
    this.setupEventListeners();
  }

  /**
   * 버튼 컨테이너 생성 (왼쪽 하단)
   */
  private createButtonsContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = `
      absolute bottom-4 left-4
      flex flex-row gap-2
      pointer-events-auto
    `.trim().replace(/\s+/g, ' ');

    // iOS safe area 대응
    container.style.bottom = `max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))`;
    container.style.left = `max(1rem, calc(env(safe-area-inset-left, 0px) + 1rem))`;

    return container;
  }

  /**
   * 일시정지 버튼 생성 (Phosphor Icons - Pause filled)
   */
  private createPauseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'pause-button';
    button.title = '일시정지';
    button.className = `
      w-12 h-12
      flex items-center justify-center
      rounded-xl
      border border-[#3C4C55]
      bg-[#3C4C55]/90
      shadow-sm
      transition-all duration-200
      hover:bg-[#4a5c66]/90
      hover:shadow-md
      active:bg-[#344250]/90
      active:shadow-sm
    `.trim().replace(/\s+/g, ' ');

    // Phosphor Icons - Pause filled
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-6 h-6 fill-white transition-all">
        <path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"/>
      </svg>
    `;

    return button;
  }

  /**
   * 설정 버튼 생성 (Phosphor Icons - GearSix filled)
   */
  private createSettingsButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'settings-button';
    button.title = '설정';
    button.className = `
      w-12 h-12
      flex items-center justify-center
      rounded-xl
      border border-[#3C4C55]
      bg-[#3C4C55]/90
      shadow-sm
      transition-all duration-200
      hover:bg-[#4a5c66]/90
      hover:shadow-md
      active:bg-[#344250]/90
      active:shadow-sm
    `.trim().replace(/\s+/g, ' ');

    // Phosphor Icons - GearSix filled
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-6 h-6 fill-white transition-all">
        <path d="M237.94,107.21a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A111.92,111.92,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.63a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"/>
      </svg>
    `;

    return button;
  }

  /**
   * 설정 모달 생성
   */
  private createModal(): HTMLDivElement {
    // 저장된 설정 불러오기 (기본값: music/sfx ON, master 1.0)
    const savedMusicEnabled = (() => {
      const v = localStorage.getItem(LS_KEYS.musicEnabled);
      return v === null ? true : v === 'true';
    })();
    const savedSfxEnabled = (() => {
      const v = localStorage.getItem(LS_KEYS.sfxEnabled);
      return v === null ? true : v === 'true';
    })();
    const savedMasterVolume = (() => {
      const v = localStorage.getItem(LS_KEYS.masterVolume);
      const num = v === null ? 0.5 : Number(v);
      return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 1;
    })();

    const overlay = document.createElement('div');
    overlay.id = 'settings-modal';
    overlay.className = `
      fixed inset-0
      flex items-center justify-center
      bg-black/70 backdrop-blur-sm
      opacity-0 pointer-events-none
      transition-opacity duration-300
      z-[1000]
      p-8
      landscape-xs:p-4
    `.trim().replace(/\s+/g, ' ');

    // 안전 영역 패딩 적용 (iOS)
    overlay.style.paddingTop = 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))';
    overlay.style.paddingBottom = 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))';
    overlay.style.paddingLeft = 'max(1rem, calc(env(safe-area-inset-left, 0px) + 0.5rem))';
    overlay.style.paddingRight = 'max(1rem, calc(env(safe-area-inset-right, 0px) + 0.5rem))';

    // 모달 콘텐츠 (고정)
    const content = document.createElement('div');
    content.className = `
      w-[90%] max-w-[500px]
      max-h-[calc(100vh-4rem)]
      rounded-3xl
      border-2 border-[#3C4C55]/50
      backdrop-blur-sm
      transition-all duration-300
      scale-90 translate-y-8
      flex flex-col
      overflow-hidden
      landscape-xs:max-h-[calc(100vh-2rem)]
      glass-modal
    `.trim().replace(/\s+/g, ' ');

    // 동적 높이 보정: 100dvh 사용 가능 시 우선 적용, 아니면 innerHeight 기반
    const applyContentSizing = () => {
      try {
        const dvhSupported = CSS && (CSS as any).supports && (CSS as any).supports('height: 100dvh');
        if (dvhSupported) {
          content.style.maxHeight = 'min(calc(100dvh - 2rem), 700px)';
        } else {
          const maxPx = Math.max(320, Math.min(window.innerHeight - 32, 700));
          content.style.maxHeight = `${maxPx}px`;
        }
      } catch {
        const maxPx = Math.max(320, Math.min(window.innerHeight - 32, 700));
        content.style.maxHeight = `${maxPx}px`;
      }
    };
    applyContentSizing();

    // 헤더 (고정 - 스크롤 안됨)
    const header = document.createElement('div');
    header.className = `
      flex justify-between items-center
      p-10 pb-6
      flex-shrink-0
      landscape-xs:p-5 landscape-xs:pb-3
    `.trim().replace(/\s+/g, ' ');

    const title = document.createElement('div');
    title.className = `
      font-russo text-white tracking-wider
    `.trim().replace(/\s+/g, ' ');
    // 가변 폰트 크기 (작은 화면에서 축소)
    title.style.fontSize = 'clamp(18px, 3.2vw, 28px)';
    title.textContent = 'SETTINGS';

    const closeButton = document.createElement('button');
    closeButton.id = 'close-modal';
    closeButton.className = `
      w-9 h-9
      flex items-center justify-center
      rounded-lg
      bg-white/5 border border-white/10
      text-white/60 text-xl
      transition-all duration-200
      hover:bg-white/10 hover:text-white hover:border-white/20
      active:scale-95
    `.trim().replace(/\s+/g, ' ');
    closeButton.textContent = '✕';

    header.appendChild(title);
    header.appendChild(closeButton);

    // 스크롤 가능한 컨텐츠 컨테이너
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'settings-scroll-container';
    scrollContainer.className = `
      flex-1
      overflow-y-auto
      px-10 pb-10
      landscape-xs:px-5 landscape-xs:pb-5
    `.trim().replace(/\s+/g, ' ');

    // 스크롤 컨테이너 높이 보정 (콘텐츠 내에서 스크롤)
    const applyScrollSizing = () => {
      try {
        const headerRect = header.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const available = Math.max(120, contentRect.height - headerRect.height);
        scrollContainer.style.maxHeight = `${available}px`;
      } catch {}
    };

    // 사운드 섹션 - 배경음악 (Toggle)
    const musicSection = this.createToggleSection('MUSIC', 'music-toggle', savedMusicEnabled);

    // 사운드 섹션 - 효과음 (Toggle)
    const sfxSection = this.createToggleSection('SFX', 'sfx-toggle', savedSfxEnabled);

    // 마스터 볼륨 섹션
    const masterVolumeSection = this.createMasterVolumeSection(savedMasterVolume);

    // 디버그 섹션 (개발자 전용)
    const debugSection = this.createDebugSection();

    scrollContainer.appendChild(musicSection);
    scrollContainer.appendChild(sfxSection);
    scrollContainer.appendChild(masterVolumeSection);
    scrollContainer.appendChild(debugSection);

    content.appendChild(header);
    content.appendChild(scrollContainer);

    overlay.appendChild(content);

    // 리사이즈 대응
    const handleResize = () => {
      applyContentSizing();
      applyScrollSizing();
    };
    window.addEventListener('resize', handleResize);
    // destroy 시 정리되도록 참조 저장
    (overlay as any).__onResize = handleResize;

    return overlay;
  }

  /**
   * 일시정지 모달 생성
   */
  private createPauseModal(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'pause-modal';
    overlay.className = `
      fixed inset-0
      flex items-center justify-center
      bg-black/70 backdrop-blur-sm
      opacity-0 pointer-events-none
      transition-opacity duration-300
      z-[1000]
      p-8
      landscape-xs:p-4
    `.trim().replace(/\s+/g, ' ');

    // 안전 영역 패딩 적용 (iOS)
    overlay.style.paddingTop = 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))';
    overlay.style.paddingBottom = 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))';
    overlay.style.paddingLeft = 'max(1rem, calc(env(safe-area-inset-left, 0px) + 0.5rem))';
    overlay.style.paddingRight = 'max(1rem, calc(env(safe-area-inset-right, 0px) + 0.5rem))';

    // 모달 콘텐츠
    const content = document.createElement('div');
    content.className = `
      w-[90%] max-w-[400px]
      rounded-3xl
      border-2 border-[#3C4C55]/50
      backdrop-blur-sm
      transition-all duration-300
      scale-90 translate-y-8
      flex flex-col
      p-8
      gap-4
      landscape-xs:p-6 landscape-xs:gap-3
      glass-modal
    `.trim().replace(/\s+/g, ' ');

    // 헤더
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';

    const title = document.createElement('div');
    title.className = 'font-russo text-white tracking-wider';
    title.style.fontSize = 'clamp(18px, 3.2vw, 24px)';
    title.textContent = 'PAUSED';

    const closeButton = document.createElement('button');
    closeButton.id = 'close-pause-modal';
    closeButton.className = `
      w-9 h-9
      flex items-center justify-center
      rounded-lg
      bg-white/5 border border-white/10
      text-white/60 text-xl
      transition-all duration-200
      hover:bg-white/10 hover:text-white hover:border-white/20
      active:scale-95
    `.trim().replace(/\s+/g, ' ');
    closeButton.textContent = '✕';

    header.appendChild(title);
    header.appendChild(closeButton);

    // 버튼들
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'flex flex-col gap-3 landscape-xs:gap-2';

    // 재시작 버튼 (ArrowClockwise filled)
    const restartButton = document.createElement('button');
    restartButton.id = 'pause-restart-btn';
    restartButton.className = `
      flex items-center gap-3
      p-4 rounded-xl
      bg-[#3C4C55]/90 border border-[#3C4C55]
      shadow-sm
      text-white font-medium
      transition-all duration-200
      hover:bg-[#4a5c66]/90 hover:shadow-md
      active:bg-[#344250]/90
      landscape-xs:p-3 landscape-xs:gap-2
    `.trim().replace(/\s+/g, ' ');
    restartButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-6 h-6 fill-white flex-shrink-0">
        <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z"/>
      </svg>
      <span>재시작</span>
    `;

    // 랭킹보기 버튼 (Trophy filled)
    const rankingButton = document.createElement('button');
    rankingButton.id = 'pause-ranking-btn';
    rankingButton.className = restartButton.className;
    rankingButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-6 h-6 fill-white flex-shrink-0">
        <path d="M232,64H208V56a16,16,0,0,0-16-16H64A16,16,0,0,0,48,56v8H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120a24,24,0,0,1-24-24V80H48v32q0,4,.39,8Zm144-8a64,64,0,0,1-128,0V56H192Zm40-16a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z"/>
      </svg>
      <span>랭킹보기</span>
    `;

    // 공유하기 버튼 (ShareNetwork filled)
    const shareButton = document.createElement('button');
    shareButton.id = 'pause-share-btn';
    shareButton.className = restartButton.className;
    shareButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-6 h-6 fill-white flex-shrink-0">
        <path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z"/>
      </svg>
      <span>공유하기</span>
    `;

    buttonsContainer.appendChild(restartButton);
    buttonsContainer.appendChild(rankingButton);
    buttonsContainer.appendChild(shareButton);

    content.appendChild(header);
    content.appendChild(buttonsContainer);

    overlay.appendChild(content);

    return overlay;
  }

  /**
   * 디버그 섹션 생성 (버튼 형태)
   */
  private createDebugSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = `
      mb-6
      landscape-xs:mb-3
    `.trim().replace(/\s+/g, ' ');

    const labelEl = document.createElement('div');
    labelEl.className = `
      text-sm text-white/70 mb-3 tracking-wider
      landscape-xs:text-xs landscape-xs:mb-2
    `.trim().replace(/\s+/g, ' ');
    labelEl.textContent = 'DEBUG';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'flex flex-col gap-2';

    // Toggle Debug Mode 버튼
    const debugToggleBtn = document.createElement('button');
    debugToggleBtn.id = 'debug-toggle-btn';
    debugToggleBtn.className = `
      p-3
      rounded-lg
      border border-[#3C4C55]
      bg-[#3C4C55]/90
      shadow-sm
      text-left text-sm text-white/80
      cursor-pointer
      transition-all duration-200
      hover:bg-[#4a5c66]/90 hover:shadow-md
      active:bg-[#344250]/90
      landscape-xs:p-2 landscape-xs:text-xs
    `.trim().replace(/\s+/g, ' ');
    debugToggleBtn.textContent = 'Toggle Debug Mode';

    buttonsContainer.appendChild(debugToggleBtn);

    // Next Theme 버튼 (개발자 전용)
    const nextThemeBtn = document.createElement('button');
    nextThemeBtn.id = 'next-theme-btn';
    nextThemeBtn.className = debugToggleBtn.className;
    nextThemeBtn.textContent = 'Next Ball Theme';
    buttonsContainer.appendChild(nextThemeBtn);

    section.appendChild(labelEl);
    section.appendChild(buttonsContainer);

    return section;
  }

  /**
   * Toggle 스위치 섹션 생성
   */
  private createToggleSection(label: string, id: string, initialValue: boolean): HTMLDivElement {
    const section = document.createElement('div');
    section.className = `
      mb-6
      landscape-xs:mb-3
    `.trim().replace(/\s+/g, ' ');

    const container = document.createElement('div');
    container.className = 'flex items-center justify-between';

    const labelEl = document.createElement('div');
    labelEl.className = `
      text-sm text-white/80 tracking-wider
      landscape-xs:text-xs
    `.trim().replace(/\s+/g, ' ');
    labelEl.textContent = label;

    // Toggle 스위치
    const toggleWrapper = document.createElement('label');
    toggleWrapper.className = 'relative inline-block w-12 h-6 cursor-pointer';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = id;
    toggleInput.checked = initialValue;
    toggleInput.className = 'sr-only peer';

    const toggleBg = document.createElement('span');
    toggleBg.className = `
      absolute inset-0 rounded-full
      bg-white/20
      transition-all duration-200
      peer-checked:bg-[#3C4C55]
      peer-focus:ring-2 peer-focus:ring-[#3C4C55]/50
    `.trim().replace(/\s+/g, ' ');

    const toggleKnob = document.createElement('span');
    toggleKnob.className = `
      absolute left-1 top-1 w-4 h-4 rounded-full
      bg-white
      transition-transform duration-200
      peer-checked:translate-x-6
      pointer-events-none
    `.trim().replace(/\s+/g, ' ');

    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(toggleBg);
    toggleWrapper.appendChild(toggleKnob);

    container.appendChild(labelEl);
    container.appendChild(toggleWrapper);

    section.appendChild(container);

    return section;
  }

  /**
   * 마스터 볼륨 섹션 (range input)
   */
  private createMasterVolumeSection(initialVolume: number): HTMLDivElement {
    const section = document.createElement('div');
    section.className = `
      mb-6
      landscape-xs:mb-3
    `.trim().replace(/\s+/g, ' ');

    // 라벨과 값을 같은 줄에 표시
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-3';

    const labelEl = document.createElement('div');
    labelEl.className = `
      text-sm text-white/80 tracking-wider
      landscape-xs:text-xs
    `.trim().replace(/\s+/g, ' ');
    labelEl.textContent = 'MASTER VOLUME';

    const valueLabel = document.createElement('div');
    valueLabel.id = 'master-volume-label';
    valueLabel.className = 'text-white/80 text-sm font-medium';
    valueLabel.textContent = `${Math.round(initialVolume * 100)}%`;

    header.appendChild(labelEl);
    header.appendChild(valueLabel);

    // 슬라이더
    const input = document.createElement('input');
    input.type = 'range';
    input.id = 'master-volume-range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(initialVolume * 100));
    input.className = `
      w-full h-2 rounded-full appearance-none cursor-pointer
      bg-white/10
      volume-slider
    `.trim().replace(/\s+/g, ' ');

    section.appendChild(header);
    section.appendChild(input);

    return section;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    const closeButton = document.getElementById('close-modal');
    const closePauseButton = document.getElementById('close-pause-modal');

    // 일시정지 버튼으로 일시정지 모달 열기
    this.pauseButton.addEventListener('click', () => this.openPauseModal());

    // 설정 버튼으로 설정 모달 열기
    this.settingsButton.addEventListener('click', () => this.openModal());

    // 설정 모달 닫기
    closeButton?.addEventListener('click', () => this.closeModal());

    // 일시정지 모달 닫기
    closePauseButton?.addEventListener('click', () => this.closePauseModal());

    // 설정 모달 - 오버레이 클릭으로 닫기
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // 일시정지 모달 - 오버레이 클릭으로 닫기
    this.pauseModalOverlay.addEventListener('click', (e) => {
      if (e.target === this.pauseModalOverlay) {
        this.closePauseModal();
      }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // 일시정지 모달이 열려있으면 닫기
        if (!this.pauseModalOverlay.classList.contains('pointer-events-none')) {
          this.closePauseModal();
        }
        // 설정 모달이 열려있으면 닫기
        else if (!this.modalOverlay.classList.contains('pointer-events-none')) {
          this.closeModal();
        }
      }
    });

    // 일시정지 모달 버튼 이벤트
    const restartBtn = document.getElementById('pause-restart-btn');
    const rankingBtn = document.getElementById('pause-ranking-btn');
    const shareBtn = document.getElementById('pause-share-btn');

    restartBtn?.addEventListener('click', () => {
      console.log('재시작 버튼 클릭');
      this.closePauseModal();
      // TODO: 게임 재시작 로직 구현
    });

    rankingBtn?.addEventListener('click', () => {
      console.log('랭킹보기 버튼 클릭');
      // TODO: 랭킹 화면 표시 로직 구현
    });

    shareBtn?.addEventListener('click', () => {
      console.log('공유하기 버튼 클릭');
      // TODO: 공유 기능 구현
    });

    // Toggle 스위치 이벤트
    const musicToggle = document.getElementById('music-toggle') as HTMLInputElement | null;
    const sfxToggle = document.getElementById('sfx-toggle') as HTMLInputElement | null;

    musicToggle?.addEventListener('change', () => {
      const enabled = musicToggle.checked;
      this.callbacks.onSetMusicEnabled?.(enabled);
      localStorage.setItem(LS_KEYS.musicEnabled, String(enabled));
    });

    sfxToggle?.addEventListener('change', () => {
      const enabled = sfxToggle.checked;
      this.callbacks.onSetSfxEnabled?.(enabled);
      localStorage.setItem(LS_KEYS.sfxEnabled, String(enabled));
    });

    // 디버그 버튼 이벤트
    const debugToggleBtn = document.getElementById('debug-toggle-btn');
    const nextThemeBtn = document.getElementById('next-theme-btn');

    debugToggleBtn?.addEventListener('click', () => {
      this.callbacks.onToggleDebug?.();
    });

    // 공 테마 전환 버튼
    nextThemeBtn?.addEventListener('click', () => {
      this.callbacks.onNextTheme?.();
    });

    // 마스터 볼륨 슬라이더 이벤트
    const masterRange = document.getElementById('master-volume-range') as HTMLInputElement | null;
    const masterLabel = document.getElementById('master-volume-label');
    masterRange?.addEventListener('input', () => {
      const val = Math.max(0, Math.min(100, Number(masterRange.value)));
      if (masterLabel) masterLabel.textContent = `${val}%`;
      this.callbacks.onSetMasterVolume?.(val / 100);
      localStorage.setItem(LS_KEYS.masterVolume, String(val / 100));
    });
  }

  /**
   * 모달 열기
   */
  private openModal(): void {
    this.modalOverlay.classList.remove('opacity-0', 'pointer-events-none');
    this.modalOverlay.classList.add('opacity-100', 'pointer-events-auto');

    // 모달 콘텐츠 애니메이션
    const content = this.modalOverlay.querySelector('.glass-modal');
    if (content) {
      content.classList.remove('scale-90', 'translate-y-8');
      content.classList.add('scale-100', 'translate-y-0');
    }

    // 배경 스크롤 잠금 (iOS 포함)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  /**
   * 모달 닫기
   */
  private closeModal(): void {
    this.modalOverlay.classList.add('opacity-0', 'pointer-events-none');
    this.modalOverlay.classList.remove('opacity-100', 'pointer-events-auto');

    // 모달 콘텐츠 애니메이션
    const content = this.modalOverlay.querySelector('.glass-modal');
    if (content) {
      content.classList.add('scale-90', 'translate-y-8');
      content.classList.remove('scale-100', 'translate-y-0');
    }

    // 배경 스크롤 잠금 해제
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  /**
   * 일시정지 모달 열기
   */
  private openPauseModal(): void {
    this.pauseModalOverlay.classList.remove('opacity-0', 'pointer-events-none');
    this.pauseModalOverlay.classList.add('opacity-100', 'pointer-events-auto');

    // 모달 콘텐츠 애니메이션
    const content = this.pauseModalOverlay.querySelector('.glass-modal');
    if (content) {
      content.classList.remove('scale-90', 'translate-y-8');
      content.classList.add('scale-100', 'translate-y-0');
    }

    // 배경 스크롤 잠금 (iOS 포함)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  /**
   * 일시정지 모달 닫기
   */
  private closePauseModal(): void {
    this.pauseModalOverlay.classList.add('opacity-0', 'pointer-events-none');
    this.pauseModalOverlay.classList.remove('opacity-100', 'pointer-events-auto');

    // 모달 콘텐츠 애니메이션
    const content = this.pauseModalOverlay.querySelector('.glass-modal');
    if (content) {
      content.classList.add('scale-90', 'translate-y-8');
      content.classList.remove('scale-100', 'translate-y-0');
    }

    // 배경 스크롤 잠금 해제
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  /**
   * 정리
   */
  destroy(): void {
    this.buttonsContainer.remove();
    // 리스너 정리
    const onResize = (this.modalOverlay as any).__onResize as (() => void) | undefined;
    if (onResize) {
      window.removeEventListener('resize', onResize);
    }
    this.modalOverlay.remove();
  }
}
