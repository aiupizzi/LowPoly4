export class ChunkManager {
  constructor() {
    this.activeChunk = { x: 0, z: 0 };
    this.chunkSize = 64;
  }

  update(position) {
    this.activeChunk = {
      x: Math.floor(position.x / this.chunkSize),
      z: Math.floor(position.z / this.chunkSize)
    };
  }
}
