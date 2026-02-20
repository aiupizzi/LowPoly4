export class HeatSystem {
  constructor(vehicleController) {
    this.vehicleController = vehicleController;
    this.heat = 0;
  }

  update(delta) {
    const movingFast = this.vehicleController.speed > 8;
    const rate = movingFast ? 4 : -2;
    this.heat = Math.min(100, Math.max(0, this.heat + rate * delta));
  }
}
