function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class HeatSystem {
  constructor({ obstacleLookup, spawnPolice, spawnBlockade }) {
    this.stars = 0;
    this.policeUnits = [];
    this.obstacleLookup = obstacleLookup;
    this.spawnPolice = spawnPolice;
    this.spawnBlockade = spawnBlockade;
    this.lastBlockadeAt = 0;
  }

  setHeat(stars) {
    this.stars = clamp(Math.round(stars), 0, 5);
  }

  addHeat(delta) {
    this.setHeat(this.stars + delta);
  }

  steerSeek(from, to, maxSpeed = 12) {
    const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const len = Math.hypot(d.x, d.y, d.z) || 1;
    return { x: (d.x / len) * maxSpeed, y: (d.y / len) * maxSpeed, z: (d.z / len) * maxSpeed };
  }

  steerArrive(from, to, slowRadius = 12, maxSpeed = 10) {
    const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const dist = Math.hypot(d.x, d.y, d.z) || 0.001;
    const scaled = dist < slowRadius ? maxSpeed * (dist / slowRadius) : maxSpeed;
    return { x: (d.x / dist) * scaled, y: (d.y / dist) * scaled, z: (d.z / dist) * scaled };
  }

  avoidObstacles(position, desired) {
    if (!this.obstacleLookup) return desired;
    const ahead = { x: position.x + desired.x * 0.6, y: position.y, z: position.z + desired.z * 0.6 };
    if (this.obstacleLookup(ahead)) {
      return { x: -desired.z, y: desired.y, z: desired.x };
    }
    return desired;
  }

  update({ timeMs, player, dt }) {
    if (this.stars >= 1) {
      while (this.policeUnits.length < 2) this.policeUnits.push(this.spawnPolice());
    }

    for (const [index, unit] of this.policeUnits.entries()) {
      const desired = this.stars >= 3
        ? { x: player.velocity.z * 0.8 + (index === 0 ? 5 : -5), y: 0, z: -player.velocity.x * 0.8 }
        : this.steerArrive(unit.position, player.position, 16, 14);

      const steering = this.avoidObstacles(unit.position, desired);
      unit.velocity.x += steering.x * dt;
      unit.velocity.z += steering.z * dt;
      unit.position.x += unit.velocity.x * dt;
      unit.position.z += unit.velocity.z * dt;

      if (this.stars >= 3) {
        unit.behavior = 'pit';
        unit.targetOffset = desired;
      } else {
        unit.behavior = 'follow';
      }
    }

    if (this.stars >= 5 && timeMs - this.lastBlockadeAt > 4000) {
      const speed = Math.hypot(player.velocity.x, player.velocity.z) || 1;
      const dir = { x: player.velocity.x / speed, z: player.velocity.z / speed };
      this.spawnBlockade({
        x: player.position.x + dir.x * 38,
        y: player.position.y,
        z: player.position.z + dir.z * 38,
      });
      this.lastBlockadeAt = timeMs;
    }
  }
}
