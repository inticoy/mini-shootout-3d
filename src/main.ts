import './style.css';
import { MiniShootout3D } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const scoreElement = document.getElementById('score') as HTMLDivElement | null;

if (!canvas || !scoreElement) {
  throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
}

const scoreDisplay = scoreElement;

function updateScore(score: number) {
  scoreDisplay.textContent = score.toString();
  scoreDisplay.classList.add('score-changed');
  setTimeout(() => {
    scoreDisplay.classList.remove('score-changed');
  }, 300);
}

new MiniShootout3D(canvas, updateScore);

console.log('⚽ Mini Shootout 3D Ready');
console.log('손가락이나 마우스로 공을 드래그해서 슛해보세요!');