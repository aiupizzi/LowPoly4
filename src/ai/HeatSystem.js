import { GAME_BALANCE, getCurveValue } from '../config/gameBalance.js';

export class HeatSystem {
  constructor(vehicleController) {
    this.vehicleController = vehicleController;
    this.heat = 0;
    this.blocksDestroyed = 0;
    this.heatReductionBuff = { timer: 0, rate: 0 };
  }

  reportDestruction(count = 1) {
    this.blocksDestroyed += count;
    const gain = getCurveValue(GAME_BALANCE.heat.gainPerDestruction, this.heat) * count;
    this.heat = Math.min(GAME_BALANCE.heat.maxHeat, this.heat + gain);
  }

  triggerHeatReduction(duration = 8, rate = 0.75) {
    this.heatReductionBuff.timer = Math.max(this.heatReductionBuff.timer, duration);
    this.heatReductionBuff.rate = Math.max(this.heatReductionBuff.rate, rate);
  }

  update(delta) {
    if (this.vehicleController.speed > GAME_BALANCE.heat.passiveGainSpeedThreshold) {
      this.heat = Math.min(GAME_BALANCE.heat.maxHeat, this.heat + delta * getCurveValue(GAME_BALANCE.heat.passiveGainPerSecond, this.heat));
    } else {
      this.heat = Math.max(0, this.heat - delta * getCurveValue(GAME_BALANCE.heat.decayPerSecond, this.heat));
    }

    if (this.heatReductionBuff.timer > 0) {
      this.heat = Math.max(0, this.heat - delta * this.heatReductionBuff.rate);
      this.heatReductionBuff.timer = Math.max(0, this.heatReductionBuff.timer - delta);
      if (this.heatReductionBuff.timer === 0) this.heatReductionBuff.rate = 0;
    }

    this.heat = Math.max(0, Math.min(GAME_BALANCE.heat.maxHeat, this.heat));
  }
}
