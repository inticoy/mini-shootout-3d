/**
 * BallController - 공 제어 로직
 *
 * Ball 엔티티를 래핑하고 공의 물리 상태를 관리합니다.
 * - 공의 중력 on/off
 * - 공의 위치/속도 리셋
 * - 샷 준비
 * - 공의 상태 동기화
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ball } from './ball';
import { BALL_START_POSITION, BALL_PHYSICS } from '../config/ball';

/**
 * 공 컨트롤러
 */
export class BallController {
  private readonly ball: Ball;
  private readonly ballInitialMass: number;
  private isBallGravityEnabled = false;

  /** 디버깅용 임시 위치 */
  private readonly tempBallPosition = new THREE.Vector3();

  constructor(ball: Ball) {
    this.ball = ball;
    this.ballInitialMass = ball.body.mass;
  }

  /**
   * Ball 엔티티 가져오기
   */
  getBall(): Ball {
    return this.ball;
  }

  /**
   * 중력 활성화 여부
   */
  isGravityEnabled(): boolean {
    return this.isBallGravityEnabled;
  }

  /**
   * 공의 현재 위치를 tempBallPosition에 복사
   * (Goal 넷 펄스 등 디버깅용)
   */
  copyPositionToTemp(): THREE.Vector3 {
    this.tempBallPosition.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    return this.tempBallPosition;
  }

  /**
   * 샷 준비 - 중력 활성화 및 모든 힘/속도 초기화
   */
  prepareBallForShot(): void {
    this.setBallGravityEnabled(true);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.syncBallKinematicFrames();
  }

  /**
   * 공 초기 위치로 리셋 (중력 off)
   */
  resetBall(): void {
    this.setBallGravityEnabled(false);

    this.ball.body.position.set(
      BALL_START_POSITION.x,
      BALL_START_POSITION.y,
      BALL_START_POSITION.z
    );

    // 초기 회전 적용
    const tempEuler = new THREE.Euler(
      BALL_PHYSICS.startRotation.x,
      BALL_PHYSICS.startRotation.y,
      BALL_PHYSICS.startRotation.z,
      'XYZ'
    );
    const tempQuat = new THREE.Quaternion().setFromEuler(tempEuler);
    this.ball.body.quaternion.set(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);

    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.syncBallKinematicFrames();

    this.ball.syncVisuals();
  }

  /**
   * 공만 리셋 (스코어/난이도 유지용)
   */
  resetBallOnly(): void {
    this.setBallGravityEnabled(false);

    this.ball.body.position.set(
      BALL_START_POSITION.x,
      BALL_START_POSITION.y,
      BALL_START_POSITION.z
    );

    // 초기 회전 적용
    const tempEuler = new THREE.Euler(
      BALL_PHYSICS.startRotation.x,
      BALL_PHYSICS.startRotation.y,
      BALL_PHYSICS.startRotation.z,
      'XYZ'
    );
    const tempQuat = new THREE.Quaternion().setFromEuler(tempEuler);
    this.ball.body.quaternion.set(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);

    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.syncBallKinematicFrames();

    this.ball.syncVisuals();
  }

  /**
   * 중력 활성화/비활성화
   */
  private setBallGravityEnabled(enabled: boolean): void {
    if (enabled === this.isBallGravityEnabled) {
      return;
    }

    if (enabled) {
      this.ball.body.type = CANNON.Body.DYNAMIC;
      this.ball.body.mass = this.ballInitialMass;
      this.ball.body.updateMassProperties();
      this.ball.body.force.set(0, 0, 0);
      this.ball.body.torque.set(0, 0, 0);
      this.ball.body.wakeUp();
    } else {
      this.ball.body.velocity.set(0, 0, 0);
      this.ball.body.angularVelocity.set(0, 0, 0);
      this.ball.body.force.set(0, 0, 0);
      this.ball.body.torque.set(0, 0, 0);
      this.ball.body.type = CANNON.Body.STATIC;
      this.ball.body.mass = 0;
      this.ball.body.updateMassProperties();
      this.ball.body.sleep();
    }

    this.isBallGravityEnabled = enabled;
  }

  /**
   * 공의 kinematic 프레임 동기화
   * (previousPosition, interpolatedPosition 등)
   */
  private syncBallKinematicFrames(): void {
    this.ball.body.previousPosition.copy(this.ball.body.position);
    this.ball.body.interpolatedPosition.copy(this.ball.body.position);
    this.ball.body.previousQuaternion.copy(this.ball.body.quaternion);
    this.ball.body.interpolatedQuaternion.copy(this.ball.body.quaternion);
  }
}
