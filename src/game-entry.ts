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

  // 저장된 오디오 설정 복구 및 적용 (기본값: ON/ON, master 1.0)
  try {
    const musicEnabledStr = localStorage.getItem('snapshoot.audio.musicEnabled');
    const sfxEnabledStr = localStorage.getItem('snapshoot.audio.sfxEnabled');
    const masterVolumeStr = localStorage.getItem('snapshoot.audio.masterVolume');

    const musicEnabled = musicEnabledStr === null ? true : musicEnabledStr === 'true';
    const sfxEnabled = sfxEnabledStr === null ? true : sfxEnabledStr === 'true';
    const masterVolume = masterVolumeStr === null ? 0.5 : Math.max(0, Math.min(1, Number(masterVolumeStr)));

    game.setMusicEnabled(musicEnabled);
    game.setSfxEnabled(sfxEnabled);
    game.setMasterVolume(masterVolume);
  } catch {}

  new Settings(uiContainer, {
    onToggleDebug: () => game.toggleDebugMode(),
    onSetMusicEnabled: (enabled: boolean) => game.setMusicEnabled(enabled),
    onSetSfxEnabled: (enabled: boolean) => game.setSfxEnabled(enabled),
    onSetMasterVolume: (volume: number) => game.setMasterVolume(volume),
    onNextTheme: () => void game.switchToNextTheme(),
    onRestart: () => game.restartGame()
  });
}

