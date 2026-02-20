export class ExplosionSystem {
  constructor() {
    this.activeExplosions = [];
  }

  update(delta) {
    this.activeExplosions = this.activeExplosions
      .map((item) => ({ ...item, life: item.life - delta }))
      .filter((item) => item.life > 0);
  }
}
