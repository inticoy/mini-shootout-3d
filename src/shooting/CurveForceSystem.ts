import * as CANNON from 'cannon-es';
import { ShotType, type ShotAnalysis } from './ShotAnalyzer';
import { CURVE_FORCE_CONFIG } from '../config/shooting';

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
 * 감아차기 슛이 날아가는 동안 curveDirection에 따라 X축 방향으로 힘을 가해 궤도를 휘게 함
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

    // curveDirection: -1 (왼쪽), 1 (오른쪽)
    if (analysis.curveDirection === 0) {
      return;
    }

    // 속도 크기를 사용해 힘 크기를 조정
    const { baseStrength, speedReference, speedMaxFactor, duration } = CURVE_FORCE_CONFIG;

    const speed = ballBody.velocity.length();
    const speedFactor = Math.min(speedReference > 0 ? speed / speedReference : 1, speedMaxFactor);
    const timeFactor = Math.max(0, 1 - elapsedTime / duration); // 시간 감쇠
    const direction = -analysis.curveDirection; // 기존 좌/우 매핑 유지
    const curveStrength = analysis.curveAmount * speedFactor * timeFactor * baseStrength;

    // X축 방향으로만 힘을 가해 좌우 이동을 유도
    const lateralForce = direction * curveStrength * ballBody.mass;
    const force = new CANNON.Vec3(lateralForce, 0, 0);

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
