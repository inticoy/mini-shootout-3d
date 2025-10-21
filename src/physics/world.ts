import * as CANNON from 'cannon-es';
import { PHYSICS_GRAVITY } from './constants';

export interface PhysicsContext {
  world: CANNON.World;
  materials: {
    ground: CANNON.Material;
    ball: CANNON.Material;
  };
}

export function createPhysicsWorld(): PhysicsContext {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, PHYSICS_GRAVITY, 0)
  });

  // Solver 정밀도 향상 (CCD와 함께 사용)
  // GSSolver는 iterations 속성을 가짐
  const solver = world.solver as any;
  solver.iterations = 20; // 기본 10 → 20 (더 정확한 충돌 해결)
  solver.tolerance = 0.001; // 더 엄격한 허용 오차

  // Broadphase 최적화 (많은 객체가 있을 때 성능 향상)
  world.broadphase = new CANNON.SAPBroadphase(world);

  // 기본 Contact Material 설정 (CCD 최적화)
  world.defaultContactMaterial.contactEquationStiffness = 1e8;
  world.defaultContactMaterial.contactEquationRelaxation = 3;

  const ground = new CANNON.Material('ground');
  const ball = new CANNON.Material('ball');

  const contactMaterial = new CANNON.ContactMaterial(ground, ball, {
    restitution: 0.65,
    friction: 0.4,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  });
  world.addContactMaterial(contactMaterial);

  return {
    world,
    materials: {
      ground,
      ball
    }
  };
}
