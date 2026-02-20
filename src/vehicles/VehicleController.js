import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class VehicleController {
  constructor({ scene, world, player, chunkManager, eventBus }) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.chunkManager = chunkManager;
    this.eventBus = eventBus;
    this.speed = 0;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.accelerationMultiplier = 1;
    this.driveState = 'drive';
    this.input = { forward: false, backward: false, left: false, right: false, brake: false };
    this.lastSpeedAbs = 0;

    this.buildVehicle();
    this.bindInput();
    this.bindEvents();
  }

  bindEvents() {
    this.eventBus?.on('explosion:detonated', ({ center, radius, force }) => {
      const dx = this.chassisBody.position.x - center.x;
      const dy = this.chassisBody.position.y - center.y;
      const dz = this.chassisBody.position.z - center.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > radius + 1.5) return;
      const damage = Math.max(6, (1 - dist / Math.max(radius, 0.001)) * (force * 0.14));
      this.applyDamage(damage, 'explosion');
      this.eventBus?.emit('feedback:shake', { intensity: Math.min(1, damage / 16) });
    });
  }

  buildVehicle() {
    this.chassisBody = new CANNON.Body({
      mass: 220,
      material: this.world.defaultMaterial,
      position: new CANNON.Vec3(0, 3, 0),
      shape: new CANNON.Box(new CANNON.Vec3(1.2, 0.4, 2.2))
    });
    this.world.addBody(this.chassisBody);

    this.vehicle = new CANNON.RaycastVehicle({ chassisBody: this.chassisBody, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 });

    const wheelOptions = {
      radius: 0.45,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 45,
      suspensionRestLength: 0.3,
      frictionSlip: 4,
      dampingRelaxation: 2.3,
      dampingCompression: 4.8,
      maxSuspensionForce: 1e5,
      rollInfluence: 0.02,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    [[-1, 1.65], [1, 1.65], [-1, -1.65], [1, -1.65]].forEach(([x, z]) => {
      wheelOptions.chassisConnectionPointLocal.set(x, -0.2, z);
      this.vehicle.addWheel(wheelOptions);
    });

    this.vehicle.addToWorld(this.world.physics);

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.9, 4.6),
      new THREE.MeshStandardMaterial({ color: '#f55f5f', metalness: 0.1, roughness: 0.6 })
    );
    this.scene.add(this.mesh);
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') this.input.forward = true;
      if (e.code === 'KeyS') this.input.backward = true;
      if (e.code === 'KeyA') this.input.left = true;
      if (e.code === 'KeyD') this.input.right = true;
      if (e.code === 'Space') this.input.brake = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.input.forward = false;
      if (e.code === 'KeyS') this.input.backward = false;
      if (e.code === 'KeyA') this.input.left = false;
      if (e.code === 'KeyD') this.input.right = false;
      if (e.code === 'Space') this.input.brake = false;
    });
  }

  driveTorqueCurve(speedAbs) {
    if (speedAbs < 5) return 380;
    if (speedAbs < 16) return 620;
    return 260;
  }

  setAccelerationLevel(level = 0) {
    this.accelerationMultiplier = 1 + level * 0.14;
  }

  setDurabilityLevel(level = 0) {
    const healthRatio = this.maxHealth > 0 ? this.health / this.maxHealth : 1;
    this.maxHealth = 100 + level * 45;
    this.health = Math.max(0, Math.min(this.maxHealth, this.maxHealth * healthRatio));
  }

  applyDamage(amount, source = 'generic') {
    const previous = this.health;
    this.health = Math.max(0, this.health - amount);
    this.eventBus?.emit('vehicle:damaged', { source, amount, health: this.health, maxHealth: this.maxHealth });
    this.eventBus?.emit('vehicle:healthChanged', { health: this.health, maxHealth: this.maxHealth });

    if (previous > 0 && this.health <= 0) {
      this.driveState = 'disabled';
      this.eventBus?.emit('vehicle:disabled');
    }
  }

  applyRepair(amount = 25) {
    const previous = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (this.health > 0 && this.driveState === 'disabled') this.driveState = 'drive';
    if (this.health !== previous) {
      this.eventBus?.emit('vehicle:repair', { amount, health: this.health, maxHealth: this.maxHealth });
      this.eventBus?.emit('vehicle:healthChanged', { health: this.health, maxHealth: this.maxHealth });
    }
  }

  repairFull() {
    this.health = this.maxHealth;
    this.driveState = 'drive';
    this.eventBus?.emit('vehicle:healthChanged', { health: this.health, maxHealth: this.maxHealth });
  }


  update(delta = 1 / 60) {
    const velocity = this.chassisBody.velocity;
    const speedAbs = velocity.length();
    const engineForce = this.driveTorqueCurve(speedAbs) * this.accelerationMultiplier;

    const accel = this.driveState === 'disabled' ? 0 : (this.input.forward ? -1 : 0) + (this.input.backward ? 1 : 0);
    const steer = this.driveState === 'disabled' ? 0 : (this.input.left ? 1 : 0) + (this.input.right ? -1 : 0);

    this.vehicle.applyEngineForce(engineForce * accel, 2);
    this.vehicle.applyEngineForce(engineForce * accel, 3);

    this.vehicle.setSteeringValue(0.45 * steer, 0);
    this.vehicle.setSteeringValue(0.45 * steer, 1);

    const brakeForce = this.driveState === 'disabled' ? 18 : this.input.brake ? 14 : 0;
    for (let i = 0; i < 4; i++) this.vehicle.setBrake(brakeForce, i);

    this.mesh.position.copy(this.chassisBody.position);
    this.mesh.quaternion.copy(this.chassisBody.quaternion);

    this.speed = speedAbs * 2.23694;
    this.player.syncFromVehicle(this.chassisBody);

    const speedDrop = Math.max(0, this.lastSpeedAbs - speedAbs);
    if (speedDrop > 5.5 && speedAbs > 4) {
      const intensity = Math.min(1, speedDrop / 20);
      const damage = speedDrop * 0.9;
      this.applyDamage(damage, 'collision');
      this.eventBus?.emit('vehicle:collision', { intensity, speedDrop, speed: this.speed });
    }
    this.lastSpeedAbs = speedAbs;

    if (speedAbs > 10) {
      const p = this.chassisBody.position;
      const front = new THREE.Vector3(p.x, Math.max(0, p.y), p.z + Math.sign(this.chassisBody.velocity.z || 1) * 2);
      const voxel = this.chunkManager.removeVoxelAt(Math.round(front.x), Math.round(front.y), Math.round(front.z));
      if (voxel) {
        this.chassisBody.applyImpulse(new CANNON.Vec3(-velocity.x * 10, 0, -velocity.z * 10));
        const damage = Math.max(3, speedAbs * 0.9);
        this.applyDamage(damage, 'impact');
        this.eventBus?.emit('vehicle:collision', { intensity: Math.min(1, damage / 20), speed: this.speed, voxelImpact: true });
        this.eventBus?.emit('world:voxelDestroyed', { source: 'vehicle', count: 1, position: { x: front.x, y: front.y, z: front.z } });
      }
    }

  }
}
