import './style.css';
import { MiniShootout3D } from './game';
import { ScoreDisplay } from './ui/scoreDisplay';
import { TouchGuide } from './ui/touchGuide';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiContainer = document.getElementById('ui') as HTMLDivElement | null;

if (!canvas || !uiContainer) {
  throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
}

// UI 컴포넌트 생성
const scoreDisplay = new ScoreDisplay(uiContainer);
const touchGuide = new TouchGuide(uiContainer);

// 게임 초기화
new MiniShootout3D(
  canvas,
  (score) => scoreDisplay.update(score),
  (show) => touchGuide.show(show),
  scoreDisplay
);
