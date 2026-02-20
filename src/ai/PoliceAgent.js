import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Steering } from './Steering.js';

export class PoliceAgent {
  constructor({ scene, world, heatSystem, vehicleController, chunkManager }) {
    this.scene = scene;
    this.world = world;
    this.heatSystem = heatSystem;
    this.vehicleController = vehicleController;
    this.chunkManager = chunkManager;
    this.steering = new Steering();
    this.units = [];
    this.closestDistance = Infinity;
  }

  ensureUnits(count) {
    while (this.units.length < count) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 3.2), new THREE.MeshStandardMaterial({ color: '#315bff' }));
      this.scene.add(mesh);
      const body = new CANNON.Body({ mass: 80, shape: new CANNON.Box(new CANNON.Vec3(0.9, 0.55, 1.6)), position: new CANNON.Vec3(-10 - this.units.length * 2, 2, -10) });
      this.world.addBody(body);
      this.units.push({ mesh, body });
    }
  }

  getClosestDistanceTo(position) {
    if (!this.units.length) return Infinity;
    let closest = Infinity;
    this.units.forEach((unit) => {
      const dx = unit.body.position.x - position.x;
      const dz = unit.body.position.z - position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < closest) closest = dist;
    });
    return closest;
  }

  update(delta, playerPosition) {
    const stars = this.heatSystem.heat;
    if (stars <= 0) {
      this.closestDistance = Infinity;
      return;
    }

    if (stars >= 1) this.ensureUnits(2);
    if (stars >= 3) this.ensureUnits(5);

    const pitMode = stars >= 3;
    if (stars >= 5) {
      this.chunkManager.spawnBlockadeAhead(playerPosition, this.vehicleController.player.velocity);
    }

    const obstacles = this.chunkManager.getNearbyObstacles(playerPosition, 10);
    this.units.forEach((unit, idx) => {
      const unitPos = unit.body.position;
      const sideOffset = pitMode ? (idx % 2 === 0 ? 2 : -2) : idx - 0.5;
      const target = {
        x: playerPosition.x + sideOffset,
        z: playerPosition.z + (pitMode ? 0 : 6)
      };
      const seek = pitMode ? this.steering.seek(unitPos, target, 16 * delta) : this.steering.arrive(unitPos, target, 7, 12 * delta);
      const avoid = this.steering.avoidObstacles(unitPos, obstacles, 3 * delta);
      unit.body.velocity.x += seek.x + avoid.x;
      unit.body.velocity.z += seek.z + avoid.z;
      unit.mesh.position.copy(unit.body.position);
      unit.mesh.quaternion.copy(unit.body.quaternion);
    });

    this.closestDistance = this.getClosestDistanceTo(playerPosition);
  }
}
