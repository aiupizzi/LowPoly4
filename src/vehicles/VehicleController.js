import gsap from 'gsap';

export class VehicleController {
  constructor(player) {
    this.player = player;
    this.speed = 0;
  }

  update() {
    const targetSpeed = this.player.velocity.length();
    gsap.to(this, { speed: targetSpeed, duration: 0.1, overwrite: true, ease: 'power1.out' });
  }
}
