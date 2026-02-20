export class WeaponSystem {
  constructor({ raycaster, camera, scene, removeVoxel, onShatter, state }) {
    this.raycaster = raycaster;
    this.camera = camera;
    this.scene = scene;
    this.removeVoxel = removeVoxel;
    this.onShatter = onShatter;
    this.state = state;
  }

  fire() {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    const hit = hits.find((h) => h.object.userData?.voxel);
    if (!hit) return false;

    const voxel = hit.object.userData.voxel;
    this.removeVoxel(voxel.position);
    this.state.blocksDestroyed += 1;
    this.state.currency += voxel.value || 1;
    this.onShatter?.({ position: voxel.position, normal: hit.face?.normal });
    return true;
  }
}
