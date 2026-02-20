export class HUD {
  constructor(root, eventBus) {
    this.root = root;
    this.eventBus = eventBus;
    this.element = document.createElement('div');
    this.toastElement = document.createElement('div');
    this.toasts = [];
    this.collisionWarningTTL = 0;

    Object.assign(this.element.style, {
      position: 'absolute',
      top: '16px',
      left: '16px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: 'rgba(0,0,0,0.45)',
      fontSize: '12px',
      color: '#d8ecff',
      lineHeight: '1.5',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      minWidth: '300px'
    });

    Object.assign(this.toastElement.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '280px',
      pointerEvents: 'none',
      fontFamily: 'monospace'
    });

    this.root.appendChild(this.element);
    this.root.appendChild(this.toastElement);

    this.eventBus?.on('vehicle:collision', ({ intensity = 0 }) => {
      if (intensity > 0.2) this.collisionWarningTTL = 1.2;
    });

    this.update({ heat: 0, speed: 0, blocksDestroyed: 0, money: 0, mission: null, failState: null });
  }

  pushToast(message) {
    this.toasts.unshift({ message, ttl: 4 });
    this.toasts = this.toasts.slice(0, 4);
    this.renderToasts();
  }

  renderToasts() {
    this.toastElement.innerHTML = this.toasts
      .map((toast) => `<div style="padding:8px 10px;border-radius:8px;background:rgba(16,25,34,0.82);color:#d8ecff;border:1px solid rgba(130,180,255,0.3)">${toast.message}</div>`)
      .join('');
  }

  update({ heat, speed, blocksDestroyed, money, mission, failState, delta = 0, vehicleHealth = 0, maxVehicleHealth = 100, policeDistance = Infinity }) {
    if (delta > 0 && this.toasts.length) {
      this.toasts = this.toasts
        .map((toast) => ({ ...toast, ttl: toast.ttl - delta }))
        .filter((toast) => toast.ttl > 0);
      this.renderToasts();
    }

    this.collisionWarningTTL = Math.max(0, this.collisionWarningTTL - delta);

    const stars = '★'.repeat(heat) + '☆'.repeat(Math.max(0, 5 - heat));
    const missionName = mission?.active ?? 'None';
    const missionObjective = mission?.objective ?? 'No active objective';
    const missionProgress = mission?.progress ?? '-';
    const missionReward = mission?.reward ?? 0;
    const missionTier = mission?.tier ?? 1;
    const failLabel = failState?.failedReason ? `FAIL: ${failState.failedReason}` : 'FAIL: none';
    const arrestTime = failState?.arrestTimer != null ? failState.arrestTimer.toFixed(1) : '0.0';

    const healthRatio = maxVehicleHealth > 0 ? Math.max(0, Math.min(1, vehicleHealth / maxVehicleHealth)) : 0;
    const healthColor = healthRatio < 0.3 ? '#ff6161' : healthRatio < 0.55 ? '#ffd25f' : '#70f0a1';
    const missionText = missionName === 'None' ? 'Idle - awaiting mission' : `${missionName}: ${missionObjective}`;

    const policeWarning = Number.isFinite(policeDistance)
      ? policeDistance < 12
        ? `POLICE: DANGER (${policeDistance.toFixed(1)}m)`
        : policeDistance < 28
          ? `POLICE: Nearby (${policeDistance.toFixed(1)}m)`
          : `POLICE: Tracking (${policeDistance.toFixed(1)}m)`
      : 'POLICE: none';

    this.element.innerHTML = [
      `SPD: ${speed.toFixed(1)} MPH`,
      `HEAT: ${stars}`,
      `VEH HP: ${Math.max(0, vehicleHealth).toFixed(0)} / ${maxVehicleHealth.toFixed(0)}`,
      `<div style="margin:2px 0 6px;height:8px;border:1px solid rgba(255,255,255,0.2);border-radius:999px;overflow:hidden;background:rgba(0,0,0,0.45)"><div style="height:100%;width:${(healthRatio * 100).toFixed(1)}%;background:${healthColor};"></div></div>`,
      `MISSION T${missionTier}: ${missionText}`,
      `PROG: ${missionProgress} | REWARD: $${missionReward}`,
      `${policeWarning}`,
      `BLOCKS: ${blocksDestroyed} | CREDITS: $${money}`,
      `${failLabel} | ARREST ${arrestTime}s`,
      this.collisionWarningTTL > 0 ? '<span style="color:#ff8f8f">WARNING: HEAVY COLLISION</span>' : 'UPGRADES [1]ACC [2]WPN [3]ARMOR [4]COOLER'
    ].join('<br>');
  }
}
