export class Game {
  constructor({
    camera,
    world,
    player,
    vehicleController,
    heatSystem,
    policeAgent,
    weaponSystem,
    explosionSystem,
    particlePool,
    postFX,
    hud,
    saveSystem,
    chunkManager,
    building,
    missionSystem,
    feedbackSystem
  }) {
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
    this.missionSystem = missionSystem;
    this.feedbackSystem = feedbackSystem;

    this.running = false;
    this.lastTime = performance.now();
    this.money = 0;
    this.lastBlocksDestroyed = 0;

    const save = this.saveSystem.load();
    this.player.position.set(save.position?.x ?? 0, save.position?.y ?? 3, save.position?.z ?? 0);
    this.money = save.money ?? 0;
    this.lastBlocksDestroyed = this.heatSystem.blocksDestroyed;

    this.missionSystem.setWallet({
      spendMoney: (amount) => this.spendMoney(amount)
    });

    this.boundTick = this.tick.bind(this);
  }

  addMoney(amount) {
    this.money += amount;
  }

  spendMoney(amount) {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  start() {
    this.running = true;
    requestAnimationFrame(this.boundTick);
    setInterval(() => {
      this.saveSystem.save({
        position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
        money: this.money,
        ...this.missionSystem.getSaveData()
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

    const destroyedDelta = this.heatSystem.blocksDestroyed - this.lastBlocksDestroyed;
    if (destroyedDelta > 0) {
      this.addMoney(destroyedDelta);
      this.lastBlocksDestroyed = this.heatSystem.blocksDestroyed;
    }

    this.missionSystem.update(delta, {
      addMoney: (amount) => this.addMoney(amount)
    });

    const missionState = this.missionSystem.getState();
    this.hud.update({
      heat: this.heatSystem.heat,
      speed: this.vehicleController.speed,
      blocksDestroyed: this.heatSystem.blocksDestroyed,
      money: this.money,
      mission: missionState,
      failState: {
        failedReason: missionState.failedReason,
        arrestTimer: missionState.arrestTimer,
        health: this.vehicleController.health
      },
      vehicleHealth: this.vehicleController.health,
      maxVehicleHealth: this.vehicleController.maxHealth,
      policeDistance: this.policeAgent.closestDistance,
      delta
    });

    this.feedbackSystem?.update(delta, {
      health: this.vehicleController.health,
      maxHealth: this.vehicleController.maxHealth,
      heat: this.heatSystem.heat
    });

    this.postFX.render(delta);
    requestAnimationFrame(this.boundTick);
  }
}
