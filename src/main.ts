import './style.css';
import { MiniShootout3D } from './game';
import { ScoreDisplay } from './ui/scoreDisplay';
import { TouchGuide } from './ui/touchGuide';
import { Settings } from './ui/settings';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiContainer = document.getElementById('ui') as HTMLDivElement | null;

if (!canvas || !uiContainer) {
  throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
}

// UI 컴포넌트 생성
const scoreDisplay = new ScoreDisplay(uiContainer);
const touchGuide = new TouchGuide(uiContainer);

// 게임 초기화
const game = new MiniShootout3D(
  canvas,
  (score) => scoreDisplay.update(score),
  (show) => touchGuide.show(show),
  scoreDisplay
);

// Settings 생성 (게임 인스턴스 생성 후에 콜백 전달)
new Settings(uiContainer, {
  onToggleDebug: () => game.toggleDebugMode(),
  onNextTheme: () => void game.switchToNextTheme()
});
