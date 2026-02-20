export class DebrisPool {
  constructor(size = 256) {
    this.pool = Array.from({ length: size }, () => ({ active: false, ttl: 0, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }));
    this.cursor = 0;
  }

  spawn(position, velocity, ttl = 0.75) {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    p.active = true;
    p.ttl = ttl;
    p.position = { ...position };
    p.velocity = { ...velocity };
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.active = false;
        continue;
      }
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
      p.velocity.y -= 9.8 * dt;
    }
  }
}
