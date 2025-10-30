import './style.css';
import { MiniShootout3D } from './game';
import { ScoreDisplay } from './ui/scoreDisplay';
import { TouchGuide } from './ui/touchGuide';
import { Settings } from './ui/settings';

export function bootstrapGame() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiContainer = document.getElementById('ui') as HTMLDivElement | null;

  if (!canvas || !uiContainer) {
    throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
  }

  const scoreDisplay = new ScoreDisplay(uiContainer);
  const touchGuide = new TouchGuide(uiContainer);

  const game = new MiniShootout3D(
    canvas,
    (score) => scoreDisplay.update(score),
    (show) => touchGuide.show(show),
    scoreDisplay
  );

  new Settings(uiContainer, {
    onToggleDebug: () => game.toggleDebugMode(),
    onNextTheme: () => void game.switchToNextTheme()
  });
}

