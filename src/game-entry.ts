import './style.css';
import { MiniShootout3D } from './game';
import { ScoreDisplay } from './ui/scoreDisplay';
import { TouchGuide } from './ui/touchGuide';
import { PauseModal } from './ui/pause-modal';
import { ContinueModal } from './ui/continue-modal';
import { GameOverModal } from './ui/game-over-modal';

export function bootstrapGame() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiContainer = document.getElementById('ui') as HTMLDivElement | null;

  if (!canvas || !uiContainer) {
    throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
  }

  const scoreDisplay = new ScoreDisplay(uiContainer);
  const touchGuide = new TouchGuide(uiContainer);

  // Continue Modal과 GameOver Modal은 미리 선언 (상호 참조를 위해)
  let continueModal: ContinueModal;
  let gameOverModal: GameOverModal;

  const game = new MiniShootout3D(
    canvas,
    (score) => scoreDisplay.update(score),
    (show) => touchGuide.show(show),
    scoreDisplay,
    (failCount: number) => {
      // 실패 시 콜백
      console.log(`게임 실패! 실패 횟수: ${failCount}`);

      if (failCount >= 2) {
        // 2번째 실패 -> 바로 GameOver
        console.log('2번째 실패 -> GameOver');
        gameOverModal.updateScore(scoreDisplay.getScore());
        gameOverModal.open();
      } else {
        // 1번째 실패 -> Continue Modal
        console.log('1번째 실패 -> Continue Modal');
        continueModal.open();
      }
    }
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

  // Pause Modal 생성
  new PauseModal(uiContainer, {
    onToggleDebug: () => game.toggleDebugMode(),
    onSetMusicEnabled: (enabled: boolean) => game.setMusicEnabled(enabled),
    onSetSfxEnabled: (enabled: boolean) => game.setSfxEnabled(enabled),
    onSetMasterVolume: (volume: number) => game.setMasterVolume(volume),
    onNextTheme: () => void game.switchToNextTheme(),
    onSelectTheme: (themeName: string) => void game.switchToTheme(themeName),
    onRestart: () => game.restartGame()
  });

  // Continue Modal 생성 (광고보고 이어하기)
  continueModal = new ContinueModal(
    uiContainer,
    {
      onContinue: () => {
        console.log('✅ 광고보고 이어하기 선택');
        // TODO: 광고 재생 로직 구현
        // 광고 완료 후 game.continueGame() 호출
        game.continueGame(); // 현재 점수와 난이도 유지, 공만 원위치
      },
      onGiveUp: () => {
        console.log('❌ 포기하기 선택 - GameOver로 전환');
        const finalScore = scoreDisplay.getScore();
        game.gameOver(); // 게임오버 처리 (점수 초기화)
        gameOverModal.updateScore(finalScore);
        gameOverModal.open();
      },
      onTimeout: () => {
        console.log('⏱️ 타임아웃 - GameOver로 전환');
        const finalScore = scoreDisplay.getScore();
        game.gameOver(); // 게임오버 처리 (점수 초기화)
        gameOverModal.updateScore(finalScore);
        gameOverModal.open();
      }
    },
    {
      timeoutSeconds: 5 // 5초 타임아웃
    }
  );

  // Game Over Modal 생성
  gameOverModal = new GameOverModal(
    uiContainer,
    0, // 초기 점수
    {
      onRestart: () => {
        console.log('🔄 다시하기 선택');
        game.restartGame(); // 점수와 실패 카운트 초기화
      },
      onShare: () => {
        console.log('공유하기');
        // TODO: 공유 기능 구현
      },
      onRanking: () => {
        console.log('랭킹보기');
        // TODO: 랭킹 화면 구현
      },
      onSelectTheme: (themeName: string) => void game.switchToTheme(themeName)
    }
  );

  // 게임오버 시 Continue Modal 열기
  // TODO: game.ts에서 게임오버 이벤트 발생 시 continueModal.open() 호출
  // 예시: game.onGameOver(() => continueModal.open());

  // 임시 테스트: 키보드 'C' 키로 Continue Modal 열기
  window.addEventListener('keydown', (e) => {
    if (e.key === 'c' || e.key === 'C') {
      continueModal.open();
    }
    if (e.key === 'g' || e.key === 'G') {
      gameOverModal.updateScore(scoreDisplay.getScore());
      gameOverModal.open();
    }
  });
}
