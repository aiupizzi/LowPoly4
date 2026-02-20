export class WeaponSystem {
  constructor() {
    this.cooldown = 0;
  }

  update(delta) {
    this.cooldown = Math.max(0, this.cooldown - delta);
  }
}
