import * as CANNON from 'cannon-es';

export class World {
  constructor({ scene }) {
    this.scene = scene;
    this.physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  }

  update(delta) {
    this.physics.step(1 / 60, delta, 3);
  }
}
