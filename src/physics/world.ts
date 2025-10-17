import * as CANNON from 'cannon-es';

export interface PhysicsContext {
  world: CANNON.World;
  materials: {
    ground: CANNON.Material;
    ball: CANNON.Material;
  };
}

export function createPhysicsWorld(): PhysicsContext {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -30, 0)
  });

  const ground = new CANNON.Material('ground');
  const ball = new CANNON.Material('ball');

  const contactMaterial = new CANNON.ContactMaterial(ground, ball, {
    restitution: 0.65,
    friction: 0.4
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
