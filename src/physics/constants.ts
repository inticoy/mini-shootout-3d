/**
 * 물리 엔진 전역 상수
 *
 * 이 상수들은 world, ball, velocityCalculator에서 공통으로 사용됩니다.
 * 일관성을 위해 반드시 이 파일의 상수를 사용해야 합니다.
 */

/**
 * 중력 가속도 (m/s²)
 * - 지구 표준 중력: -9.81
 * - Y축 음의 방향
 */
export const PHYSICS_GRAVITY = -18.81;

/**
 * 공기저항 계수 (Linear Damping)
 * - 0: 공기저항 없음 (진공)
 * - 0.1: 약간의 공기저항
 * - 값이 클수록 속도가 빠르게 감소
 */
export const PHYSICS_LINEAR_DAMPING = 0.05;
