export const GAME_BALANCE = {
  heat: {
    maxHeat: 5,
    passiveGainSpeedThreshold: 35,
    gainPerDestruction: [0.45, 0.5, 0.58, 0.64, 0.72, 0.8],
    passiveGainPerSecond: [0.12, 0.16, 0.21, 0.26, 0.32, 0.4],
    decayPerSecond: [0.2, 0.16, 0.12, 0.09, 0.07, 0.05]
  },
  police: {
    desiredUnitsByHeat: [0, 2, 3, 5, 6, 8],
    spawnRateByHeat: [0.1, 0.55, 0.85, 1.2, 1.45, 1.75],
    aggressionByHeat: [0.6, 0.72, 0.86, 1, 1.16, 1.3],
    blockadeCooldownByHeat: [8, 6, 5.5, 5, 4.4, 3.8]
  },
  vehicle: {
    torqueByHeat: [620, 590, 550, 520, 500, 470],
    brakingByHeat: [16, 15.5, 15, 14.5, 14, 13.5],
    steeringSensitivityByHeat: [1, 1, 0.96, 0.93, 0.9, 0.86]
  },
  explosion: {
    radiusByHeat: [3.8, 4.2, 4.5, 4.8, 5.1, 5.4],
    forceByHeat: [120, 132, 145, 158, 172, 188]
  }
};

export function getCurveValue(curve, level = 0) {
  const index = Math.max(0, Math.min(curve.length - 1, Math.round(level)));
  return curve[index];
}
