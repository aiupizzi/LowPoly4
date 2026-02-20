import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const CHUNK_SIZE = 16;
const RENDER_RADIUS = 2;
const DISTRICTS = [
  { name: 'industrial', densityBias: 0.08, heightScale: 1.25, minHeight: 3 },
  { name: 'midtown', densityBias: 0.02, heightScale: 1, minHeight: 2 },
  { name: 'residential', densityBias: -0.06, heightScale: 0.7, minHeight: 1 }
];

export class ChunkManager {
  constructor({ scene, world, particlePool }) {
    this.scene = scene;
    this.world = world;
    this.particlePool = particlePool;
    this.chunkSize = CHUNK_SIZE;
    this.activeChunk = { x: 0, z: 0 };
    this.chunks = new Map();
    this.dynamicVoxelEntities = [];
    this.voxelMap = new Map();
    this.landmarks = new Map();
    this.discoveredLandmarks = new Set();
    this.visitedChunks = new Set();

    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshStandardMaterial({ color: '#5f6570', flatShading: true });
    this.neonMaterial = new THREE.MeshStandardMaterial({ color: '#36f2ff', emissive: '#2499c2', emissiveIntensity: 1.4 });
    this.dummy = new THREE.Object3D();
  }

  chunkKey(x, z) {
    return `${x}:${z}`;
  }

  voxelKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  update(position) {
    const cx = Math.floor(position.x / this.chunkSize);
    const cz = Math.floor(position.z / this.chunkSize);
    this.activeChunk = { x: cx, z: cz };
    this.markChunkVisited(cx, cz);

    const wanted = new Set();
    for (let x = cx - RENDER_RADIUS; x <= cx + RENDER_RADIUS; x++) {
      for (let z = cz - RENDER_RADIUS; z <= cz + RENDER_RADIUS; z++) {
        const key = this.chunkKey(x, z);
        wanted.add(key);
        if (!this.chunks.has(key)) this.spawnChunk(x, z);
      }
    }

    for (const [key] of this.chunks) {
      if (!wanted.has(key)) this.despawnChunk(key);
    }

    for (const item of this.dynamicVoxelEntities) {
      item.mesh.position.copy(item.body.position);
      item.mesh.quaternion.copy(item.body.quaternion);
    }
  }

  markChunkVisited(chunkX, chunkZ) {
    this.visitedChunks.add(this.chunkKey(chunkX, chunkZ));
  }

  hash2(x, z) {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  getDistrict(chunkX, chunkZ) {
    const value = this.hash2(Math.floor(chunkX / 2), Math.floor(chunkZ / 2));
    if (value > 0.7) return DISTRICTS[0];
    if (value > 0.36) return DISTRICTS[1];
    return DISTRICTS[2];
  }

  getRoadWeight(worldX, worldZ) {
    const gridStep = 6;
    const modX = Math.abs(worldX % gridStep);
    const modZ = Math.abs(worldZ % gridStep);
    const distToRoad = Math.min(modX, gridStep - modX, modZ, gridStep - modZ);
    return Math.max(0, 1 - distToRoad / 1.1);
  }

  maybeCreateLandmark(chunkX, chunkZ, district) {
    const chunkDist = Math.abs(chunkX) + Math.abs(chunkZ);
    const spaced = chunkDist > 0 && chunkDist % 7 === 0;
    const deterministic = this.hash2(chunkX * 0.73, chunkZ * 1.31) > 0.72;
    if (!spaced || !deterministic) return null;

    const centerX = chunkX * this.chunkSize + this.chunkSize * 0.5;
    const centerZ = chunkZ * this.chunkSize + this.chunkSize * 0.5;
    const height = Math.round(12 + this.hash2(chunkX + 3.1, chunkZ + 1.2) * 10 + district.heightScale * 4);
    return {
      id: `lm-${chunkX}:${chunkZ}`,
      chunkKey: this.chunkKey(chunkX, chunkZ),
      x: centerX,
      z: centerZ,
      radius: 4,
      height,
      district: district.name,
      discovered: this.discoveredLandmarks.has(this.chunkKey(chunkX, chunkZ))
    };
  }

  spawnChunk(chunkX, chunkZ) {
    const voxels = [];
    const neonVoxels = [];
    const key = this.chunkKey(chunkX, chunkZ);
    const district = this.getDistrict(chunkX, chunkZ);
    const landmark = this.maybeCreateLandmark(chunkX, chunkZ, district);
    if (landmark) {
      landmark.discovered = true;
      this.landmarks.set(key, landmark);
      this.discoveredLandmarks.add(key);
    }

    for (let lx = 0; lx < this.chunkSize; lx++) {
      for (let lz = 0; lz < this.chunkSize; lz++) {
        const wx = chunkX * this.chunkSize + lx;
        const wz = chunkZ * this.chunkSize + lz;
        const seed = Math.abs(Math.sin(wx * 12.9898 + wz * 78.233));
        const roadWeight = this.getRoadWeight(wx, wz);
        if (roadWeight > 0.4) continue;

        const threshold = 0.74 - district.densityBias;
        if (seed < threshold) continue;

        let h = district.minHeight + Math.floor(seed * 10 * district.heightScale);

        if (landmark) {
          const dx = wx - landmark.x;
          const dz = wz - landmark.z;
          const dist = Math.hypot(dx, dz);
          if (dist < landmark.radius * 0.9) {
            h = landmark.height;
          } else if (dist < landmark.radius * 1.2) {
            h = Math.max(0, Math.floor(h * 0.4));
          }
        }

        for (let y = 0; y < h; y++) {
          const voxel = { x: wx, y, z: wz, neon: y === h - 1 && seed > 0.93 };
          voxels.push(voxel);
          this.voxelMap.set(this.voxelKey(wx, y, wz), { ...voxel, chunkKey: key });
          if (voxel.neon) neonVoxels.push(voxel);
        }
      }
    }

    const mesh = new THREE.InstancedMesh(this.geometry, this.material, voxels.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.userData.chunkKey = key;
    voxels.forEach((voxel, i) => {
      this.dummy.position.set(voxel.x, voxel.y + 0.5, voxel.z);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.scene.add(mesh);

    const neonMesh = new THREE.InstancedMesh(this.geometry, this.neonMaterial, neonVoxels.length || 1);
    neonMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    neonMesh.userData.chunkKey = `${key}:neon`;
    neonVoxels.forEach((voxel, i) => {
      this.dummy.position.set(voxel.x, voxel.y + 0.5, voxel.z);
      this.dummy.updateMatrix();
      neonMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.scene.add(neonMesh);

    this.chunks.set(key, { voxels, neonVoxels, mesh, neonMesh, district: district.name, landmark });
  }

  despawnChunk(key) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    this.scene.remove(chunk.mesh);
    this.scene.remove(chunk.neonMesh);

    for (const voxel of chunk.voxels) {
      this.voxelMap.delete(this.voxelKey(voxel.x, voxel.y, voxel.z));
    }

    this.chunks.delete(key);
  }

  rebuildChunk(chunkKey) {
    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return;

    const { mesh, neonMesh, voxels, neonVoxels } = chunk;

    mesh.count = voxels.length;
    voxels.forEach((voxel, i) => {
      this.dummy.position.set(voxel.x, voxel.y + 0.5, voxel.z);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    neonMesh.count = Math.max(1, neonVoxels.length);
    neonVoxels.forEach((voxel, i) => {
      this.dummy.position.set(voxel.x, voxel.y + 0.5, voxel.z);
      this.dummy.updateMatrix();
      neonMesh.setMatrixAt(i, this.dummy.matrix);
    });
    neonMesh.instanceMatrix.needsUpdate = true;
  }

  removeVoxelAt(x, y, z, { causeDynamic = true } = {}) {
    const key = this.voxelKey(x, y, z);
    const voxel = this.voxelMap.get(key);
    if (!voxel) return null;

    const chunk = this.chunks.get(voxel.chunkKey);
    if (!chunk) return null;

    chunk.voxels.splice(chunk.voxels.findIndex((v) => v.x === x && v.y === y && v.z === z), 1);
    if (voxel.neon) {
      const neonIndex = chunk.neonVoxels.findIndex((v) => v.x === x && v.y === y && v.z === z);
      if (neonIndex >= 0) chunk.neonVoxels.splice(neonIndex, 1);
    }

    this.voxelMap.delete(key);
    this.rebuildChunk(voxel.chunkKey);
    this.particlePool.spawnDebris(new THREE.Vector3(x, y + 0.5, z));

    if (causeDynamic) {
      const above = this.voxelMap.get(this.voxelKey(x, y + 1, z));
      if (above) {
        this.removeVoxelAt(above.x, above.y, above.z, { causeDynamic: false });
        this.spawnDynamicVoxel(above);
      }
    }

    return voxel;
  }

  spawnDynamicVoxel(voxel) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.set(voxel.x, voxel.y + 0.5, voxel.z);
    this.scene.add(mesh);

    const body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
      position: new CANNON.Vec3(voxel.x, voxel.y + 0.5, voxel.z),
      material: this.world.voxelMaterial
    });
    this.world.addBody(body);
    this.dynamicVoxelEntities.push({ mesh, body });
  }

  getNearbyObstacles(position, radius = 6) {
    const obstacles = [];
    for (const voxel of this.voxelMap.values()) {
      const dx = voxel.x - position.x;
      const dz = voxel.z - position.z;
      if (dx * dx + dz * dz < radius * radius) {
        obstacles.push({ x: voxel.x, z: voxel.z });
      }
    }
    return obstacles;
  }

  raycastVoxel(raycaster) {
    for (const chunk of this.chunks.values()) {
      const hit = raycaster.intersectObject(chunk.mesh, false)[0];
      if (!hit || hit.instanceId == null) continue;
      return chunk.voxels[hit.instanceId] || null;
    }
    return null;
  }

  spawnBlockadeAhead(position, velocity) {
    const dir = velocity.clone().normalize();
    if (dir.lengthSq() < 0.01) return;

    const origin = position.clone().addScaledVector(dir, 18);
    const baseX = Math.floor(origin.x);
    const baseZ = Math.floor(origin.z);

    for (let x = -2; x <= 2; x++) {
      for (let y = 0; y < 3; y++) {
        this.forceVoxel(baseX + x, y, baseZ);
      }
    }
  }

  forceVoxel(x, y, z) {
    const key = this.voxelKey(x, y, z);
    if (this.voxelMap.has(key)) return;
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    const chunkKey = this.chunkKey(chunkX, chunkZ);
    if (!this.chunks.has(chunkKey)) this.spawnChunk(chunkX, chunkZ);

    const chunk = this.chunks.get(chunkKey);
    const voxel = { x, y, z, neon: false, chunkKey };
    chunk.voxels.push(voxel);
    this.voxelMap.set(key, voxel);
    this.rebuildChunk(chunkKey);
  }

  getLandmarkPOIs(limit = 18) {
    return Array.from(this.landmarks.values())
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        type: 'landmark',
        label: `${item.district} landmark`,
        position: { x: item.x, z: item.z },
        discovered: true
      }));
  }

  getNearestLandmark(position) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const item of this.landmarks.values()) {
      const dx = item.x - position.x;
      const dz = item.z - position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = item;
      }
    }
    return nearest;
  }

  getPersistenceData() {
    return {
      visitedChunks: [...this.visitedChunks],
      discoveredLandmarks: [...this.discoveredLandmarks]
    };
  }

  hydratePersistenceData(state = {}) {
    this.visitedChunks = new Set(state.visitedChunks || []);
    this.discoveredLandmarks = new Set(state.discoveredLandmarks || []);
  }
}
