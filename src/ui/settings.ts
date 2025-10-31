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
  private hamburgerButton: HTMLButtonElement;
  private modalOverlay: HTMLDivElement;
  private callbacks: SettingsCallbacks;

  constructor(container: HTMLElement, callbacks: SettingsCallbacks = {}) {
    this.callbacks = callbacks;

    // 햄버거 버튼 생성
    this.hamburgerButton = this.createHamburgerButton();

    // 모달 생성
    this.modalOverlay = this.createModal();

    container.appendChild(this.hamburgerButton);
    container.appendChild(this.modalOverlay);

    // 이벤트 리스너 설정
    this.setupEventListeners();
  }

  /**
   * 햄버거 버튼 생성 (왼쪽 상단)
   */
  private createHamburgerButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'hamburger-button';
    button.title = '메뉴';
    button.className = `
      absolute top-5 left-5
      w-12 h-12
      flex items-center justify-center
      rounded-xl
      border-[1.5px] border-white/30
      transition-all duration-200
      glass-button
      hover:border-yellow-500/60
      pointer-events-auto
    `.trim().replace(/\s+/g, ' ');

    // iOS 노치/안전 영역을 고려한 위치 보정
    try {
      const safeTop = (Number(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')) || 0);
      // CSS var가 없으면 env() 사용 - 직접 style에 설정
      (button.style as CSSStyleDeclaration).top = `max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))`;
      (button.style as CSSStyleDeclaration).left = `max(1.25rem, calc(env(safe-area-inset-left, 0px) + 0.75rem))`;
    } catch {}

    // Hamburger icon (3 lines)
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white/80 transition-all">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
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
      border-2 border-yellow-500/30
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
    title.innerHTML = '⚙️ SETTINGS';

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

    // 사운드 섹션 - 배경음악
    const musicSection = this.createSettingsSection(
      '🎵 MUSIC / 배경음악',
      [
        { id: 'music-on', icon: '🎵', label: 'ON', active: savedMusicEnabled },
        { id: 'music-off', icon: '🚫', label: 'OFF', active: !savedMusicEnabled }
      ],
      2
    );

    // 사운드 섹션 - 효과음
    const sfxSection = this.createSettingsSection(
      '🔔 SFX / 효과음',
      [
        { id: 'sfx-on', icon: '🔔', label: 'ON', active: savedSfxEnabled },
        { id: 'sfx-off', icon: '🔕', label: 'OFF', active: !savedSfxEnabled }
      ],
      2
    );

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
    labelEl.textContent = '🐛 DEBUG / 디버그 (개발자 전용)';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'flex flex-col gap-2';

    // Toggle Debug Mode 버튼
    const debugToggleBtn = document.createElement('button');
    debugToggleBtn.id = 'debug-toggle-btn';
    debugToggleBtn.className = `
      p-3
      rounded-lg
      border border-white/10
      bg-white/[0.03]
      text-left text-sm text-white/80
      cursor-pointer
      transition-all duration-200
      hover:bg-white/[0.06] hover:border-cyan-500/30
      landscape-xs:p-2 landscape-xs:text-xs
    `.trim().replace(/\s+/g, ' ');
    debugToggleBtn.textContent = '🔧 Toggle Debug Mode';

    buttonsContainer.appendChild(debugToggleBtn);

    // Next Theme 버튼 (개발자 전용)
    const nextThemeBtn = document.createElement('button');
    nextThemeBtn.id = 'next-theme-btn';
    nextThemeBtn.className = debugToggleBtn.className;
    nextThemeBtn.textContent = '🎨 Next Ball Theme';
    buttonsContainer.appendChild(nextThemeBtn);

    section.appendChild(labelEl);
    section.appendChild(buttonsContainer);

    return section;
  }

  /**
   * 설정 섹션 생성 헬퍼
   */
  private createSettingsSection(
    label: string,
    options: Array<{ id: string; icon: string; label: string; active: boolean }>,
    columns: number
  ): HTMLDivElement {
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
    labelEl.textContent = label;

    const optionsGrid = document.createElement('div');
    optionsGrid.className = `
      grid gap-3
      ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}
    `.trim().replace(/\s+/g, ' ');

    options.forEach((option) => {
      const optionEl = document.createElement('div');
      optionEl.dataset.option = option.id;
      optionEl.className = `
        p-4
        rounded-xl
        border border-white/10
        bg-white/[0.03]
        text-center text-sm text-white/60
        cursor-pointer
        transition-all duration-200
        ${option.active ? 'bg-yellow-500/10 border-yellow-500/60 text-yellow-500' : ''}
        hover:bg-white/[0.06] hover:border-yellow-500/30
        landscape-xs:p-2 landscape-xs:text-xs landscape-xs:rounded-lg
      `.trim().replace(/\s+/g, ' ');

      const iconEl = document.createElement('div');
      iconEl.className = `
        text-3xl mb-1.5
        landscape-xs:text-xl landscape-xs:mb-0.5
      `.trim().replace(/\s+/g, ' ');
      iconEl.textContent = option.icon;

      const labelEl = document.createElement('div');
      labelEl.textContent = option.label;

      optionEl.appendChild(iconEl);
      optionEl.appendChild(labelEl);

      optionsGrid.appendChild(optionEl);
    });

    section.appendChild(labelEl);
    section.appendChild(optionsGrid);

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

    const labelEl = document.createElement('div');
    labelEl.className = `
      text-sm text-white/70 mb-3 tracking-wider
      landscape-xs:text-xs landscape-xs:mb-2
    `.trim().replace(/\s+/g, ' ');
    labelEl.textContent = '🔊 MASTER VOLUME / 전체 볼륨';

    const container = document.createElement('div');
    container.className = 'flex items-center gap-3';

    const input = document.createElement('input');
    input.type = 'range';
    input.id = 'master-volume-range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(initialVolume * 100));
    input.className = `
      w-full h-2 rounded-lg appearance-none cursor-pointer
      bg-white/10
    `.trim().replace(/\s+/g, ' ');

    const valueLabel = document.createElement('div');
    valueLabel.id = 'master-volume-label';
    valueLabel.className = 'text-white/80 text-sm w-12 text-right';
    valueLabel.textContent = `${Math.round(initialVolume * 100)}%`;

    container.appendChild(input);
    container.appendChild(valueLabel);

    section.appendChild(labelEl);
    section.appendChild(container);

    return section;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    const closeButton = document.getElementById('close-modal');

    // 햄버거 버튼으로 모달 열기
    this.hamburgerButton.addEventListener('click', () => this.openModal());

    // 모달 닫기
    closeButton?.addEventListener('click', () => this.closeModal());

    // 오버레이 클릭으로 닫기
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // 옵션 선택
    this.modalOverlay.querySelectorAll('[data-option]').forEach((option) => {
      option.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const parent = target.parentElement;

        if (!parent) return;

        // 같은 그룹 내 모든 옵션의 active 클래스 제거
        parent.querySelectorAll('[data-option]').forEach((opt) => {
          opt.classList.remove('bg-yellow-500/10', 'border-yellow-500/60', 'text-yellow-500');
          opt.classList.add('border-white/10', 'text-white/60');
        });

        // 클릭된 옵션에 active 클래스 추가
        target.classList.add('bg-yellow-500/10', 'border-yellow-500/60', 'text-yellow-500');
        target.classList.remove('border-white/10', 'text-white/60');

        // 실제 설정 적용 로직
        const id = target.dataset.option;
        if (!id) return;
        if (id === 'music-on') this.callbacks.onSetMusicEnabled?.(true);
        if (id === 'music-off') this.callbacks.onSetMusicEnabled?.(false);
        if (id === 'sfx-on') this.callbacks.onSetSfxEnabled?.(true);
        if (id === 'sfx-off') this.callbacks.onSetSfxEnabled?.(false);

        // 저장
        if (id === 'music-on') localStorage.setItem(LS_KEYS.musicEnabled, 'true');
        if (id === 'music-off') localStorage.setItem(LS_KEYS.musicEnabled, 'false');
        if (id === 'sfx-on') localStorage.setItem(LS_KEYS.sfxEnabled, 'true');
        if (id === 'sfx-off') localStorage.setItem(LS_KEYS.sfxEnabled, 'false');
      });
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
   * 정리
   */
  destroy(): void {
    this.hamburgerButton.remove();
    // 리스너 정리
    const onResize = (this.modalOverlay as any).__onResize as (() => void) | undefined;
    if (onResize) {
      window.removeEventListener('resize', onResize);
    }
    this.modalOverlay.remove();
  }
}
