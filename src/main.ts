import './style.css';
import { MiniShootout3D } from './game';
import { ScoreDisplay } from './ui/scoreDisplay';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiContainer = document.getElementById('ui') as HTMLDivElement | null;
const touchGuideElement = document.getElementById('touch-guide') as HTMLDivElement | null;

if (!canvas || !uiContainer || !touchGuideElement) {
  throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
}

// UI 컴포넌트 생성
const scoreDisplay = new ScoreDisplay(uiContainer);
const touchGuideDisplay = touchGuideElement;

function showTouchGuide(show: boolean) {
  if (show) {
    touchGuideDisplay.classList.add('show');
  } else {
    touchGuideDisplay.classList.remove('show');
  }
}

new MiniShootout3D(canvas, (score) => scoreDisplay.update(score), showTouchGuide);
