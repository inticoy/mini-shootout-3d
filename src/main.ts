import './phosphor-icons.css';

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
  void import('./GameLoader').then(({ loadGame }) => {
    loadGame();
  });
}
