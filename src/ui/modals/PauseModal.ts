/**
 * PauseModal - 일시정지 모달
 *
 * 기능:
 * - 일시정지 화면 (이어하기, 재시작, 커스터마이즈, 랭킹, 설정 버튼)
 * - 설정 화면 (배경음악, 효과음, 마스터 볼륨, 디버그)
 * - 테마 변경 화면 (볼 테마 선택)
 */

import { BaseModal } from './BaseModal';
import { ViewManager } from '../ViewManager';
import { createCustomizeView } from '../views/CustomizeView';
import { gameStateService } from '../../core/GameStateService';

export interface PauseModalCallbacks {
  onToggleDebug?: () => void;
  onSetMusicEnabled?: (enabled: boolean) => void;
  onSetSfxEnabled?: (enabled: boolean) => void;
  onSetMasterVolume?: (volume: number) => void;
  onNextTheme?: () => void;
  onSelectTheme?: (themeName: string) => void;
  onRestart?: () => void;
  onRanking?: () => void;
}

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

export class PauseModal extends BaseModal {
  private pauseButton: HTMLButtonElement;
  private buttonsContainer: HTMLDivElement;
  private viewManager!: ViewManager;
  private titleEl!: HTMLDivElement;
  private backButton!: HTMLButtonElement;
  private callbacks: PauseModalCallbacks;
  private audioState: AudioSettingsState;

  // UI 요소들
  private pauseView!: HTMLDivElement;
  private settingsView!: HTMLDivElement;
  private customizeView!: HTMLDivElement;
  private musicToggle!: HTMLInputElement;
  private sfxToggle!: HTMLInputElement;
  private masterVolumeRange!: HTMLInputElement;
  private masterVolumeLabel!: HTMLSpanElement;

  constructor(container: HTMLElement, callbacks: PauseModalCallbacks = {}) {
    console.log('🔧 PauseModal 생성자 시작', {
      containerExists: !!container,
      timeStamp: performance.now()
    });

    super({
      closeOnEsc: true,
      closeOnBackdrop: false,
      containerElement: container
    });

    this.callbacks = callbacks;
    this.audioState = this.loadAudioSettingsState();

    // Pause 버튼 생성
    this.buttonsContainer = this.createButtonsContainer();
    this.pauseButton = this.createPauseButton();
    this.buttonsContainer.appendChild(this.pauseButton);
    container.appendChild(this.buttonsContainer);

    // 모달 컨텐츠 생성
    this.createModalContent();
    this.setupPauseButtonListeners();

    console.log('🔧 PauseModal 생성 완료', {
      buttonId: this.pauseButton.id,
      buttonInDom: document.contains(this.pauseButton),
      timeStamp: performance.now()
    });
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
      z-[10]
    `.trim().replace(/\s+/g, ' ');

    container.style.bottom = `max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))`;
    container.style.left = `max(1rem, calc(env(safe-area-inset-left, 0px) + 1rem))`;

    return container;
  }

  /**
   * 일시정지 버튼 생성
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
      transition-all duration-150
      hover:bg-[#000000b0]
      hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)]
      active:bg-[#0000008c]
      active:shadow-[0_2px_8px_rgba(0,0,0,0.35)]
      pointer-events-auto
      cursor-pointer
      z-[10]
    `.trim().replace(/\s+/g, ' ');

    button.style.touchAction = 'manipulation';
    button.innerHTML = `<i class="ph-fill ph-pause text-2xl text-white"></i>`;

    console.log('🔧 Pause 버튼 생성됨', button);
    return button;
  }

  /**
   * 모달 컨텐츠 생성
   */
  private createModalContent(): void {
    // Title Container
    const titleContainer = document.createElement('div');
    titleContainer.className = 'w-full flex items-center justify-center pointer-events-none py-4 pb-8';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'font-russo text-white tracking-tight font-black';
    this.titleEl.style.fontSize = 'clamp(32px, 6vw, 48px)';
    this.titleEl.textContent = '일시정지';
    titleContainer.appendChild(this.titleEl);

    // Content Area
    const contentArea = document.createElement('div');
    contentArea.className = 'flex-auto flex flex-col items-center w-full px-6';
    contentArea.id = 'pause-modal-content';

    // Back Button
    this.backButton = this.createBackButton();

    // Views
    this.pauseView = this.createPauseView();
    this.settingsView = this.createSettingsView();
    this.customizeView = this.createCustomizeView();

    // 초기에는 pause view만 보임
    this.settingsView.classList.add('hidden');
    this.customizeView.classList.add('hidden');

    contentArea.appendChild(this.pauseView);
    contentArea.appendChild(this.settingsView);
    contentArea.appendChild(this.customizeView);

    this.content.appendChild(this.backButton);
    this.content.appendChild(titleContainer);
    this.content.appendChild(contentArea);

    // ViewManager 초기화
    this.viewManager = new ViewManager(this.titleEl, this.backButton);
    this.viewManager.registerView('pause', {
      element: this.pauseView,
      title: '일시정지',
      showBackButton: false
    });
    this.viewManager.registerView('settings', {
      element: this.settingsView,
      title: '설정',
      showBackButton: true
    });
    this.viewManager.registerView('customize', {
      element: this.customizeView,
      title: '테마 변경',
      showBackButton: true
    });

    this.viewManager.setOnBack(() => this.viewManager.switchTo('pause'));
    this.viewManager.switchTo('pause');
  }

  /**
   * Back Button 생성
   */
  private createBackButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `
      hidden
      absolute z-[40] pointer-events-auto
      flex items-center justify-center
      text-white/90
      transition-all duration-150
      hover:text-white
    `.trim().replace(/\s+/g, ' ');
    button.style.top = 'calc(env(safe-area-inset-top, 0px) + 16px)';
    button.style.left = 'calc(env(safe-area-inset-left, 0px) + 16px)';
    button.style.width = '40px';
    button.style.height = '40px';
    button.type = 'button';
    button.innerHTML = '<i class="ph ph-arrow-left text-3xl"></i>';

    this.addPressEffect(button);
    return button;
  }

  /**
   * Pause View 생성
   */
  private createPauseView(): HTMLDivElement {
    const view = document.createElement('div');
    view.className = 'flex-1 flex flex-col items-center justify-between w-full max-w-lg pt-[5vh] pb-[12vh]';

    // 상단 3개 버튼
    const topButtonsWrapper = document.createElement('div');
    topButtonsWrapper.className = 'flex gap-4 w-full justify-center';

    const customizeButton = this.createSquareIconButton(
      'pause-customize-btn',
      `<i class="ph-fill ph-palette text-4xl text-white"></i>`,
      '테마 변경'
    );
    const rankingButton = this.createSquareIconButton(
      'pause-ranking-btn',
      `<i class="ph-fill ph-ranking text-4xl text-white"></i>`,
      '랭킹보기'
    );
    const settingsButton = this.createSquareIconButton(
      'pause-settings-btn',
      `<i class="ph-fill ph-gear text-4xl text-white"></i>`,
      '설정'
    );

    this.addPressEffect(customizeButton);
    this.addPressEffect(rankingButton);
    this.addPressEffect(settingsButton);

    customizeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewManager.switchTo('customize');
    });
    rankingButton.addEventListener('click', () => {
      console.log('랭킹보기 버튼 클릭');
      this.callbacks.onRanking?.();
    });
    settingsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewManager.switchTo('settings');
    });

    topButtonsWrapper.appendChild(customizeButton);
    topButtonsWrapper.appendChild(rankingButton);
    topButtonsWrapper.appendChild(settingsButton);

    // 하단 버튼
    const bottomButtonsWrapper = document.createElement('div');
    bottomButtonsWrapper.className = 'flex items-center justify-center gap-6 w-full';

    const restartButton = this.createCircleButton(
      'pause-restart-btn',
      '<i class="ph-fill ph-arrow-clockwise text-3xl text-white"></i>',
      'w-16 h-16'
    );
    const continueButton = this.createCircleButton(
      'pause-continue-btn',
      '<i class="ph-fill ph-play text-4xl text-white"></i>',
      'w-20 h-20',
      true
    );

    this.addPressEffect(restartButton);
    this.addPressEffect(continueButton);

    restartButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('재시작 버튼 클릭');
      this.close();
      this.callbacks.onRestart?.();
    });
    continueButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('이어하기 버튼 클릭');
      this.close();
    });

    bottomButtonsWrapper.appendChild(restartButton);
    bottomButtonsWrapper.appendChild(continueButton);

    view.appendChild(topButtonsWrapper);
    view.appendChild(bottomButtonsWrapper);

    // 빈 공간 클릭 시 닫기
    view.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === view || target.classList.contains('flex-col')) {
        this.close();
      }
    });

    return view;
  }

  /**
   * Settings View 생성
   */
  private createSettingsView(): HTMLDivElement {
    const view = document.createElement('div');
    view.className = 'w-full max-w-md flex flex-col gap-4 pb-6';

    const musicSection = this.createToggleSection('배경음악', this.audioState.musicEnabled);
    this.musicToggle = musicSection.input;

    const sfxSection = this.createToggleSection('효과음', this.audioState.sfxEnabled);
    this.sfxToggle = sfxSection.input;

    const masterSection = this.createMasterVolumeSection(this.audioState.masterVolume);
    this.masterVolumeRange = masterSection.range;
    this.masterVolumeLabel = masterSection.label;

    // 디버그 버튼
    const debugSection = document.createElement('div');
    debugSection.className = 'w-full py-3';

    const debugToggleBtn = document.createElement('button');
    debugToggleBtn.type = 'button';
    debugToggleBtn.className = `
      w-full px-4 py-3 rounded-xl
      bg-white/12 border border-white/15
      shadow-[0_4px_12px_rgba(0,0,0,0.2)]
      text-white/90 font-medium text-left
      transition-all duration-150
      hover:bg-white/16 hover:border-white/25 hover:shadow-[0_6px_16px_rgba(0,0,0,0.24)]
      active:bg-white/10 active:shadow-[0_1px_4px_rgba(0,0,0,0.15)]
    `.trim().replace(/\s+/g, ' ');
    debugToggleBtn.textContent = '디버그 모드 전환';

    this.addPressEffect(debugToggleBtn);
    debugToggleBtn.addEventListener('click', () => {
      this.callbacks.onToggleDebug?.();
    });

    debugSection.appendChild(debugToggleBtn);

    view.appendChild(musicSection.element);
    view.appendChild(sfxSection.element);
    view.appendChild(masterSection.element);
    view.appendChild(debugSection);

    // 오디오 설정 이벤트 리스너
    this.musicToggle.addEventListener('change', () => {
      const enabled = this.musicToggle.checked;
      this.audioState.musicEnabled = enabled;
      this.callbacks.onSetMusicEnabled?.(enabled);
      gameStateService.setMusicEnabled(enabled);
    });

    this.sfxToggle.addEventListener('change', () => {
      const enabled = this.sfxToggle.checked;
      this.audioState.sfxEnabled = enabled;
      this.callbacks.onSetSfxEnabled?.(enabled);
      gameStateService.setSfxEnabled(enabled);
    });

    this.masterVolumeRange.addEventListener('input', () => {
      const val = Math.max(0, Math.min(100, Number(this.masterVolumeRange.value)));
      const volume = val / 100;
      this.audioState.masterVolume = volume;
      this.masterVolumeLabel.textContent = `${val}%`;
      this.callbacks.onSetMasterVolume?.(volume);
      gameStateService.setMasterVolume(volume);
    });

    return view;
  }

  /**
   * Customize View 생성
   */
  private createCustomizeView(): HTMLDivElement {
    return createCustomizeView({
      onSelectTheme: (themeName: string) => {
        this.callbacks.onSelectTheme?.(themeName);
      },
      onPressEffect: (button: HTMLButtonElement) => {
        this.addPressEffect(button);
      }
    });
  }

  /**
   * Circle Button 생성
   */
  private createCircleButton(id: string, innerHTML: string, sizeClass: string, isLarge: boolean = false): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';

    const baseClass = isLarge
      ? `bg-white/20 border-2 border-white/25 shadow-[0_12px_28px_rgba(0,0,0,0.3)]
         hover:bg-white/25 hover:border-white/35 hover:shadow-[0_16px_32px_rgba(0,0,0,0.35)]
         active:bg-white/15 active:shadow-[0_4px_12px_rgba(0,0,0,0.25)]`
      : `bg-white/12 border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.2)]
         hover:bg-white/16 hover:border-white/25 hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]
         active:bg-white/10 active:shadow-[0_2px_8px_rgba(0,0,0,0.15)]`;

    button.className = `
      ${sizeClass}
      flex items-center justify-center
      rounded-full
      ${baseClass}
      transition-all duration-150
    `.trim().replace(/\s+/g, ' ');

    button.innerHTML = innerHTML;
    return button;
  }

  /**
   * Toggle Section 생성
   */
  private createToggleSection(label: string, initialValue: boolean): ToggleSectionResult {
    const section = document.createElement('div');
    section.className = 'w-full flex items-center justify-between py-3';

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
   * Master Volume Section 생성
   */
  private createMasterVolumeSection(initialVolume: number): MasterVolumeSectionResult {
    const section = document.createElement('div');
    section.className = 'w-full flex flex-col gap-2 py-3';

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
    input.className = 'w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10';

    input.style.cssText = '-webkit-appearance: none; appearance: none;';

    // 슬라이더 스타일
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);

    section.appendChild(header);
    section.appendChild(input);

    return { element: section, range: input, label: valueLabel };
  }

  /**
   * Audio Settings State 로드
   */
  private loadAudioSettingsState(): AudioSettingsState {
    return gameStateService.getAudioSettings();
  }

  /**
   * Pause Button 이벤트 리스너
   */
  private setupPauseButtonListeners(): void {
    this.addPressEffect(this.pauseButton);

    let pointerDownTime = 0;
    let pointerDownTarget: EventTarget | null = null;

    this.pauseButton.addEventListener('pointerdown', (e) => {
      console.log('🟣 Pause 버튼 pointerdown', {
        target: e.target,
        timeStamp: e.timeStamp,
        pointerType: e.pointerType
      });
      pointerDownTime = e.timeStamp;
      pointerDownTarget = e.target;
      e.stopPropagation();
    });

    this.pauseButton.addEventListener('pointerup', (e) => {
      console.log('🟣 Pause 버튼 pointerup', {
        target: e.target,
        timeStamp: e.timeStamp,
        timeDiff: e.timeStamp - pointerDownTime
      });

      if (pointerDownTarget === e.target && (e.timeStamp - pointerDownTime) < 500) {
        console.log('🔵 Pause 버튼 클릭 처리!');
        e.stopPropagation();
        e.preventDefault();
        this.open();
      }

      pointerDownTime = 0;
      pointerDownTarget = null;
    });

    this.pauseButton.addEventListener('click', (e) => {
      console.log('🔵 Pause 버튼 click 이벤트 (fallback)', {
        target: e.target,
        timeStamp: e.timeStamp
      });
    });
  }

  /**
   * 모달 열린 후 처리
   */
  protected onAfterOpen(): void {
    // Pause 뷰로 리셋
    this.viewManager.switchTo('pause');
  }

  /**
   * 모달 닫힌 후 처리
   */
  protected onAfterClose(): void {
    // Pause 뷰로 리셋
    this.viewManager.switchTo('pause');
  }

  /**
   * 정리
   */
  destroy(): void {
    super.destroy();
    this.buttonsContainer.remove();
  }
}
