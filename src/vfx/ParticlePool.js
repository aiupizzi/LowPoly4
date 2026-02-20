export class ParticlePool {
  constructor(size = 128) {
    this.particles = Array.from({ length: size }, () => ({ life: 0 }));
  }

  update(delta) {
    for (const particle of this.particles) {
      particle.life = Math.max(0, particle.life - delta);
    }
  }
}
