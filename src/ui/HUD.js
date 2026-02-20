export class HUD {
  constructor(root) {
    this.root = root;
    this.element = document.createElement('div');
    this.toastElement = document.createElement('div');
    this.toasts = [];

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
      minWidth: '240px'
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

  update({ heat, speed, blocksDestroyed, money, mission, failState, delta = 0 }) {
    if (delta > 0 && this.toasts.length) {
      this.toasts = this.toasts
        .map((toast) => ({ ...toast, ttl: toast.ttl - delta }))
        .filter((toast) => toast.ttl > 0);
      this.renderToasts();
    }

    const stars = '★'.repeat(heat) + '☆'.repeat(Math.max(0, 5 - heat));
    const missionName = mission?.active ?? 'None';
    const missionObjective = mission?.objective ?? 'No active objective';
    const missionProgress = mission?.progress ?? '-';
    const missionReward = mission?.reward ?? 0;
    const missionTier = mission?.tier ?? 1;
    const failLabel = failState?.failedReason ? `FAIL: ${failState.failedReason}` : 'FAIL: none';
    const arrestTime = failState?.arrestTimer != null ? failState.arrestTimer.toFixed(1) : '0.0';

    this.element.innerHTML = [
      `SPD: ${speed.toFixed(1)} MPH`,
      `HEAT: ${stars}`,
      `HP: ${Math.max(0, failState?.health ?? 0).toFixed(0)}`,
      `BLOCKS: ${blocksDestroyed}`,
      `CREDITS: $${money}`,
      `MISSION T${missionTier}: ${missionName}`,
      `OBJ: ${missionObjective}`,
      `PROG: ${missionProgress} | REWARD: $${missionReward}`,
      `${failLabel} | ARREST ${arrestTime}s`,
      `UPGRADES [1]ACC [2]WPN [3]ARMOR [4]COOLER`
    ].join('<br>');
  }
}
