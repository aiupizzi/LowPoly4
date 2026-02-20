export class AudioSystem {
  constructor({ eventBus, hooks = {} } = {}) {
    this.eventBus = eventBus;
    this.hooks = {
      shoot: hooks.shoot ?? (() => {}),
      explosion: hooks.explosion ?? (() => {}),
      siren: hooks.siren ?? (() => {}),
      collision: hooks.collision ?? (() => {})
    };

    this.bindEvents();
  }

  bindEvents() {
    if (!this.eventBus) return;

    this.eventBus.on('weapon:shoot', () => this.play('shoot'));
    this.eventBus.on('explosion:detonated', () => this.play('explosion'));
    this.eventBus.on('police:proximity', ({ distance }) => {
      if (distance < 22) this.play('siren', { distance });
    });
    this.eventBus.on('vehicle:collision', ({ intensity }) => this.play('collision', { intensity }));
  }

  play(type, payload = {}) {
    const hook = this.hooks[type];
    if (hook) hook(payload);
  }
}
