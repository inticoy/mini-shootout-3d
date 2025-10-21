import * as CANNON from 'cannon-es';
import { ShotType, type ShotAnalysis } from './shotAnalyzer';

/**
 * 커브 슛 추적 데이터
 */
interface CurveShotData {
  isActive: boolean;
  analysis: ShotAnalysis;
  startTime: number;
  elapsedTime: number;
}

/**
 * 커브 힘 적용 시스템
 * 감아차기 슛이 날아가는 동안 속도 벡터에 수직인 힘을 가함
 */
export class CurveForceSystem {
  private curveShotData: CurveShotData | null = null;

  /**
   * 커브 슛 시작
   */
  startCurveShot(analysis: ShotAnalysis) {
    if (analysis.type !== ShotType.CURVE) {
      this.curveShotData = null;
      return;
    }

    this.curveShotData = {
      isActive: true,
      analysis,
      startTime: performance.now(),
      elapsedTime: 0
    };
  }

  /**
   * 커브 슛 중지
   */
  stopCurveShot() {
    this.curveShotData = null;
  }

  /**
   * 매 프레임 업데이트 - 커브 힘 적용
   */
  update(deltaTime: number, ballBody: CANNON.Body) {
    if (!this.curveShotData || !this.curveShotData.isActive) {
      return;
    }

    this.curveShotData.elapsedTime += deltaTime;

    // 2초 후 자동 중지 (골대 근처에서는 효과 감소)
    if (this.curveShotData.elapsedTime > 2.0) {
      this.stopCurveShot();
      return;
    }

    // 커브 힘 계산 및 적용 (처음부터 강하게)
    this.applyCurveForce(ballBody);
  }

  /**
   * 커브 힘 적용
   * 속도 벡터에 수직인 힘을 가함 (마그누스 효과 시뮬레이션)
   */
  private applyCurveForce(ballBody: CANNON.Body) {
    if (!this.curveShotData) return;

    const { analysis, elapsedTime } = this.curveShotData;

    // 속도 벡터
    const velocity = ballBody.velocity;
    const speed = velocity.length();

    // 속도가 너무 느리면 힘 적용 안 함
    if (speed < 2) {
      return;
    }

    // 속도 벡터의 정규화된 방향
    const velocityDir = velocity.clone();
    const velLength = velocityDir.length();

    // 속도가 0에 가까우면 정규화 불가 - 스킵
    if (velLength < 0.001) {
      return;
    }

    velocityDir.normalize();

    // 속도 벡터에 수직인 방향 계산 (오른쪽)
    // velocity = (vx, vy, vz)
    // perpendicular = (-vz, 0, vx) (XZ 평면에서 90도 회전)
    const perpendicular = new CANNON.Vec3(-velocityDir.z, 0, velocityDir.x);

    // perpendicular도 정규화 필요
    const perpLength = perpendicular.length();
    if (perpLength < 0.001) {
      return;
    }
    perpendicular.normalize();

    // curveDirection: -1 (왼쪽), 1 (오른쪽) - 반전 필요
    const direction = -analysis.curveDirection;

    // 커브 강도 (속도가 빠를수록 강함, 시간이 지날수록 약해짐)
    const speedFactor = Math.min(speed / 20, 1.5); // 속도 기반 배율
    const timeFactor = Math.max(0, 1 - elapsedTime / 1.5); // 시간 감쇠
    const curveStrength = analysis.curveAmount * speedFactor * timeFactor * 10.0; // 2.0 -> 5.0

    // 힘 계산 (새 벡터 생성)
    const force = new CANNON.Vec3(
      perpendicular.x * direction * curveStrength,
      perpendicular.y * direction * curveStrength,
      perpendicular.z * direction * curveStrength
    );

    // 힘 적용
    ballBody.applyForce(force, ballBody.position);
  }

  /**
   * 현재 커브 슛이 활성화되어 있는지
   */
  isActive(): boolean {
    return this.curveShotData?.isActive ?? false;
  }
}
