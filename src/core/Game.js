export class Game {
  constructor({ scene, camera, renderer, world, player, vehicleController, heatSystem, policeAgent, weaponSystem, explosionSystem, particlePool, postFX, hud, saveSystem, chunkManager, building }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
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

    this.clock = 0;
    this.running = false;
    this.lastTime = performance.now();

    this.boundTick = this.tick.bind(this);
    this.saveSystem.load();
  }

  start() {
    this.running = true;
    requestAnimationFrame(this.boundTick);
  }

  stop() {
    this.running = false;
  }

  tick(now) {
    if (!this.running) return;

    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.clock += delta;

    this.world.update(delta);
    this.chunkManager.update(this.player.position);
    this.player.update(delta);
    this.vehicleController.update(delta);
    this.heatSystem.update(delta);
    this.policeAgent.update(delta, this.player.position);
    this.weaponSystem.update(delta);
    this.explosionSystem.update(delta);
    this.particlePool.update(delta);
    this.postFX.render(delta);

    this.hud.update({
      fps: Math.round(1 / Math.max(delta, 0.0001)),
      heat: this.heatSystem.heat,
      speed: this.vehicleController.speed,
      time: this.clock
    });

    requestAnimationFrame(this.boundTick);
  }
}
