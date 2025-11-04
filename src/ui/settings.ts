/**
 * Settings - 테마 및 설정 UI
 *
 * 왼쪽 하단 HUD 버튼 + 일시정지/설정 모달
 */
export interface SettingsCallbacks {
  onToggleDebug?: () => void;
  onSetMusicEnabled?: (enabled: boolean) => void;
  onSetSfxEnabled?: (enabled: boolean) => void;
  onSetMasterVolume?: (volume: number) => void;
  onNextTheme?: () => void;
  onRestart?: () => void;
}

const LS_KEYS = {
  musicEnabled: 'snapshoot.audio.musicEnabled',
  sfxEnabled: 'snapshoot.audio.sfxEnabled',
  masterVolume: 'snapshoot.audio.masterVolume'
} as const;

type AudioSettingsState = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  masterVolume: number;
};

type ToggleSectionResult = {
  element: HTMLDivElement;
  input: HTMLInputElement;
};

type MasterVolumeSectionResult = {
  element: HTMLDivElement;
  range: HTMLInputElement;
  label: HTMLSpanElement;
};

type DebugSectionResult = {
  element: HTMLDivElement;
  debugButton: HTMLButtonElement;
};

export class Settings {
  private pauseButton: HTMLButtonElement;
  private buttonsContainer: HTMLDivElement;
  private pauseModalOverlay: HTMLDivElement;
  private pauseView!: HTMLDivElement;
  private settingsView!: HTMLDivElement;
  private customizeView!: HTMLDivElement;
  private titleEl!: HTMLDivElement;
  private backButton!: HTMLButtonElement;
  private pauseSettingsButton!: HTMLButtonElement;
  private restartButton!: HTMLButtonElement;
  private rankingButton!: HTMLButtonElement;
  private customizeButton!: HTMLButtonElement;
  private continueButton!: HTMLButtonElement;
  private musicToggle!: HTMLInputElement;
  private sfxToggle!: HTMLInputElement;
  private masterVolumeRange!: HTMLInputElement;
  private masterVolumeLabel!: HTMLSpanElement;
  private debugToggleButton!: HTMLButtonElement;
  private nextThemeButton!: HTMLButtonElement;
  private keydownHandler!: (event: KeyboardEvent) => void;
  private audioState: AudioSettingsState;
  private callbacks: SettingsCallbacks;

  constructor(container: HTMLElement, callbacks: SettingsCallbacks = {}) {
    this.callbacks = callbacks;
    this.audioState = this.loadAudioSettingsState();

    this.buttonsContainer = this.createButtonsContainer();
    this.pauseButton = this.createPauseButton();
    this.pauseModalOverlay = this.createPauseModal();

    this.buttonsContainer.appendChild(this.pauseButton);
    container.appendChild(this.buttonsContainer);
    container.appendChild(this.pauseModalOverlay);

    this.setupEventListeners();
  }

  /**
   * 버튼 컨테이너 생성 (왼쪽 하단)
   */
  private createButtonsContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = `
      absolute bottom-4 left-4 z-50
      flex flex-row gap-2
      pointer-events-auto
    `.trim().replace(/\s+/g, ' ');

    container.style.bottom = `max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))`;
    container.style.left = `max(1rem, calc(env(safe-area-inset-left, 0px) + 1rem))`;

    return container;
  }

  /**
   * 일시정지 버튼 (좌측 HUD)
   */
  private createPauseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'pause-button';
    button.title = '일시정지';
    button.className = `
      w-12 h-12
      flex items-center justify-center
      rounded-2xl
      border border-white/10
      bg-[#0000009A]
      shadow-[0_6px_18px_rgba(0,0,0,0.35)]
      transition-all duration-200
      hover:bg-[#000000b0]
      hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)]
      active:bg-[#0000008c]
      active:shadow-[0_4px_12px_rgba(0,0,0,0.35)]
    `.trim().replace(/\s+/g, ' ');

    button.innerHTML = `
      <i class="ph-fill ph-pause text-2xl text-white"></i>
    `;

    return button;
  }

  /**
   * 설정 버튼 (좌측 HUD)
   */
  /**
   * 일시정지/설정 모달 생성
   */
  private createPauseModal(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'pause-modal';
    overlay.className = `
      fixed inset-0
      flex
      bg-black/40 backdrop-blur-[2px] ios-backdrop
      opacity-0 pointer-events-none
      transition-opacity duration-300
      z-[1000]
    `.trim().replace(/\s+/g, ' ');

    const content = document.createElement('div');
    content.className = `
      relative flex h-full w-full flex-col
      bg-black/30
      backdrop-blur-sm ios-backdrop
      text-white
      transition-all duration-300 ease-out
    `.trim().replace(/\s+/g, ' ');
    content.style.paddingTop = 'calc(env(safe-area-inset-top, 0px) + 16px)';
    content.style.paddingRight = 'calc(env(safe-area-inset-right, 0px) + 16px)';
    content.style.paddingBottom = 'calc(env(safe-area-inset-bottom, 0px) + 24px)';
    content.style.paddingLeft = 'calc(env(safe-area-inset-left, 0px) + 16px)';
    content.dataset.modal = 'pause';

    // Title - 상단 18% 위치, 완전 중앙 정렬
    const titleContainer = document.createElement('div');
    titleContainer.className = 'absolute w-full flex items-center justify-center pointer-events-none';
    titleContainer.style.top = '18%';
    titleContainer.style.left = '0';
    titleContainer.style.right = '0';

    const title = document.createElement('div');
    title.className = 'font-russo text-white tracking-tight font-black';
    title.style.fontSize = 'clamp(32px, 6vw, 48px)';
    title.textContent = '일시정지';
    this.titleEl = title;

    titleContainer.appendChild(title);

    // Back button - 설정 화면에서만 표시 (왼쪽 상단)
    const backButton = document.createElement('button');
    backButton.className = `
      hidden
      absolute z-[1001] pointer-events-auto
      flex items-center justify-center
      text-white/90
      transition-all duration-200
      hover:text-white
      active:scale-95
    `.trim().replace(/\s+/g, ' ');
    backButton.style.top = 'calc(env(safe-area-inset-top, 0px) + 16px)';
    backButton.style.left = 'calc(env(safe-area-inset-left, 0px) + 16px)';
    backButton.style.width = '40px';
    backButton.style.height = '40px';
    backButton.type = 'button';
    backButton.innerHTML = '<i class="ph-fill ph-arrow-left text-3xl"></i>';
    this.backButton = backButton;

    // Pause view - 중앙 버튼들 + 왼쪽 하단 설정 버튼
    const pauseView = document.createElement('div');
    pauseView.className = 'h-full flex flex-col items-center justify-center relative';
    this.pauseView = pauseView;

    // 중앙 버튼 컨테이너
    const centerButtons = document.createElement('div');
    centerButtons.className = 'flex flex-col items-center gap-4 w-full max-w-md px-6';

    const restartButton = this.createPauseActionButton(
      'pause-restart-btn',
      `<i class="ph-fill ph-arrow-clockwise text-2xl text-white flex-shrink-0"></i>`,
      '재시작'
    );
    this.restartButton = restartButton;

    const rankingButton = this.createPauseActionButton(
      'pause-ranking-btn',
      `<i class="ph-fill ph-ranking text-2xl text-white flex-shrink-0"></i>`,
      '랭킹보기'
    );
    this.rankingButton = rankingButton;

    const customizeButton = this.createPauseActionButton(
      'pause-customize-btn',
      `<i class="ph-fill ph-palette text-2xl text-white flex-shrink-0"></i>`,
      '커스터마이즈'
    );
    this.customizeButton = customizeButton;

    // 이어하기 버튼 (다른 버튼과 완전히 동일)
    const continueButton = this.createPauseActionButton(
      'pause-continue-btn',
      `<i class="ph-fill ph-play text-2xl text-white flex-shrink-0"></i>`,
      '이어하기'
    );
    this.continueButton = continueButton;

    centerButtons.appendChild(restartButton);
    centerButtons.appendChild(rankingButton);
    centerButtons.appendChild(customizeButton);
    centerButtons.appendChild(continueButton);

    pauseView.appendChild(centerButtons);

    // 왼쪽 하단 설정 버튼 - pauseView 밖에 배치
    const settingsButton = document.createElement('button');
    settingsButton.id = 'pause-settings-btn';
    settingsButton.type = 'button';
    settingsButton.className = `
      absolute
      w-12 h-12
      flex items-center justify-center
      rounded-2xl
      border border-white/10
      bg-[#0000009A]
      shadow-[0_6px_18px_rgba(0,0,0,0.35)]
      transition-all duration-200
      hover:bg-[#000000b0]
      hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)]
      active:bg-[#0000008c]
      active:shadow-[0_4px_12px_rgba(0,0,0,0.35)]
      pointer-events-auto
      z-10
    `.trim().replace(/\s+/g, ' ');
    settingsButton.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 24px)';
    settingsButton.style.left = 'calc(env(safe-area-inset-left, 0px) + 24px)';
    settingsButton.innerHTML = `
      <i class="ph-fill ph-gear text-2xl text-white"></i>
    `;
    this.pauseSettingsButton = settingsButton;

    // Settings view
    const settingsView = this.createSettingsView();
    settingsView.classList.add('hidden');
    this.settingsView = settingsView;

    // Customize view
    const customizeView = this.createCustomizeView();
    customizeView.classList.add('hidden');
    this.customizeView = customizeView;

    content.appendChild(titleContainer);
    content.appendChild(pauseView);
    content.appendChild(settingsView);
    content.appendChild(customizeView);
    content.appendChild(settingsButton);
    content.appendChild(backButton); // 마지막에 추가하여 최상위 레이어에 배치

    overlay.appendChild(content);
    return overlay;
  }

  /**
   * Pause 모달에서 사용하는 버튼 공통 스타일 생성
   */
  private createPauseActionButton(id: string, iconSvg: string, label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.className = `
      w-full flex items-center gap-3
      p-4 rounded-xl
      bg-white/12 border border-white/15
      shadow-[0_8px_20px_rgba(0,0,0,0.2)]
      text-white/90 font-medium
      transition-all duration-200
      hover:bg-white/16 hover:border-white/25 hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]
      active:bg-white/10
      landscape-xs:p-3 landscape-xs:gap-2
    `.trim().replace(/\s+/g, ' ');

    button.innerHTML = `${iconSvg}<span>${label}</span>`;
    return button;
  }

  /**
   * Settings view 생성
   */
  private createSettingsView(): HTMLDivElement {
    const view = document.createElement('div');
    view.className = 'flex h-full flex-col items-center justify-center relative';
    view.dataset.view = 'settings';

    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'settings-scroll-container';
    scrollContainer.className = `
      w-full max-w-md px-6
      flex flex-col gap-6
      overflow-y-auto
    `.trim().replace(/\s+/g, ' ');

    const musicSection = this.createToggleSection('배경음악', this.audioState.musicEnabled);
    this.musicToggle = musicSection.input;

    const sfxSection = this.createToggleSection('효과음', this.audioState.sfxEnabled);
    this.sfxToggle = sfxSection.input;

    const masterSection = this.createMasterVolumeSection(this.audioState.masterVolume);
    this.masterVolumeRange = masterSection.range;
    this.masterVolumeLabel = masterSection.label;

    const debugSection = this.createDebugSection();
    this.debugToggleButton = debugSection.debugButton;

    scrollContainer.appendChild(musicSection.element);
    scrollContainer.appendChild(sfxSection.element);
    scrollContainer.appendChild(masterSection.element);
    scrollContainer.appendChild(debugSection.element);

    view.appendChild(scrollContainer);
    return view;
  }

  /**
   * Customize view 생성
   */
  private createCustomizeView(): HTMLDivElement {
    const view = document.createElement('div');
    view.className = 'flex h-full flex-col items-center justify-center relative';
    view.dataset.view = 'customize';

    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'customize-scroll-container';
    scrollContainer.className = `
      w-full max-w-md px-6
      flex flex-col gap-6
      overflow-y-auto
    `.trim().replace(/\s+/g, ' ');

    // 다음 볼 테마 버튼만 포함
    const nextThemeBtn = document.createElement('button');
    nextThemeBtn.type = 'button';
    nextThemeBtn.className = `
      w-full p-4 rounded-xl
      bg-white/12 border border-white/15
      shadow-[0_8px_20px_rgba(0,0,0,0.2)]
      text-white/90 font-medium text-left
      transition-all duration-200
      hover:bg-white/16 hover:border-white/25 hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]
      active:bg-white/10
    `.trim().replace(/\s+/g, ' ');
    nextThemeBtn.textContent = '다음 볼 테마';
    this.nextThemeButton = nextThemeBtn;

    scrollContainer.appendChild(nextThemeBtn);
    view.appendChild(scrollContainer);
    return view;
  }

  /**
   * Audio 설정 상태 로드
   */
  private loadAudioSettingsState(): AudioSettingsState {
    const musicEnabledStr = localStorage.getItem(LS_KEYS.musicEnabled);
    const sfxEnabledStr = localStorage.getItem(LS_KEYS.sfxEnabled);
    const masterVolumeStr = localStorage.getItem(LS_KEYS.masterVolume);

    return {
      musicEnabled: musicEnabledStr === null ? true : musicEnabledStr === 'true',
      sfxEnabled: sfxEnabledStr === null ? true : sfxEnabledStr === 'true',
      masterVolume: (() => {
        if (masterVolumeStr === null) return 0.5;
        const num = Number(masterVolumeStr);
        return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0.5;
      })()
    };
  }

  /**
   * 모달 뷰 전환
   */
  private switchToView(view: 'pause' | 'settings' | 'customize'): void {
    if (view === 'pause') {
      this.titleEl.textContent = '일시정지';
      this.backButton.classList.add('hidden');
      this.pauseSettingsButton.classList.remove('hidden');
      this.pauseView.classList.remove('hidden');
      this.pauseView.classList.add('flex');
      this.settingsView.classList.add('hidden');
      this.settingsView.classList.remove('flex');
      this.settingsView.classList.remove('flex-col');
      this.customizeView.classList.add('hidden');
      this.customizeView.classList.remove('flex');
      this.customizeView.classList.remove('flex-col');
    } else if (view === 'settings') {
      this.titleEl.textContent = '설정';
      this.backButton.classList.remove('hidden');
      this.pauseSettingsButton.classList.add('hidden');
      this.pauseView.classList.add('hidden');
      this.pauseView.classList.remove('flex');
      this.settingsView.classList.remove('hidden');
      this.settingsView.classList.add('flex');
      this.settingsView.classList.add('flex-col');
      this.customizeView.classList.add('hidden');
      this.customizeView.classList.remove('flex');
      this.customizeView.classList.remove('flex-col');
    } else {
      this.titleEl.textContent = '커스터마이즈';
      this.backButton.classList.remove('hidden');
      this.pauseSettingsButton.classList.add('hidden');
      this.pauseView.classList.add('hidden');
      this.pauseView.classList.remove('flex');
      this.settingsView.classList.add('hidden');
      this.settingsView.classList.remove('flex');
      this.settingsView.classList.remove('flex-col');
      this.customizeView.classList.remove('hidden');
      this.customizeView.classList.add('flex');
      this.customizeView.classList.add('flex-col');
    }
  }

  private openPauseModal(initialView: 'pause' | 'settings' = 'pause'): void {
    this.switchToView(initialView);

    this.pauseModalOverlay.classList.remove('opacity-0', 'pointer-events-none');
    this.pauseModalOverlay.classList.add('opacity-100', 'pointer-events-auto');

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  private closePauseModal(): void {
    this.pauseModalOverlay.classList.add('opacity-0');
    this.pauseModalOverlay.classList.remove('opacity-100');

    // 애니메이션 완료 후 pointer-events 제거 및 오버플로우 복원
    setTimeout(() => {
      this.pauseModalOverlay.classList.add('pointer-events-none');
      this.pauseModalOverlay.classList.remove('pointer-events-auto');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      
      // Pause 뷰로 리셋
      this.switchToView('pause');
    }, 300); // transition duration과 동일
  }

  private isPauseModalHidden(): boolean {
    return this.pauseModalOverlay.classList.contains('pointer-events-none');
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    this.pauseButton.addEventListener('click', () => this.openPauseModal('pause'));
    this.pauseSettingsButton.addEventListener('click', () => this.switchToView('settings'));
    this.backButton.addEventListener('click', () => this.switchToView('pause'));
    this.backButton.addEventListener('touchstart', () => this.switchToView('pause'));

    // pauseView 클릭 시 이어하기 (버튼 외 빈 공간)
    this.pauseView.addEventListener('click', (e) => {
      // pauseView 자체나 centerButtons를 클릭했을 때 (버튼은 제외)
      const target = e.target as HTMLElement;
      if (
        target === this.pauseView ||
        target.classList.contains('flex-col') ||
        target.id === 'pause-view-background'
      ) {
        this.closePauseModal();
      }
    });

    this.restartButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('재시작 버튼 클릭');
      this.closePauseModal();
      this.callbacks.onRestart?.();
    });

    this.rankingButton.addEventListener('click', () => {
      console.log('랭킹보기 버튼 클릭');
      // TODO: 랭킹 화면 표시 로직 구현
    });

    this.customizeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('커스터마이즈 버튼 클릭');
      this.switchToView('customize');
    });

    this.continueButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('이어하기 버튼 클릭');
      this.closePauseModal();
    });

    this.musicToggle.addEventListener('change', () => {
      const enabled = this.musicToggle.checked;
      this.audioState.musicEnabled = enabled;
      this.callbacks.onSetMusicEnabled?.(enabled);
      localStorage.setItem(LS_KEYS.musicEnabled, String(enabled));
    });

    this.sfxToggle.addEventListener('change', () => {
      const enabled = this.sfxToggle.checked;
      this.audioState.sfxEnabled = enabled;
      this.callbacks.onSetSfxEnabled?.(enabled);
      localStorage.setItem(LS_KEYS.sfxEnabled, String(enabled));
    });

    this.masterVolumeRange.addEventListener('input', () => {
      const val = Math.max(0, Math.min(100, Number(this.masterVolumeRange.value)));
      const volume = val / 100;
      this.audioState.masterVolume = volume;
      this.masterVolumeLabel.textContent = `${val}%`;
      this.callbacks.onSetMasterVolume?.(volume);
      localStorage.setItem(LS_KEYS.masterVolume, String(volume));
    });

    this.debugToggleButton.addEventListener('click', () => {
      this.callbacks.onToggleDebug?.();
    });

    this.nextThemeButton.addEventListener('click', () => {
      this.callbacks.onNextTheme?.();
    });

    this.keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !this.isPauseModalHidden()) {
        this.closePauseModal();
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Toggle 섹션 생성
   */
  private createToggleSection(label: string, initialValue: boolean): ToggleSectionResult {
    const section = document.createElement('div');
    section.className = `
      w-full flex items-center justify-between
      p-4
    `.trim().replace(/\s+/g, ' ');

    const labelEl = document.createElement('div');
    labelEl.className = 'text-white/90 font-medium';
    labelEl.textContent = label;

    const toggleWrapper = document.createElement('label');
    toggleWrapper.className = 'relative inline-block w-12 h-6 cursor-pointer';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = initialValue;
    toggleInput.className = 'sr-only peer';

    const toggleBg = document.createElement('span');
    toggleBg.className = `
      absolute inset-0 rounded-full
      bg-white/15
      transition-all duration-200
      peer-checked:bg-white/55
      peer-focus:ring-2 peer-focus:ring-white/30
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

    section.appendChild(labelEl);
    section.appendChild(toggleWrapper);

    return { element: section, input: toggleInput };
  }

  /**
   * 마스터 볼륨 섹션 생성
   */
  private createMasterVolumeSection(initialVolume: number): MasterVolumeSectionResult {
    const section = document.createElement('div');
    section.className = `
      w-full flex flex-col gap-3
      p-4
    `.trim().replace(/\s+/g, ' ');

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between';

    const labelEl = document.createElement('div');
    labelEl.className = 'text-white/90 font-medium';
    labelEl.textContent = '마스터 볼륨';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'text-white/90 font-medium';
    valueLabel.textContent = `${Math.round(initialVolume * 100)}%`;

    header.appendChild(labelEl);
    header.appendChild(valueLabel);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(initialVolume * 100));
    input.className = `
      w-full h-2 rounded-full appearance-none cursor-pointer
      bg-white/10
    `.trim().replace(/\s+/g, ' ');

    // 슬라이더 thumb 스타일 (하얀색)
    input.style.cssText = `
      -webkit-appearance: none;
      appearance: none;
    `;
    const style = document.createElement('style');
    style.textContent = `
      #settings-scroll-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
      }
      #settings-scroll-container input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: none;
      }
    `;
    document.head.appendChild(style);

    section.appendChild(header);
    section.appendChild(input);

    return { element: section, range: input, label: valueLabel };
  }

  /**
   * 디버그 섹션 생성
   */
  private createDebugSection(): DebugSectionResult {
    const section = document.createElement('div');
    section.className = 'w-full flex flex-col gap-3';

    const debugToggleBtn = document.createElement('button');
    debugToggleBtn.type = 'button';
    debugToggleBtn.className = `
      w-full p-4 rounded-xl
      bg-white/12 border border-white/15
      shadow-[0_8px_20px_rgba(0,0,0,0.2)]
      text-white/90 font-medium text-left
      transition-all duration-200
      hover:bg-white/16 hover:border-white/25 hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]
      active:bg-white/10
    `.trim().replace(/\s+/g, ' ');
    debugToggleBtn.textContent = '디버그 모드 전환';

    section.appendChild(debugToggleBtn);

    return {
      element: section,
      debugButton: debugToggleBtn
    };
  }

  /**
   * 정리
   */
  destroy(): void {
    this.buttonsContainer.remove();
    this.pauseModalOverlay.remove();
    document.removeEventListener('keydown', this.keydownHandler);
  }
}
