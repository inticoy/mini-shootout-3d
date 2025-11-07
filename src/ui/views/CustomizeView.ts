/**
 * CustomizeView - 테마 변경 뷰 (재사용 가능)
 *
 * PauseModal과 GameOverModal에서 공통으로 사용
 */

import { BALL_THEMES } from '../../config/ball';

export interface CustomizeViewCallbacks {
  onSelectTheme?: (themeName: string) => void;
  onPressEffect?: (button: HTMLButtonElement) => void;
}

export function createCustomizeView(callbacks: CustomizeViewCallbacks = {}): HTMLDivElement {
  const view = document.createElement('div');
  view.className = 'w-full max-w-md flex flex-col gap-6 pb-6';

  const ballThemeSection = document.createElement('div');
  ballThemeSection.className = 'flex flex-col gap-4';

  const sectionTitle = document.createElement('h3');
  sectionTitle.className = 'text-white/90 font-semibold text-lg';
  sectionTitle.textContent = '볼 테마';
  ballThemeSection.appendChild(sectionTitle);

  const themeGrid = document.createElement('div');
  themeGrid.className = 'grid grid-cols-3 gap-4';

  const themes = [
    { name: BALL_THEMES.BASIC.name, image: BALL_THEMES.BASIC.imageUrl },
    { name: BALL_THEMES.BASKETBALL.name, image: BALL_THEMES.BASKETBALL.imageUrl },
    { name: BALL_THEMES.VOLLEYBALL.name, image: BALL_THEMES.VOLLEYBALL.imageUrl },
    { name: BALL_THEMES.SUN.name, image: BALL_THEMES.SUN.imageUrl },
    { name: BALL_THEMES.MOON.name, image: BALL_THEMES.MOON.imageUrl },
    { name: BALL_THEMES.EARTH.name, image: BALL_THEMES.EARTH.imageUrl },
    { name: BALL_THEMES.BEACHBALL.name, image: BALL_THEMES.BEACHBALL.imageUrl },
    { name: BALL_THEMES.MONSTERBALL.name, image: BALL_THEMES.MONSTERBALL.imageUrl },
    { name: BALL_THEMES.WORLDCUP2010.name, image: BALL_THEMES.WORLDCUP2010.imageUrl },
  ];

  themes.forEach((theme) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.theme = theme.name;
    button.className = `
      aspect-square rounded-full
      bg-white/12 border-2 border-white/15
      shadow-[0_4px_12px_rgba(0,0,0,0.2)]
      transition-all duration-150
      hover:bg-white/16 hover:border-white/30 hover:shadow-[0_6px_16px_rgba(0,0,0,0.3)]
      active:bg-white/10 active:shadow-[0_2px_6px_rgba(0,0,0,0.2)]
      flex items-center justify-center
      overflow-hidden
      p-2
    `.trim().replace(/\s+/g, ' ');

    const img = document.createElement('img');
    img.src = theme.image;
    img.alt = theme.name;
    img.className = 'w-full h-full object-contain';

    button.appendChild(img);
    themeGrid.appendChild(button);

    // Press 효과
    if (callbacks.onPressEffect) {
      callbacks.onPressEffect(button);
    }

    // 클릭 이벤트
    button.addEventListener('click', () => {
      if (callbacks.onSelectTheme) {
        callbacks.onSelectTheme(theme.name);
      }
    });
  });

  ballThemeSection.appendChild(themeGrid);
  view.appendChild(ballThemeSection);

  return view;
}
