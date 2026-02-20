import * as THREE from 'three';

export class FeedbackSystem {
  constructor({ camera, root, eventBus }) {
    this.camera = camera;
    this.root = root;
    this.eventBus = eventBus;

    this.hitMarkerTTL = 0;
    this.shakePower = 0;
    this.lowHealthPulse = 0;
    this.criticalHeatPulse = 0;

    this.hitMarker = document.createElement('div');
    this.screenOverlay = document.createElement('div');
    this.setupElements();
    this.bindEvents();
  }

  setupElements() {
    Object.assign(this.hitMarker.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#ffffff',
      fontSize: '28px',
      fontFamily: 'monospace',
      textShadow: '0 0 8px rgba(255,255,255,0.8)',
      opacity: '0',
      pointerEvents: 'none',
      userSelect: 'none'
    });
    this.hitMarker.textContent = '✚';

    Object.assign(this.screenOverlay.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      background: 'radial-gradient(circle at center, rgba(255,0,0,0), rgba(255,0,0,0))',
      mixBlendMode: 'screen'
    });

    this.root.appendChild(this.screenOverlay);
    this.root.appendChild(this.hitMarker);
  }

  bindEvents() {
    if (!this.eventBus) return;

    this.eventBus.on('weapon:hit', () => {
      this.hitMarkerTTL = 0.12;
    });

    this.eventBus.on('explosion:detonated', ({ radius = 4, force = 120 }) => {
      const localShake = Math.min(0.6, 0.08 + radius * 0.04 + force * 0.001);
      this.shakePower = Math.min(1.1, this.shakePower + localShake);
    });

    this.eventBus.on('vehicle:collision', ({ intensity = 0 }) => {
      this.shakePower = Math.min(1.1, this.shakePower + Math.min(0.45, intensity * 0.35));
    });

    this.eventBus.on('feedback:shake', ({ intensity = 0 }) => {
      this.shakePower = Math.min(1.1, this.shakePower + intensity);
    });
  }

  update(delta, { health = 100, maxHealth = 100, heat = 0 } = {}) {
    this.hitMarkerTTL = Math.max(0, this.hitMarkerTTL - delta);
    this.hitMarker.style.opacity = this.hitMarkerTTL > 0 ? '1' : '0';

    const healthRatio = maxHealth > 0 ? health / maxHealth : 1;
    const lowHealth = healthRatio < 0.35;
    const criticalHeat = heat >= 4;

    this.lowHealthPulse += delta * (lowHealth ? 8 : 2.5);
    this.criticalHeatPulse += delta * (criticalHeat ? 5 : 1.5);

    const healthIntensity = lowHealth ? 0.2 + Math.sin(this.lowHealthPulse) * 0.08 : 0;
    const heatIntensity = criticalHeat ? 0.14 + Math.sin(this.criticalHeatPulse) * 0.05 : 0;
    const red = Math.max(0, healthIntensity + heatIntensity);

    this.screenOverlay.style.background = `radial-gradient(circle at center, rgba(255,64,64,0), rgba(255,44,44,${red.toFixed(3)}))`;

    if (this.shakePower > 0.001) {
      const shake = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakePower,
        (Math.random() - 0.5) * this.shakePower,
        (Math.random() - 0.5) * this.shakePower * 0.3
      );
      this.camera.position.add(shake);
      this.shakePower = Math.max(0, this.shakePower - delta * 3.5);
    }
  }
}
