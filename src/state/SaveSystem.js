const DEFAULT_SAVE = {
  position: { x: 0, y: 3, z: 0 },
  money: 0,
  missionTier: 1,
  unlocks: {
    accelLevel: 0,
    durabilityLevel: 0,
    weaponCooldownLevel: 0,
    heatConsumables: 1
  },
  worldMeta: {
    visitedChunks: [],
    discoveredLandmarks: []
  }
};

export class SaveSystem {
  constructor(key = 'lowpoly4-save') {
    this.key = key;
  }

  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  load() {
    const raw = localStorage.getItem(this.key);
    if (!raw) return structuredClone(DEFAULT_SAVE);

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      position: { ...DEFAULT_SAVE.position, ...(parsed.position || {}) },
      unlocks: { ...DEFAULT_SAVE.unlocks, ...(parsed.unlocks || {}) },
      worldMeta: { ...DEFAULT_SAVE.worldMeta, ...(parsed.worldMeta || {}) }
    };
  }
}
