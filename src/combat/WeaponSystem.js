import * as THREE from 'three';

export class WeaponSystem {
  constructor({ camera, scene, chunkManager, heatSystem, explosionSystem }) {
    this.camera = camera;
    this.scene = scene;
    this.chunkManager = chunkManager;
    this.heatSystem = heatSystem;
    this.explosionSystem = explosionSystem;
    this.cooldown = 0;
    this.raycaster = new THREE.Raycaster();

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.shoot();
      if (e.button === 2) this.altFire();
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  shoot() {
    if (this.cooldown > 0) return;
    this.cooldown = 0.08;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const voxel = this.chunkManager.raycastVoxel(this.raycaster);
    if (!voxel) return;
    const removed = this.chunkManager.removeVoxelAt(voxel.x, voxel.y, voxel.z);
    if (removed) this.heatSystem.reportDestruction(1);
  }

  altFire() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const voxel = this.chunkManager.raycastVoxel(this.raycaster);
    if (!voxel) return;
    this.explosionSystem.explode(new THREE.Vector3(voxel.x, voxel.y, voxel.z), 4, 140);
    this.heatSystem.reportDestruction(2);
  }

  update(delta) {
    this.cooldown = Math.max(0, this.cooldown - delta);
  }
}
