import test from 'node:test';
import assert from 'node:assert/strict';

import { ChunkManager } from '../src/world/ChunkManager.js';
import { HeatSystem } from '../src/systems/HeatSystem.js';
import { VehicleController } from '../src/physics/VehicleController.js';
import { GameState } from '../src/systems/GameState.js';

test('chunk stream spawns and despawns around player movement', () => {
  const spawnedKeys = [];
  const manager = new ChunkManager({
    viewRadius: 1,
    verticalSlices: [0],
    createChunk: ({ x, y, z }) => ({ key: `${x},${y},${z}` }),
    disposeChunk: (chunk) => spawnedKeys.push(`dispose:${chunk.key}`),
  });

  const first = manager.update({ x: 0, z: 0 });
  assert.equal(first.spawned.length, 9);

  const moved = manager.update({ x: 48, z: 0 });
  assert.ok(moved.spawned.length > 0);
  assert.ok(moved.despawned.length > 0);
});

test('heat system transitions to PIT and blockade behavior', () => {
  const units = [];
  const blockades = [];
  const heat = new HeatSystem({
    spawnPolice: () => {
      const unit = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
      units.push(unit);
      return unit;
    },
    spawnBlockade: (p) => blockades.push(p),
    obstacleLookup: () => false,
  });

  heat.setHeat(3);
  heat.update({ timeMs: 1000, dt: 0.016, player: { position: { x: 20, y: 0, z: 20 }, velocity: { x: 8, z: 1 } } });
  assert.equal(heat.policeUnits.length, 2);
  assert.equal(heat.policeUnits[0].behavior, 'pit');

  heat.setHeat(5);
  heat.update({ timeMs: 6000, dt: 0.016, player: { position: { x: 0, y: 0, z: 0 }, velocity: { x: 10, z: 0 } } });
  assert.equal(blockades.length, 1);
});

test('vehicle collision removes voxel above threshold', () => {
  const removed = [];
  const cannon = {
    RaycastVehicle: class { constructor() {} addWheel() {} addToWorld() {} applyEngineForce() {} setSteeringValue() {} setBrake() {} },
    Vec3: class {
      constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
      scale(v) { return { x: this.x * v, y: this.y * v, z: this.z * v }; }
      length() { return Math.hypot(this.x, this.y, this.z); }
    },
  };
  const chassisBody = { position: { x: 0, y: 0, z: 0 }, applyImpulse: () => {} };
  const vc = new VehicleController({ cannon, world: {}, chassisBody });

  const hit = vc.processVoxelCollision({
    relativeVelocity: new cannon.Vec3(12, 0, 0),
    voxel: { position: { x: 1, y: 0, z: 0 } },
    removeVoxel: (p) => removed.push(p),
  });

  assert.equal(hit, true);
  assert.equal(removed.length, 1);
});

test('save/load validates persisted state', () => {
  const store = new Map();
  const storage = {
    setItem: (k, v) => store.set(k, v),
    getItem: (k) => store.get(k) || null,
  };

  const state = new GameState(storage);
  state.player = { x: 3, y: 4, z: 5 };
  state.money = 99;
  state.save();

  const restored = new GameState(storage);
  assert.equal(restored.load(), true);
  assert.equal(restored.player.z, 5);
  assert.equal(restored.money, 99);

  storage.setItem('lowpoly4.save.v1', JSON.stringify({ player: { x: 'bad' }, money: 'bad' }));
  const invalid = new GameState(storage);
  assert.equal(invalid.load(), false);
});
