export class HeatSystem {
  constructor(vehicleController) {
    this.vehicleController = vehicleController;
    this.heat = 0;
    this.blocksDestroyed = 0;
  }

  reportDestruction(count = 1) {
    this.blocksDestroyed += count;
    this.heat = Math.min(5, this.heat + 1);
  }

  update(delta) {
    if (this.vehicleController.speed > 35) {
      this.heat = Math.min(5, this.heat + delta * 0.25);
    } else {
      this.heat = Math.max(0, this.heat - delta * 0.08);
    }
    this.heat = Math.round(this.heat);
  }
}
