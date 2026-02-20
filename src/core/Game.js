export class Game {
  constructor({ camera, world, player, vehicleController, heatSystem, policeAgent, weaponSystem, explosionSystem, particlePool, postFX, hud, saveSystem, chunkManager, building }) {
    this.camera = camera;
    this.world = world;
    this.player = player;
    this.vehicleController = vehicleController;
    this.heatSystem = heatSystem;
    this.policeAgent = policeAgent;
    this.weaponSystem = weaponSystem;
    this.explosionSystem = explosionSystem;
    this.particlePool = particlePool;
    this.postFX = postFX;
    this.hud = hud;
    this.saveSystem = saveSystem;
    this.chunkManager = chunkManager;
    this.building = building;

    this.running = false;
    this.lastTime = performance.now();
    this.money = 0;

    const save = this.saveSystem.load();
    this.player.position.set(save.position?.x ?? 0, save.position?.y ?? 3, save.position?.z ?? 0);
    this.money = save.money ?? 0;

    this.boundTick = this.tick.bind(this);
  }

  start() {
    this.running = true;
    requestAnimationFrame(this.boundTick);
    setInterval(() => {
      this.saveSystem.save({
        position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
        money: this.money
      });
    }, 2000);
  }

  tick(now) {
    if (!this.running) return;

    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.world.update(delta);
    this.vehicleController.update(delta);
    this.player.update(delta);
    this.chunkManager.update(this.player.position);
    this.heatSystem.update(delta);
    this.policeAgent.update(delta, this.player.position);
    this.weaponSystem.update(delta);
    this.explosionSystem.update(delta);
    this.particlePool.update(delta);

    this.money = this.heatSystem.blocksDestroyed;
    this.hud.update({
      heat: this.heatSystem.heat,
      speed: this.vehicleController.speed,
      blocksDestroyed: this.heatSystem.blocksDestroyed,
      money: this.money
    });

    this.postFX.render(delta);
    requestAnimationFrame(this.boundTick);
  }
}
