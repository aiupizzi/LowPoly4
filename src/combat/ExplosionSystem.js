import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class ExplosionSystem {
  constructor(world, chunkManager) {
    this.world = world;
    this.chunkManager = chunkManager;
    this.activeExplosions = [];
  }

  explode(center, radius = 5, force = 120) {
    this.activeExplosions.push({ center: center.clone(), life: 0.3 });

    for (const body of this.world.dynamicBodies) {
      const pos = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
      const dir = pos.sub(center);
      const dist = dir.length();
      if (dist > radius || dist < 0.0001) continue;
      dir.normalize().multiplyScalar((1 - dist / radius) * force);
      body.applyImpulse(new CANNON.Vec3(dir.x, Math.max(dir.y, 8), dir.z), body.position);
    }

    for (let x = -radius; x <= radius; x++) {
      for (let y = 0; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const wx = Math.round(center.x + x);
          const wy = Math.round(center.y + y);
          const wz = Math.round(center.z + z);
          const d = Math.hypot(x, y, z);
          if (d <= radius && Math.random() > d / radius) {
            this.chunkManager.removeVoxelAt(wx, wy, wz);
          }
        }
      }
    }
  }

  update(delta) {
    this.activeExplosions = this.activeExplosions
      .map((item) => ({ ...item, life: item.life - delta }))
      .filter((item) => item.life > 0);
  }
}
