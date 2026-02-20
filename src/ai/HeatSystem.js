export class HeatSystem {
  constructor(vehicleController) {
    this.vehicleController = vehicleController;
    this.heat = 0;
    this.blocksDestroyed = 0;
    this.heatReductionBuff = { timer: 0, rate: 0 };
  }

  reportDestruction(count = 1) {
    this.blocksDestroyed += count;
    this.heat = Math.min(5, this.heat + 1);
  }

  triggerHeatReduction(duration = 8, rate = 0.75) {
    this.heatReductionBuff.timer = Math.max(this.heatReductionBuff.timer, duration);
    this.heatReductionBuff.rate = Math.max(this.heatReductionBuff.rate, rate);
  }

  update(delta) {
    if (this.vehicleController.speed > 35) {
      this.heat = Math.min(5, this.heat + delta * 0.25);
    } else {
      this.heat = Math.max(0, this.heat - delta * 0.08);
    }

    if (this.heatReductionBuff.timer > 0) {
      this.heat = Math.max(0, this.heat - delta * this.heatReductionBuff.rate);
      this.heatReductionBuff.timer = Math.max(0, this.heatReductionBuff.timer - delta);
      if (this.heatReductionBuff.timer === 0) this.heatReductionBuff.rate = 0;
    }

    this.heat = Math.round(this.heat);
  }
}
