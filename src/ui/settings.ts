/**
 * Settings - 테마 및 설정 UI
 *
 * 왼쪽 상단 햄버거 버튼 + 설정 모달
 * Tailwind CSS 기반
 */
export interface SettingsCallbacks {
  onToggleDebug?: () => void;
  onNextTheme?: () => void;
}

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
      text-3xl font-russo text-white tracking-wider
      landscape-xs:text-xl
    `.trim().replace(/\s+/g, ' ');
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

    // 테마 섹션
    const themeSection = this.createSettingsSection(
      '🎨 THEME / 테마',
      [
        { id: 'classic', icon: '⚽', label: 'Classic', active: true },
        { id: 'night', icon: '🌙', label: 'Night', active: false },
        { id: 'neon', icon: '✨', label: 'Neon', active: false }
      ],
      3
    );

    // 사운드 섹션
    const soundSection = this.createSettingsSection(
      '🔊 SOUND / 사운드',
      [
        { id: 'sound-on', icon: '🔊', label: 'ON', active: true },
        { id: 'sound-off', icon: '🔇', label: 'OFF', active: false }
      ],
      2
    );

    // 난이도 섹션
    const difficultySection = this.createSettingsSection(
      '🎮 DIFFICULTY / 난이도',
      [
        { id: 'easy', icon: '😊', label: 'Easy', active: false },
        { id: 'normal', icon: '😐', label: 'Normal', active: true },
        { id: 'hard', icon: '😤', label: 'Hard', active: false }
      ],
      3
    );

    // 디버그 섹션 (개발자 전용)
    const debugSection = this.createDebugSection();

    scrollContainer.appendChild(themeSection);
    scrollContainer.appendChild(soundSection);
    scrollContainer.appendChild(difficultySection);
    scrollContainer.appendChild(debugSection);

    content.appendChild(header);
    content.appendChild(scrollContainer);

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

    // Next Theme 버튼
    const nextThemeBtn = document.createElement('button');
    nextThemeBtn.id = 'next-theme-btn';
    nextThemeBtn.className = debugToggleBtn.className;
    nextThemeBtn.textContent = '🎨 Next Theme';

    buttonsContainer.appendChild(debugToggleBtn);
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

        // TODO: 실제 설정 적용 로직
        console.log('Selected option:', target.dataset.option);
      });
    });

    // 디버그 버튼 이벤트
    const debugToggleBtn = document.getElementById('debug-toggle-btn');
    const nextThemeBtn = document.getElementById('next-theme-btn');

    debugToggleBtn?.addEventListener('click', () => {
      this.callbacks.onToggleDebug?.();
    });

    nextThemeBtn?.addEventListener('click', () => {
      this.callbacks.onNextTheme?.();
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
  }

  /**
   * 정리
   */
  destroy(): void {
    this.hamburgerButton.remove();
    this.modalOverlay.remove();
  }
}
