export class ExplosionSystem {
  constructor({ dynamicBodies = [], vehicles = [] }) {
    this.dynamicBodies = dynamicBodies;
    this.vehicles = vehicles;
  }

  applyRadialImpulse(position, radius, force) {
    const apply = (body) => {
      const dx = body.position.x - position.x;
      const dy = body.position.y - position.y;
      const dz = body.position.z - position.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance === 0 || distance > radius) return;
      const scale = (1 - distance / radius) * force;
      const impulse = { x: (dx / distance) * scale, y: (dy / distance) * scale, z: (dz / distance) * scale };
      body.applyImpulse(impulse, body.position);
    };

    this.dynamicBodies.forEach(apply);
    this.vehicles.forEach((v) => apply(v.body || v));
  }
}
