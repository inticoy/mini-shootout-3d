import './phosphor-icons.css';

/**
 * URL 파라미터 파싱
 */
function parseGameParams(): { score?: number } {
  const params = new URLSearchParams(window.location.search);
  const scoreParam = params.get('score');

  return {
    score: scoreParam ? parseInt(scoreParam, 10) : undefined
  };
}

const pathname = window.location.pathname;
const normalized = pathname.replace(/\/+$/, '');
const isAdmin =
  normalized.endsWith('/admin') ||
  normalized.includes('/admin.html') ||
  normalized.endsWith('/admin/index');

if (isAdmin) {
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.style.display = 'none';
  }
  void import('./admin/main');
} else {
  // URL 파라미터 파싱 후 게임 로드
  const gameParams = parseGameParams();

  void import('./GameLoader').then(({ loadGame }) => {
    loadGame(gameParams);
  });
}
