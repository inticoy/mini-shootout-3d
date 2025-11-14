import './style.css';
import { SnapShoot } from './SnapShoot';
import { ScoreDisplay } from './ui/hud/ScoreDisplay';
import { TouchGuide } from './ui/hud/TouchGuide';
import { PauseModal } from './ui/modals/PauseModal';
import { ContinueModal } from './ui/modals/ContinueModal';
import { GameOverModal } from './ui/modals/GameOverModal';
import { gameStateService } from './core/GameStateService';
import {
  openGameCenterLeaderboard,
  submitGameCenterLeaderBoardScore,
  GoogleAdMob
} from '@apps-in-toss/web-framework';
import { isTossGameCenterAvailable, isTossAdAvailable, logEnvironmentInfo } from './utils/TossEnvironment';
import { TOSS_CONFIG } from './config/TossConfig';

export function loadGame() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiContainer = document.getElementById('ui') as HTMLDivElement | null;

  if (!canvas || !uiContainer) {
    throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
  }

  // 환경 정보 로깅
  logEnvironmentInfo();

  const scoreDisplay = new ScoreDisplay(uiContainer);
  const touchGuide = new TouchGuide(uiContainer);

  // Continue Modal과 GameOver Modal은 미리 선언 (상호 참조를 위해)
  let continueModal: ContinueModal;
  let gameOverModal: GameOverModal;

  const game = new SnapShoot(
    canvas,
    async (score) => {
      scoreDisplay.update(score);

      // 토스 앱 환경이고 게임센터가 활성화된 경우에만 랭킹에 제출
      if (TOSS_CONFIG.GAME_CENTER_ENABLED && isTossGameCenterAvailable()) {
        try {
          const result = await submitGameCenterLeaderBoardScore({ score: score.toString() });
          if (result && result.statusCode === 'SUCCESS') {
            console.log('✅ 토스 랭킹에 점수 제출 성공:', score);
          } else if (result) {
            console.warn('⚠️ 토스 랭킹 점수 제출 실패:', result.statusCode);
          }
        } catch (error) {
          console.error('❌ 토스 랭킹 점수 제출 오류:', error);
        }
      }
    },
    (show) => touchGuide.show(show),
    scoreDisplay,
    (failCount: number) => {
      // 실패 시 콜백
      if (failCount >= 2) {
        // 2번째 실패 -> 바로 GameOver
        gameOverModal.updateScore(scoreDisplay.getScore());
        gameOverModal.open();
      } else {
        // 1번째 실패 -> Continue Modal
        continueModal.open();
      }
    }
  );

  // 저장된 오디오 설정 복구 및 적용
  const audioSettings = gameStateService.getAudioSettings();
  game.setMusicEnabled(audioSettings.musicEnabled);
  game.setSfxEnabled(audioSettings.sfxEnabled);
  game.setMasterVolume(audioSettings.masterVolume);

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
      onContinue: async () => {
        // 광고 기능이 비활성화되어 있거나 토스 앱 환경이 아니면 광고 없이 바로 계속
        if (!TOSS_CONFIG.ADS_ENABLED || !isTossAdAvailable()) {
          console.log('ℹ️ 광고 비활성화 또는 일반 웹 환경: 광고 없이 게임 계속');
          game.continueGame();
          return;
        }

        // 광고 표시 (지원 여부 확인)
        if (GoogleAdMob.showAppsInTossAdMob.isSupported()) {
          try {
            // 광고 보여주기 - AD_GROUP_ID는 토스 앱인토스 콘솔에서 발급받아야 합니다
            // 현재는 임시로 빈 문자열로 설정 (실제 배포 시 교체 필요)
            const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID || '';

            if (adGroupId) {
              let adCompleted = false;

              GoogleAdMob.showAppsInTossAdMob({
                options: {
                  adGroupId: adGroupId
                },
                onEvent: (event) => {
                  switch (event.type) {
                    case 'requested':
                      console.log('광고 보여주기 요청 완료');
                      break;
                    case 'dismissed':
                      console.log('광고 닫힘');
                      if (adCompleted) {
                        game.continueGame();
                      }
                      break;
                    case 'userEarnedReward':
                      console.log('광고 보상 획득:', event.data.unitType, event.data.unitAmount);
                      adCompleted = true;
                      break;
                    case 'show':
                      console.log('광고 컨텐츠 보여짐');
                      break;
                    default:
                      break;
                  }
                },
                onError: (error) => {
                  console.error('광고 보여주기 실패:', error);
                  // 광고 실패 시에도 게임 계속
                  game.continueGame();
                }
              });
            } else {
              // AD_GROUP_ID가 없으면 광고 없이 계속
              console.warn('광고 그룹 ID가 설정되지 않았습니다.');
              game.continueGame();
            }
          } catch (error) {
            console.error('광고 표시 중 오류:', error);
            game.continueGame();
          }
        } else {
          // 광고 미지원 환경에서는 바로 게임 계속
          console.warn('광고가 지원되지 않는 환경입니다.');
          game.continueGame();
        }
      },
      onGiveUp: () => {
        const finalScore = scoreDisplay.getScore();
        game.gameOver(); // 게임오버 처리 (점수 초기화)
        gameOverModal.updateScore(finalScore);
        gameOverModal.open();
      },
      onTimeout: () => {
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
        game.restartGame(); // 점수와 실패 카운트 초기화
      },
      onShare: () => {
        // TODO: 공유 기능 구현
      },
      onRanking: async () => {
        // 게임센터가 비활성화되어 있으면 안내 메시지 표시
        if (!TOSS_CONFIG.GAME_CENTER_ENABLED) {
          console.warn('ℹ️ 게임센터 기능이 아직 활성화되지 않았습니다.');
          alert('랭킹 기능은 준비 중입니다.\n조금만 기다려주세요!');
          return;
        }

        // 토스 앱 환경이 아니면 경고 메시지 표시
        if (!isTossGameCenterAvailable()) {
          console.warn('ℹ️ 랭킹 기능은 토스 앱에서만 사용 가능합니다.');
          alert('랭킹 기능은 토스 앱에서만 사용 가능합니다.\n토스 앱에서 게임을 실행해주세요!');
          return;
        }

        try {
          // 토스 게임센터 리더보드 열기
          await openGameCenterLeaderboard();
          console.log('✅ 토스 게임센터 리더보드 열기');
        } catch (error) {
          console.error('❌ 리더보드 열기 실패:', error);
        }
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
