import * as THREE from 'three';

const PICKUP_COLORS = {
  cash: { color: '#f8df5f', emissive: '#8f6e08' },
  repair: { color: '#6dfaa1', emissive: '#1f6642' },
  cool: { color: '#78d4ff', emissive: '#1a4d7e' }
};

export class PickupSystem {
  constructor({ scene, eventBus, vehicleController, heatSystem, chunkManager, addMoney = () => {} }) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.vehicleController = vehicleController;
    this.heatSystem = heatSystem;
    this.chunkManager = chunkManager;
    this.addMoney = addMoney;
    this.pickups = [];
    this.maxPickups = 18;
    this.landmarkCooldown = 0;
    this.comboDestroyed = 0;
    this.comboTimer = 0;

    this.bindEvents();
  }

  bindEvents() {
    this.eventBus?.on('world:voxelDestroyed', ({ count = 0, position }) => {
      this.comboDestroyed += count;
      this.comboTimer = 1.8;
      if (count >= 3 && position) this.spawnNearby(position, 'cash', 1 + Math.floor(count / 3));
    });

    this.eventBus?.on('explosion:detonated', ({ center, destroyed }) => {
      if (!center || destroyed <= 0) return;
      const pos = { x: center.x, y: center.y, z: center.z };
      if (destroyed >= 4) this.spawnNearby(pos, 'cash', Math.max(1, Math.floor(destroyed / 4)));
      if (destroyed >= 3) this.spawnNearby(pos, 'repair', 1);
    });
  }

  spawnNearby(position, type = 'cash', count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.pickups.length >= this.maxPickups) this.removeOldest();

      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 8;
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(type === 'cash' ? 0.48 : 0.6, 0),
        new THREE.MeshStandardMaterial({
          color: PICKUP_COLORS[type].color,
          emissive: PICKUP_COLORS[type].emissive,
          emissiveIntensity: 0.8,
          roughness: 0.45,
          metalness: 0.1
        })
      );

      mesh.position.set(
        position.x + Math.cos(angle) * radius,
        1.8,
        position.z + Math.sin(angle) * radius
      );
      this.scene.add(mesh);

      const value = type === 'cash' ? 12 + Math.floor(Math.random() * 18) : type === 'repair' ? 24 : 0;
      this.pickups.push({ mesh, type, value, ttl: 22 + Math.random() * 6, bob: Math.random() * Math.PI * 2 });
    }
  }

  spawnLandmarkPickup() {
    const landmark = this.chunkManager.getNearestLandmark(this.vehicleController.chassisBody.position);
    if (!landmark) return;
    const center = { x: landmark.x, z: landmark.z };
    const coolExists = this.pickups.some((pickup) => pickup.type === 'cool' && Math.hypot(pickup.mesh.position.x - center.x, pickup.mesh.position.z - center.z) < 12);
    if (!coolExists) {
      this.spawnNearby({ x: center.x, z: center.z }, 'cool', 1);
    }
  }

  removeOldest() {
    const removed = this.pickups.shift();
    if (removed) this.scene.remove(removed.mesh);
  }

  collect(pickup) {
    if (pickup.type === 'cash') {
      this.addMoney(pickup.value);
      this.eventBus?.emit('pickup:cashCollected', { amount: pickup.value });
      return;
    }

    if (pickup.type === 'repair') {
      this.vehicleController.applyRepair(pickup.value || 25);
      this.eventBus?.emit('pickup:repairCollected', { amount: pickup.value || 25 });
      return;
    }

    this.heatSystem.triggerHeatReduction(9, 0.95);
    this.eventBus?.emit('pickup:heatReduced', { duration: 9, rate: 0.95 });
  }

  update(delta) {
    this.landmarkCooldown = Math.max(0, this.landmarkCooldown - delta);
    this.comboTimer = Math.max(0, this.comboTimer - delta);

    if (this.comboTimer === 0) this.comboDestroyed = 0;
    if (this.comboDestroyed >= 5 && this.comboTimer > 0) {
      this.spawnNearby(this.vehicleController.chassisBody.position, 'cash', 1);
      this.comboDestroyed = 0;
      this.comboTimer = 0;
    }

    if (this.landmarkCooldown <= 0) {
      this.spawnLandmarkPickup();
      this.landmarkCooldown = 9;
    }

    const bodyPos = this.vehicleController.chassisBody.position;
    this.pickups = this.pickups.filter((pickup) => {
      pickup.ttl -= delta;
      pickup.bob += delta * 2;
      pickup.mesh.rotation.y += delta * 2.2;
      pickup.mesh.position.y = 1.7 + Math.sin(pickup.bob) * 0.28;

      if (pickup.ttl <= 0) {
        this.scene.remove(pickup.mesh);
        return false;
      }

      const dx = pickup.mesh.position.x - bodyPos.x;
      const dz = pickup.mesh.position.z - bodyPos.z;
      if (Math.hypot(dx, dz) > 2.5) return true;

      this.collect(pickup);
      this.scene.remove(pickup.mesh);
      return false;
    });
  }

  getPOIs(limit = 12) {
    return this.pickups.slice(0, limit).map((pickup, index) => ({
      id: `pickup-${index}`,
      type: `pickup-${pickup.type}`,
      label: pickup.type === 'cash' ? 'Cash' : pickup.type === 'repair' ? 'Repair kit' : 'Heat dump',
      position: { x: pickup.mesh.position.x, z: pickup.mesh.position.z }
    }));
  }
}
