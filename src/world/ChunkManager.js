const CHUNK_SIZE = 16;

export class ChunkManager {
  constructor({ viewRadius = 2, verticalSlices = [-1, 0, 1], createChunk, disposeChunk }) {
    this.viewRadius = viewRadius;
    this.verticalSlices = verticalSlices;
    this.createChunk = createChunk;
    this.disposeChunk = disposeChunk;
    this.activeChunks = new Map();
    this.playerChunk = { x: 0, z: 0 };
  }

  static chunkCoord(value) {
    return Math.floor(value / CHUNK_SIZE);
  }

  static chunkKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  update(playerPosition) {
    const cx = ChunkManager.chunkCoord(playerPosition.x);
    const cz = ChunkManager.chunkCoord(playerPosition.z);
    if (cx === this.playerChunk.x && cz === this.playerChunk.z && this.activeChunks.size > 0) {
      return { spawned: [], despawned: [] };
    }
    this.playerChunk = { x: cx, z: cz };

    const desired = new Set();
    for (let dx = -this.viewRadius; dx <= this.viewRadius; dx++) {
      for (let dz = -this.viewRadius; dz <= this.viewRadius; dz++) {
        for (const y of this.verticalSlices) {
          desired.add(ChunkManager.chunkKey(cx + dx, y, cz + dz));
        }
      }
    }

    const spawned = [];
    const despawned = [];

    for (const key of desired) {
      if (!this.activeChunks.has(key)) {
        const [x, y, z] = key.split(',').map(Number);
        const chunk = this.createChunk({ x, y, z, size: CHUNK_SIZE });
        this.activeChunks.set(key, chunk);
        spawned.push(chunk);
      }
    }

    for (const [key, chunk] of [...this.activeChunks.entries()]) {
      if (!desired.has(key)) {
        this.disposeChunk?.(chunk);
        this.activeChunks.delete(key);
        despawned.push(chunk);
      }
    }

    return { spawned, despawned };
  }
}

export class InstancedVoxelRenderer {
  constructor({ maxInstances = 50000, three }) {
    this.three = three;
    this.geometry = new three.BoxGeometry(1, 1, 1);
    this.material = new three.MeshStandardMaterial({ color: 0x7fffd4 });
    this.mesh = new three.InstancedMesh(this.geometry, this.material, maxInstances);
    this.count = 0;
  }

  setInstances(voxels) {
    const mat = new this.three.Matrix4();
    let i = 0;
    for (const voxel of voxels) {
      mat.makeTranslation(voxel.x, voxel.y, voxel.z);
      this.mesh.setMatrixAt(i, mat);
      i += 1;
    }
    this.mesh.count = i;
    this.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export { CHUNK_SIZE };
