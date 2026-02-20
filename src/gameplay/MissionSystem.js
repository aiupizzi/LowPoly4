const ARCHETYPES = ['destroy', 'escape', 'checkpoint'];

export class MissionSystem {
  constructor({ heatSystem, vehicleController, policeAgent, chunkManager, weaponSystem, hud, eventBus, state = {} }) {
    this.heatSystem = heatSystem;
    this.vehicleController = vehicleController;
    this.policeAgent = policeAgent;
    this.chunkManager = chunkManager;
    this.weaponSystem = weaponSystem;
    this.hud = hud;
    this.eventBus = eventBus;

    this.tier = state.missionTier ?? 1;
    this.unlocks = {
      accelLevel: state.unlocks?.accelLevel ?? 0,
      durabilityLevel: state.unlocks?.durabilityLevel ?? 0,
      weaponCooldownLevel: state.unlocks?.weaponCooldownLevel ?? 0,
      heatConsumables: state.unlocks?.heatConsumables ?? 1
    };

    this.active = null;
    this.objective = 'Stand by';
    this.progress = '0%';
    this.reward = 0;
    this.failedReason = null;
    this.arrestTimer = 0;
    this.nextMissionDelay = 0;
    this.lastDestroyed = this.heatSystem.blocksDestroyed;
    this.reachedChunks = new Set();

    this.applyUnlocks();
    this.wallet = { spendMoney: () => false };
    this.bindProgressionKeys();
    this.startNextMission();
  }

  bindProgressionKeys() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (event.code === 'Digit1') this.purchaseUpgrade('accel', this.wallet.spendMoney);
      if (event.code === 'Digit2') this.purchaseUpgrade('weapon', this.wallet.spendMoney);
      if (event.code === 'Digit3') this.purchaseUpgrade('durability', this.wallet.spendMoney);
      if (event.code === 'Digit4') this.useHeatConsumable(this.wallet.spendMoney);
    });
  }

  applyUnlocks() {
    this.vehicleController.setAccelerationLevel(this.unlocks.accelLevel);
    this.vehicleController.setDurabilityLevel(this.unlocks.durabilityLevel);
    this.weaponSystem.setCooldownUpgradeLevel(this.unlocks.weaponCooldownLevel);
  }

  getState() {
    return {
      tier: this.tier,
      unlocks: { ...this.unlocks },
      active: this.active?.name ?? null,
      objective: this.objective,
      progress: this.progress,
      reward: this.reward,
      failedReason: this.failedReason,
      arrestTimer: this.arrestTimer
    };
  }


  getMissionTargetPOI(playerPosition) {
    if (!this.active || !playerPosition) return null;

    if (this.active.type === 'destroy') {
      const lm = this.chunkManager.getNearestLandmark(playerPosition);
      if (!lm) return null;
      return { id: 'mission-destroy', kind: 'mission', label: 'Mission: demolition zone', position: { x: lm.x, z: lm.z } };
    }

    if (this.active.type === 'escape') {
      const px = playerPosition.x;
      const pz = playerPosition.z;
      return { id: 'mission-escape', kind: 'mission', label: 'Mission: lose heat', position: { x: px - 36, z: pz - 36 } };
    }

    const chunk = this.chunkManager.activeChunk;
    const tx = (chunk.x + 2) * this.chunkManager.chunkSize + this.chunkManager.chunkSize * 0.5;
    const tz = (chunk.z + 1) * this.chunkManager.chunkSize + this.chunkManager.chunkSize * 0.5;
    return { id: 'mission-checkpoint', kind: 'mission', label: 'Mission checkpoint', position: { x: tx, z: tz } };
  }

  getSaveData() {
    return {
      missionTier: this.tier,
      unlocks: { ...this.unlocks }
    };
  }

  makeMission(archetype) {
    const scale = this.tier - 1;
    if (archetype === 'destroy') {
      const target = 10 + scale * 4;
      return { type: 'destroy', name: 'Urban Demolition', timer: 42, target, value: 0, reward: 120 + scale * 45 };
    }
    if (archetype === 'escape') {
      const heatThreshold = Math.min(4, 2 + Math.floor(scale / 2));
      return {
        type: 'escape',
        name: 'Cool Off',
        timer: 45,
        target: 10 + scale * 2,
        value: 0,
        triggerHeat: heatThreshold,
        reward: 150 + scale * 55,
        primed: false
      };
    }
    return {
      type: 'checkpoint',
      name: 'Checkpoint Sprint',
      timer: 50,
      target: 3 + Math.floor(scale / 2),
      value: 0,
      reward: 180 + scale * 60
    };
  }

  startNextMission() {
    const archetype = ARCHETYPES[(this.tier - 1) % ARCHETYPES.length];
    this.active = this.makeMission(archetype);
    this.objective = this.active.name;
    this.progress = '0%';
    this.reward = this.active.reward;
    this.failedReason = null;
    this.arrestTimer = 0;
    this.reachedChunks.clear();
    this.lastDestroyed = this.heatSystem.blocksDestroyed;
    this.toast(`Mission started: ${this.active.name}`);
    this.eventBus?.emit('mission:started', { tier: this.tier, name: this.active.name });
  }

  toast(message) {
    if (this.hud?.pushToast) this.hud.pushToast(message);
  }

  fail(reason) {
    this.failedReason = reason;
    this.eventBus?.emit('mission:failed', { reason, tier: this.tier });
    this.toast(`Mission failed: ${reason}`);
    this.nextMissionDelay = 3;
    this.active = null;
  }

  complete() {
    this.toast(`Mission complete +$${this.reward}`);
    this.eventBus?.emit('mission:completed', { tier: this.tier, reward: this.reward });
    this.nextMissionDelay = 2.5;
    this.active = null;
    this.tier += 1;
  }

  setWallet(wallet) {
    this.wallet = wallet;
  }

  update(delta, { addMoney }) {
    if (this.vehicleController.health <= 0 && this.active) {
      this.fail('Vehicle disabled');
    }

    const highHeatNearby = this.heatSystem.heat >= 4 && this.policeAgent.closestDistance < 10;
    this.arrestTimer = highHeatNearby ? this.arrestTimer + delta : Math.max(0, this.arrestTimer - delta * 0.75);
    if (this.arrestTimer >= 6 && this.active) {
      this.fail('Arrested by nearby police');
    }

    if (!this.active) {
      if (this.nextMissionDelay > 0) {
        this.nextMissionDelay -= delta;
        if (this.nextMissionDelay <= 0) {
          this.vehicleController.repairFull();
          this.startNextMission();
        }
      }
      return;
    }

    this.active.timer -= delta;
    if (this.active.timer <= 0) {
      this.fail('Mission timer expired');
      return;
    }

    if (this.active.type === 'destroy') {
      const deltaDestroyed = this.heatSystem.blocksDestroyed - this.lastDestroyed;
      this.active.value = Math.max(0, this.active.value + deltaDestroyed);
      this.lastDestroyed = this.heatSystem.blocksDestroyed;
      const pct = Math.floor((this.active.value / this.active.target) * 100);
      this.objective = `Destroy ${this.active.target} voxels in time`;
      this.progress = `${Math.min(this.active.value, this.active.target)}/${this.active.target} (${Math.min(100, pct)}%)`;
      if (this.active.value >= this.active.target) {
        addMoney(this.reward);
        this.complete();
      }
      return;
    }

    if (this.active.type === 'escape') {
      if (this.heatSystem.heat >= this.active.triggerHeat) this.active.primed = true;
      if (this.active.primed && this.heatSystem.heat < this.active.triggerHeat) {
        this.active.value += delta;
      } else if (this.active.primed) {
        this.active.value = Math.max(0, this.active.value - delta * 0.4);
      }
      const pct = Math.floor((this.active.value / this.active.target) * 100);
      this.objective = `Drop below heat ${this.active.triggerHeat} for ${this.active.target.toFixed(0)}s`;
      this.progress = `${this.active.value.toFixed(1)}s/${this.active.target.toFixed(0)}s (${Math.min(100, pct)}%)`;
      if (this.active.value >= this.active.target) {
        addMoney(this.reward);
        this.complete();
      }
      return;
    }

    const chunk = this.chunkManager.activeChunk;
    const key = `${chunk.x}:${chunk.z}`;
    const underPursuit = this.heatSystem.heat >= 2 && this.policeAgent.closestDistance < 18;
    if (underPursuit) this.reachedChunks.add(key);
    this.active.value = this.reachedChunks.size;
    const pct = Math.floor((this.active.value / this.active.target) * 100);
    this.objective = `Reach ${this.active.target} chunks while pursued`;
    this.progress = `${Math.min(this.active.value, this.active.target)}/${this.active.target} (${Math.min(100, pct)}%)`;
    if (this.active.value >= this.active.target) {
      addMoney(this.reward);
      this.complete();
    }
  }

  purchaseUpgrade(type, spendMoney = () => false) {
    if (type === 'accel') {
      const cost = 180 + this.unlocks.accelLevel * 120;
      if (!spendMoney(cost)) return this.toast(`Need $${cost} for accel upgrade`);
      this.unlocks.accelLevel += 1;
      this.applyUnlocks();
      this.toast(`Acceleration upgraded to Lv.${this.unlocks.accelLevel}`);
      return;
    }


    if (type === 'durability') {
      const cost = 200 + this.unlocks.durabilityLevel * 150;
      if (!spendMoney(cost)) return this.toast(`Need $${cost} for durability upgrade`);
      this.unlocks.durabilityLevel += 1;
      this.applyUnlocks();
      this.vehicleController.repairFull();
      this.toast(`Durability upgraded to Lv.${this.unlocks.durabilityLevel}`);
      return;
    }

    if (type === 'weapon') {
      const cost = 220 + this.unlocks.weaponCooldownLevel * 130;
      if (!spendMoney(cost)) return this.toast(`Need $${cost} for cooldown upgrade`);
      this.unlocks.weaponCooldownLevel += 1;
      this.applyUnlocks();
      this.toast(`Weapon cooldown upgraded to Lv.${this.unlocks.weaponCooldownLevel}`);
    }
  }

  useHeatConsumable(spendMoney = () => false) {
    if (this.unlocks.heatConsumables <= 0) {
      const cost = 140;
      if (!spendMoney(cost)) {
        this.toast(`Need $${cost} for heat reducer`);
        return;
      }
      this.unlocks.heatConsumables += 1;
      this.toast('Bought a heat reducer');
    }

    this.unlocks.heatConsumables -= 1;
    this.heatSystem.triggerHeatReduction(8, 0.85);
    this.toast('Used heat reducer');
  }
}
