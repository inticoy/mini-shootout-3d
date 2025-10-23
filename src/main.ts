import './style.css';
import { MiniShootout3D } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const scoreElement = document.getElementById('score') as HTMLDivElement | null;
const touchGuideElement = document.getElementById('touch-guide') as HTMLDivElement | null;

if (!canvas || !scoreElement || !touchGuideElement) {
  throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
}

const scoreDisplay = scoreElement;
const touchGuideDisplay = touchGuideElement;

function updateScore(score: number) {
  scoreDisplay.textContent = score.toString();
  scoreDisplay.classList.add('score-changed');
  setTimeout(() => {
    scoreDisplay.classList.remove('score-changed');
  }, 300);
}

function showTouchGuide(show: boolean) {
  if (show) {
    touchGuideDisplay.classList.add('show');
  } else {
    touchGuideDisplay.classList.remove('show');
  }
}

new MiniShootout3D(canvas, updateScore, showTouchGuide);
