export class Building {
  constructor(chunkManager) {
    this.chunkManager = chunkManager;
  }

  destroyVoxel(x, y, z) {
    return this.chunkManager.removeVoxelAt(x, y, z, { causeDynamic: true });
  }
}
