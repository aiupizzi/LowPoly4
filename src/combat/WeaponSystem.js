import * as THREE from 'three';
import { GAME_BALANCE, getCurveValue } from '../config/gameBalance.js';

export class WeaponSystem {
  constructor({ camera, scene, chunkManager, heatSystem, explosionSystem, eventBus, settings = {} }) {
    this.camera = camera;
    this.scene = scene;
    this.chunkManager = chunkManager;
    this.heatSystem = heatSystem;
    this.explosionSystem = explosionSystem;
    this.eventBus = eventBus;
    this.cooldown = 0;
    this.cooldownScale = 1;
    this.raycaster = new THREE.Raycaster();
    this.keybindings = {
      shoot: 'MouseLeft',
      altFire: 'MouseRight',
      ...(settings.keybindings || {})
    };

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.keybindings.shoot === 'MouseLeft') this.shoot();
      if (e.button === 2 && this.keybindings.altFire === 'MouseRight') this.altFire();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === this.keybindings.shoot) this.shoot();
      if (e.code === this.keybindings.altFire) this.altFire();
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setControlSettings({ keybindings } = {}) {
    if (keybindings) this.keybindings = { ...this.keybindings, ...keybindings };
  }

  shoot() {
    if (this.cooldown > 0) return;
    this.cooldown = 0.08 * this.cooldownScale;
    this.eventBus?.emit('weapon:shoot');

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const voxel = this.chunkManager.raycastVoxel(this.raycaster);
    if (!voxel) {
      this.eventBus?.emit('weapon:miss');
      return;
    }

    const removed = this.chunkManager.removeVoxelAt(voxel.x, voxel.y, voxel.z);
    if (removed) {
      this.eventBus?.emit('weapon:hit', { position: { x: voxel.x, y: voxel.y, z: voxel.z }, destroyed: 1 });
      this.eventBus?.emit('world:voxelDestroyed', { source: 'weapon', count: 1, position: { x: voxel.x, y: voxel.y, z: voxel.z } });
    }
  }

  altFire() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const voxel = this.chunkManager.raycastVoxel(this.raycaster);
    if (!voxel) return;

    const center = new THREE.Vector3(voxel.x, voxel.y, voxel.z);
    const heatLevel = this.heatSystem?.heat ?? 0;
    this.eventBus?.emit('weapon:shoot', { alt: true });
    this.explosionSystem.explode(
      center,
      getCurveValue(GAME_BALANCE.explosion.radiusByHeat, heatLevel),
      getCurveValue(GAME_BALANCE.explosion.forceByHeat, heatLevel)
    );
  }

  update(delta) {
    this.cooldown = Math.max(0, this.cooldown - delta);
  }

  setCooldownUpgradeLevel(level = 0) {
    this.cooldownScale = Math.max(0.45, 1 - level * 0.12);
  }
}
