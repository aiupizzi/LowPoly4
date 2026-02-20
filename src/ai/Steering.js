export class Steering {
  seek(from, to, maxForce = 1) {
    const x = to.x - from.x;
    const z = to.z - from.z;
    const len = Math.hypot(x, z) || 1;
    return { x: (x / len) * maxForce, z: (z / len) * maxForce };
  }

  arrive(from, to, radius = 8, maxForce = 1) {
    const x = to.x - from.x;
    const z = to.z - from.z;
    const dist = Math.hypot(x, z) || 1;
    const scale = Math.min(1, dist / radius);
    return { x: (x / dist) * maxForce * scale, z: (z / dist) * maxForce * scale };
  }

  avoidObstacles(from, obstacles, maxForce = 1) {
    let fx = 0;
    let fz = 0;
    for (const obstacle of obstacles) {
      const dx = from.x - obstacle.x;
      const dz = from.z - obstacle.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 9 && d2 > 0.001) {
        fx += (dx / d2) * maxForce;
        fz += (dz / d2) * maxForce;
      }
    }
    return { x: fx, z: fz };
  }
}
