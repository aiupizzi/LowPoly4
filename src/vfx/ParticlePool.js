import * as THREE from 'three';

export class ParticlePool {
  constructor(scene, size = 256) {
    this.scene = scene;
    this.pool = Array.from({ length: size }, () => ({
      mesh: new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: '#d7e8ff', emissive: '#5fa8ff', emissiveIntensity: 1 })),
      velocity: new THREE.Vector3(),
      life: 0
    }));

    this.pool.forEach((p) => {
      p.mesh.visible = false;
      this.scene.add(p.mesh);
    });
  }

  spawnDebris(origin, amount = 8) {
    for (let i = 0; i < amount; i++) {
      const particle = this.pool.find((p) => p.life <= 0);
      if (!particle) break;
      particle.life = 0.5 + Math.random() * 0.5;
      particle.mesh.visible = true;
      particle.mesh.position.copy(origin);
      particle.velocity.set((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8);
    }
  }

  update(delta) {
    for (const particle of this.pool) {
      if (particle.life <= 0) continue;
      particle.life -= delta;
      particle.velocity.y -= 20 * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      if (particle.life <= 0) particle.mesh.visible = false;
    }
  }
}
