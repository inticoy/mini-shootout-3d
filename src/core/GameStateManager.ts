/**
 * GameStateManager - 게임 상태 관리
 *
 * 게임의 현재 상태를 관리하고 상태 전환을 처리합니다.
 * 기존의 isShotInProgress, hasScored, isTrackingBall 등의
 * 분산된 플래그들을 하나의 상태 머신으로 통합합니다.
 */

/**
 * 게임 상태 정의
 */
export const GameState = {
  /** 초기화 중 */
  INITIALIZING: 'INITIALIZING',

  /** 대기 중 (슈팅 가능) */
  IDLE: 'IDLE',

  /** 조준 중 (터치/드래그 중) */
  AIMING: 'AIMING',

  /** 슈팅 진행 중 (공이 날아가는 중) */
  SHOOTING: 'SHOOTING',

  /** 골 성공 */
  SCORING: 'SCORING',

  /** 골 실패 */
  FAILED: 'FAILED',

  /** 일시정지 */
  PAUSED: 'PAUSED',

  /** 게임오버 */
  GAME_OVER: 'GAME_OVER',
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

/**
 * 게임 상태 관리자
 */
export class GameStateManager {
  private currentState: GameState = GameState.INITIALIZING;
  private previousState: GameState | null = null;
  private stateChangeListeners: Array<(newState: GameState, oldState: GameState) => void> = [];

  constructor(initialState: GameState = GameState.INITIALIZING) {
    this.currentState = initialState;
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): GameState {
    return this.currentState;
  }

  /**
   * 이전 상태 가져오기
   */
  getPreviousState(): GameState | null {
    return this.previousState;
  }

  /**
   * 상태 변경
   */
  setState(newState: GameState): void {
    if (this.currentState === newState) {
      return; // 같은 상태로 전환 방지
    }

    const oldState = this.currentState;
    this.previousState = oldState;
    this.currentState = newState;

    // 상태 변경 리스너 호출
    this.stateChangeListeners.forEach(listener => {
      listener(newState, oldState);
    });
  }

  /**
   * 특정 상태인지 확인
   */
  is(state: GameState): boolean {
    return this.currentState === state;
  }

  /**
   * 여러 상태 중 하나인지 확인
   */
  isOneOf(...states: GameState[]): boolean {
    return states.includes(this.currentState);
  }

  /**
   * 슈팅 가능한 상태인지 확인
   */
  canShoot(): boolean {
    return this.isOneOf(GameState.IDLE, GameState.AIMING);
  }

  /**
   * 슈팅 진행 중인지 확인
   */
  isShotInProgress(): boolean {
    return this.isOneOf(GameState.SHOOTING, GameState.SCORING, GameState.FAILED);
  }

  /**
   * 게임 진행 중인지 확인 (일시정지/게임오버 아님)
   */
  isPlaying(): boolean {
    return !this.isOneOf(GameState.PAUSED, GameState.GAME_OVER);
  }

  /**
   * 상태 변경 리스너 추가
   */
  onStateChange(listener: (newState: GameState, oldState: GameState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  /**
   * 상태 변경 리스너 제거
   */
  offStateChange(listener: (newState: GameState, oldState: GameState) => void): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  /**
   * 모든 리스너 제거
   */
  clearListeners(): void {
    this.stateChangeListeners = [];
  }

  /**
   * 디버그용: 현재 상태 문자열
   */
  toString(): string {
    return `GameState: ${this.currentState}`;
  }
}
