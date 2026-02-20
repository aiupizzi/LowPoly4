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
    feedbackSystem,
    pickupSystem,
    tutorialSystem,
    pauseMenu
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
    this.pickupSystem = pickupSystem;
    this.tutorialSystem = tutorialSystem;
    this.pauseMenu = pauseMenu;

    this.running = false;
    this.paused = false;
    this.lastTime = performance.now();
    this.money = 0;
    this.score = 0;
    this.lastBlocksDestroyed = 0;

    this.combo = { chain: 0, timer: 0, multiplier: 1, window: 3.5 };
    this.telemetry = { sessionLength: 0, deaths: 0, arrests: 0, missionSuccess: 0, missionAttempts: 0, missionSuccessRate: 0 };

    const save = this.saveSystem.load();
    this.chunkManager.hydratePersistenceData(save.worldMeta || {});
    this.player.position.set(save.position?.x ?? 0, save.position?.y ?? 3, save.position?.z ?? 0);
    this.money = save.money ?? 0;
    this.lastBlocksDestroyed = this.heatSystem.blocksDestroyed;

    this.missionSystem.setWallet({
      spendMoney: (amount) => this.spendMoney(amount)
    });

    this.pickupSystem?.eventBus?.on('world:voxelDestroyed', ({ count = 0 }) => {
      if (count > 0) this.heatSystem.reportDestruction(count);
    });

    this.pickupSystem?.eventBus?.on('world:voxelDestroyed', ({ count = 0 }) => {
      if (count <= 0) return;
      this.combo.chain += count;
      this.combo.timer = this.combo.window;
      this.combo.multiplier = Math.min(4, 1 + Math.floor(this.combo.chain / 6) * 0.35);
    });

    this.pickupSystem?.eventBus?.on('vehicle:disabled', () => {
      this.telemetry.deaths += 1;
    });
    this.pickupSystem?.eventBus?.on('mission:started', () => {
      this.telemetry.missionAttempts += 1;
      this.updateMissionSuccessRate();
    });
    this.pickupSystem?.eventBus?.on('mission:completed', () => {
      this.telemetry.missionSuccess += 1;
      this.updateMissionSuccessRate();
    });
    this.pickupSystem?.eventBus?.on('mission:failed', ({ reason }) => {
      if ((reason || '').includes('Arrested')) this.telemetry.arrests += 1;
      this.updateMissionSuccessRate();
    });

    if (this.pauseMenu) {
      this.pauseMenu.onPauseChange = (paused) => {
        this.paused = paused;
      };
    }

    this.boundTick = this.tick.bind(this);
  }

  updateMissionSuccessRate() {
    const attempts = Math.max(1, this.telemetry.missionAttempts);
    this.telemetry.missionSuccessRate = Math.round((this.telemetry.missionSuccess / attempts) * 100);
  }

  addMoney(amount) {
    this.money += amount;
  }

  spendMoney(amount) {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  buildIndicators(playerPosition) {
    const pois = [
      ...this.chunkManager.getLandmarkPOIs(6).map((poi) => ({ ...poi, kind: 'landmark' })),
      ...(this.pickupSystem?.getPOIs(4) || []).map((poi) => ({ ...poi, kind: 'pickup' }))
    ];

    const missionTarget = this.missionSystem.getMissionTargetPOI(playerPosition);
    if (missionTarget) pois.unshift(missionTarget);

    const heading = this.vehicleController.mesh?.rotation?.y || 0;
    return pois
      .map((poi) => {
        const dx = poi.position.x - playerPosition.x;
        const dz = poi.position.z - playerPosition.z;
        const distance = Math.hypot(dx, dz);
        const worldAngle = Math.atan2(dx, dz);
        const direction = worldAngle - heading;
        return { ...poi, distance, direction };
      })
      .filter((item) => item.distance < 220)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }

  start() {
    this.running = true;
    requestAnimationFrame(this.boundTick);
    setInterval(() => {
      this.saveSystem.save({
        position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
        money: this.money,
        worldMeta: this.chunkManager.getPersistenceData(),
        settings: {
          steeringSensitivity: this.vehicleController.userSteeringSensitivity,
          keybindings: {
            ...this.vehicleController.keybindings,
            shoot: this.weaponSystem.keybindings.shoot,
            altFire: this.weaponSystem.keybindings.altFire
          }
        },
        onboarding: {
          tutorialCompleted: this.tutorialSystem?.completed ?? false
        },
        ...this.missionSystem.getSaveData()
      });
    }, 2000);
  }

  tick(now) {
    if (!this.running) return;

    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.paused) {
      requestAnimationFrame(this.boundTick);
      return;
    }

    this.telemetry.sessionLength += delta;
    this.combo.timer = Math.max(0, this.combo.timer - delta);
    if (this.combo.timer === 0) {
      this.combo.chain = 0;
      this.combo.multiplier = 1;
    }

    this.world.update(delta);
    this.vehicleController.update(delta);
    this.player.update(delta);
    this.chunkManager.update(this.player.position);
    this.heatSystem.update(delta);
    this.policeAgent.update(delta, this.player.position);
    this.weaponSystem.update(delta);
    this.explosionSystem.update(delta);
    this.particlePool.update(delta);
    this.pickupSystem?.update(delta);

    const destroyedDelta = this.heatSystem.blocksDestroyed - this.lastBlocksDestroyed;
    if (destroyedDelta > 0) {
      const payout = Math.round(destroyedDelta * this.combo.multiplier);
      this.addMoney(payout);
      this.score += payout;
      this.lastBlocksDestroyed = this.heatSystem.blocksDestroyed;
    }

    this.missionSystem.update(delta, {
      addMoney: (amount) => this.addMoney(amount)
    });

    this.tutorialSystem?.update({ heat: this.heatSystem.heat });

    const missionState = this.missionSystem.getState();
    this.hud.update({
      heat: Math.round(this.heatSystem.heat),
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
      indicators: this.buildIndicators(this.player.position),
      combo: this.combo,
      telemetry: this.telemetry,
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
