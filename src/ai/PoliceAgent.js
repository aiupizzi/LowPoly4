import { Steering } from './Steering.js';

export class PoliceAgent {
  constructor(heatSystem) {
    this.heatSystem = heatSystem;
    this.steering = new Steering();
    this.position = { x: -20, z: -20 };
    this.active = false;
  }

  update(delta, playerPosition) {
    this.active = this.heatSystem.heat > 20;
    if (!this.active) return;

    const force = this.steering.seek(this.position, playerPosition, 0.4 * delta);
    this.position.x += force.x;
    this.position.z += force.z;
  }
}
