export class TutorialSystem {
  constructor({ hud, eventBus, completed = false, onComplete }) {
    this.hud = hud;
    this.eventBus = eventBus;
    this.onComplete = onComplete;
    this.completed = completed;
    this.step = 0;
    this.steps = [
      { text: 'Tutorial 1/4: Drive with forward/left/right and brake.', done: () => this.moved && this.turned && this.braked },
      { text: 'Tutorial 2/4: Shoot a voxel (primary fire).', done: () => this.shot },
      { text: 'Tutorial 3/4: Escape heat by staying fast or using distance.', done: () => this.escapedHeat },
      { text: 'Tutorial 4/4: Use alt-fire explosion to clear space.', done: () => this.exploded }
    ];
    if (this.completed) return;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW' || e.code === 'KeyS') this.moved = true;
      if (e.code === 'KeyA' || e.code === 'KeyD') this.turned = true;
      if (e.code === 'Space') this.braked = true;
    });

    this.eventBus?.on('weapon:hit', () => { this.shot = true; });
    this.eventBus?.on('explosion:detonated', () => { this.exploded = true; });
  }

  update({ heat }) {
    if (this.completed) return;
    if (this.step >= 2 && heat <= 1) this.escapedHeat = true;

    while (this.step < this.steps.length && this.steps[this.step].done()) {
      this.step += 1;
      if (this.step >= this.steps.length) {
        this.completed = true;
        this.hud.setTutorial(null);
        this.onComplete?.();
        return;
      }
    }

    this.hud.setTutorial(this.steps[this.step]?.text || null);
  }
}
