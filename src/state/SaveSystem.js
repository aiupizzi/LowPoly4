export class SaveSystem {
  constructor(key = 'lowpoly4-save') {
    this.key = key;
  }

  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  load() {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : { position: { x: 0, y: 3, z: 0 }, money: 0 };
  }
}
