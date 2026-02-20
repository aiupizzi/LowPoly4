const SAVE_KEY = 'lowpoly4.save.v1';

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

export class GameState {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.player = { x: 0, y: 3, z: 0 };
    this.money = 0;
    this.blocksDestroyed = 0;
  }

  load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.player) return false;
      const { x, y, z } = parsed.player;
      if (![x, y, z].every(isFiniteNumber) || !isFiniteNumber(parsed.money)) return false;
      this.player = { x, y, z };
      this.money = Math.max(0, Math.floor(parsed.money));
      return true;
    } catch {
      return false;
    }
  }

  save() {
    const payload = {
      player: this.player,
      money: this.money,
    };
    this.storage?.setItem(SAVE_KEY, JSON.stringify(payload));
  }
}
