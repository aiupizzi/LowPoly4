import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Steering } from './Steering.js';

const ROLE_ORDER = ['chaser', 'flanker', 'blocker'];

export class PoliceAgent {
  constructor({ scene, world, heatSystem, vehicleController, chunkManager, eventBus }) {
    this.scene = scene;
    this.world = world;
    this.heatSystem = heatSystem;
    this.vehicleController = vehicleController;
    this.chunkManager = chunkManager;
    this.steering = new Steering();
    this.eventBus = eventBus;
    this.units = [];
    this.closestDistance = Infinity;

    this.spawnBudget = 0;
    this.despawnBudget = 0;
    this.blockadeTimer = 4;
    this.roleCursor = 0;
  }

  createUnit(spawnPoint) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.1, 3.2),
      new THREE.MeshStandardMaterial({ color: '#315bff' })
    );
    mesh.position.copy(spawnPoint);
    this.scene.add(mesh);

    const body = new CANNON.Body({
      mass: 80,
      shape: new CANNON.Box(new CANNON.Vec3(0.9, 0.55, 1.6)),
      position: new CANNON.Vec3(spawnPoint.x, spawnPoint.y, spawnPoint.z)
    });
    this.world.addBody(body);

    const role = ROLE_ORDER[this.roleCursor % ROLE_ORDER.length];
    this.roleCursor += 1;

    return {
      mesh,
      body,
      role,
      state: 'patrol',
      stateTimer: 0,
      stunTimer: 0,
      maxDurability: 70,
      durability: 70,
      lastSpeed: 0,
      laneOffset: 0,
      blockadeDirection: Math.random() > 0.5 ? 1 : -1,
      cooldowns: {
        pit: 0,
        blockade_support: 0
      }
    };
  }

  getPlayerVelocity() {
    const source = this.vehicleController.player?.velocity;
    if (source) {
      return new THREE.Vector3(source.x, source.y || 0, source.z);
    }
    const chassisVel = this.vehicleController.chassisBody?.velocity;
    if (chassisVel) {
      return new THREE.Vector3(chassisVel.x, chassisVel.y, chassisVel.z);
    }
    return new THREE.Vector3();
  }

  getPlayerDirection() {
    const velocity = this.getPlayerVelocity();
    if (velocity.lengthSq() < 0.1) return new THREE.Vector3(0, 0, 1);
    return velocity.normalize();
  }

  getDesiredUnitCount(heat, distanceToClosest) {
    if (heat <= 0) return 0;
    if (heat >= 5) return 7;
    if (heat === 4) return 6;
    if (heat === 3) return 5;
    if (heat === 2) return 3;

    if (distanceToClosest > 90) return 1;
    return 2;
  }

  updateBudgets(delta, heat, desiredCount, distanceToClosest) {
    const farAway = distanceToClosest > 120;
    const spawnRate = Math.max(0.3, 0.35 + heat * 0.3);
    const despawnRate = desiredCount < this.units.length || farAway ? 0.7 + Math.max(0, this.units.length - desiredCount) * 0.25 : 0.25;

    this.spawnBudget = Math.min(3, this.spawnBudget + delta * spawnRate);
    this.despawnBudget = Math.min(3, this.despawnBudget + delta * despawnRate);
  }

  spawnUnitNear(playerPosition, travelDir) {
    const lateral = new THREE.Vector3(-travelDir.z, 0, travelDir.x);
    const spawnDistance = 26 + Math.random() * 18;
    const sideOffset = (Math.random() * 2 - 1) * 8;
    const point = playerPosition
      .clone()
      .addScaledVector(travelDir, -spawnDistance)
      .addScaledVector(lateral, sideOffset);
    point.y = 2;

    const unit = this.createUnit(point);
    this.units.push(unit);
  }

  removeUnit(unit) {
    this.scene.remove(unit.mesh);
    this.world.removeBody(unit.body);
  }

  cullUnits(playerPosition, desiredCount) {
    if (!this.units.length) return;

    const ranked = this.units
      .map((unit, index) => {
        const dx = unit.body.position.x - playerPosition.x;
        const dz = unit.body.position.z - playerPosition.z;
        return { index, dist: Math.hypot(dx, dz) };
      })
      .sort((a, b) => b.dist - a.dist);

    while (this.units.length > desiredCount && this.despawnBudget >= 1 && ranked.length) {
      const { index } = ranked.shift();
      const [removed] = this.units.splice(index, 1);
      if (removed) this.removeUnit(removed);
      this.despawnBudget -= 1;

      ranked.forEach((entry) => {
        if (entry.index > index) entry.index -= 1;
      });
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

  predictPlayerPosition(playerPosition, playerVelocity, heat) {
    const leadTime = THREE.MathUtils.clamp(0.35 + heat * 0.15 + playerVelocity.length() * 0.012, 0.35, 1.65);
    return playerPosition.clone().addScaledVector(playerVelocity, leadTime);
  }

  dynamicLaneOffset(unit, idx, flankCount, playerSpeed) {
    const laneBase = THREE.MathUtils.clamp(1.1 + playerSpeed * 0.025, 1.1, 3.8);
    const spread = unit.role === 'flanker' ? laneBase * 1.2 : laneBase;
    const laneIdx = idx - (flankCount - 1) / 2;
    const raw = laneIdx * spread;
    unit.laneOffset = THREE.MathUtils.lerp(unit.laneOffset, raw, 0.18);
    return unit.laneOffset;
  }

  transitionState(unit, nextState) {
    if (unit.state === nextState) return;
    unit.state = nextState;
    unit.stateTimer = 0;
    if (nextState === 'pit') unit.cooldowns.pit = 3.5;
    if (nextState === 'blockade_support') {
      unit.cooldowns.blockade_support = 6.5;
      unit.blockadeDirection = Math.random() > 0.5 ? 1 : -1;
    }
  }

  updateUnitState(unit, context, delta) {
    unit.stateTimer += delta;
    unit.stunTimer = Math.max(0, unit.stunTimer - delta);
    unit.cooldowns.pit = Math.max(0, unit.cooldowns.pit - delta);
    unit.cooldowns.blockade_support = Math.max(0, unit.cooldowns.blockade_support - delta);

    const { heat, distToPlayer, playerSpeed } = context;

    if (unit.stunTimer > 0) {
      this.transitionState(unit, 'recover');
      return;
    }

    if (unit.durability < unit.maxDurability * 0.25) {
      this.transitionState(unit, 'recover');
      return;
    }

    if (distToPlayer > 70 && unit.state !== 'recover') {
      this.transitionState(unit, 'patrol');
      return;
    }

    const pitCandidate = heat >= 3 && playerSpeed > 24 && distToPlayer < 12 && unit.role !== 'blocker' && unit.cooldowns.pit <= 0;
    const blockadeCandidate = heat >= 5 && unit.role === 'blocker' && distToPlayer < 30 && unit.cooldowns.blockade_support <= 0;

    if (blockadeCandidate && unit.stateTimer > 1.2) {
      this.transitionState(unit, 'blockade_support');
      return;
    }

    if (pitCandidate && unit.stateTimer > 0.8) {
      this.transitionState(unit, 'pit');
      return;
    }

    if (unit.state === 'recover' && unit.stateTimer > 2.5) {
      this.transitionState(unit, 'pursue');
      return;
    }

    if (unit.state === 'pit' && unit.stateTimer > 1.8) {
      this.transitionState(unit, 'pursue');
      return;
    }

    if (unit.state === 'blockade_support' && unit.stateTimer > 2.2) {
      this.transitionState(unit, 'pursue');
      return;
    }

    if (unit.state === 'patrol' && distToPlayer < 40) {
      this.transitionState(unit, 'pursue');
      return;
    }

    if (unit.state === 'pursue' && distToPlayer > 55) {
      this.transitionState(unit, 'patrol');
    }
  }

  applyCollisionDurability(unit, delta) {
    const speed = unit.body.velocity.length();
    const speedDrop = Math.max(0, unit.lastSpeed - speed);
    unit.lastSpeed = speed;

    if (speedDrop < 0.1) return;

    const decay = Math.max(0, speedDrop - 4.2) * 5.5;
    if (decay > 0) {
      unit.durability = Math.max(0, unit.durability - decay * delta * 10);
    }

    if (speedDrop > 7) {
      unit.stunTimer = Math.max(unit.stunTimer, 1.2 + Math.random() * 0.8);
      this.transitionState(unit, 'recover');
    }
  }

  getTargetForState(unit, context, index, flankCount) {
    const lateral = context.lateral;
    const predicted = context.predictedPlayerPos;
    const laneOffset = this.dynamicLaneOffset(unit, index, flankCount, context.playerSpeed);

    const target = predicted.clone();

    switch (unit.state) {
      case 'patrol':
        target
          .addScaledVector(context.travelDir, -10)
          .addScaledVector(lateral, laneOffset + (unit.role === 'flanker' ? unit.blockadeDirection * 2 : 0));
        break;
      case 'pit':
        target
          .addScaledVector(context.travelDir, 1.5)
          .addScaledVector(lateral, Math.sign(laneOffset || unit.blockadeDirection || 1) * 2.8);
        break;
      case 'recover':
        target
          .addScaledVector(context.travelDir, -14)
          .addScaledVector(lateral, unit.blockadeDirection * 3.5);
        break;
      case 'blockade_support':
        target
          .addScaledVector(context.travelDir, 20)
          .addScaledVector(lateral, unit.blockadeDirection * 5.5);
        break;
      case 'pursue':
      default:
        target
          .addScaledVector(context.travelDir, unit.role === 'chaser' ? 0 : 2.5)
          .addScaledVector(lateral, laneOffset);
        break;
    }

    target.y = 2;
    return target;
  }

  maybeSpawnBlockade(delta, heat, playerPosition, playerVelocity) {
    if (heat < 5) {
      this.blockadeTimer = Math.max(0, this.blockadeTimer - delta);
      return;
    }

    this.blockadeTimer -= delta;
    if (this.blockadeTimer > 0) return;

    const travelDir = playerVelocity.clone();
    if (travelDir.lengthSq() < 0.01) return;

    const yawVariance = THREE.MathUtils.degToRad((Math.random() * 30 - 15));
    travelDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawVariance);
    this.chunkManager.spawnBlockadeAhead(playerPosition, travelDir);
    this.blockadeTimer = 3.8 + Math.random() * 2.6;
  }

  update(delta, playerPosition) {
    const heat = this.heatSystem.heat;
    const playerVelocity = this.getPlayerVelocity();
    const travelDir = this.getPlayerDirection();

    const currentClosest = this.getClosestDistanceTo(playerPosition);
    const desiredCount = this.getDesiredUnitCount(heat, currentClosest);
    this.updateBudgets(delta, heat, desiredCount, currentClosest);

    while (this.units.length < desiredCount && this.spawnBudget >= 1) {
      this.spawnUnitNear(playerPosition, travelDir);
      this.spawnBudget -= 1;
    }

    this.cullUnits(playerPosition, desiredCount);

    this.maybeSpawnBlockade(delta, heat, playerPosition, playerVelocity);

    const predictedPlayerPos = this.predictPlayerPosition(playerPosition, playerVelocity, heat);
    const obstacles = this.chunkManager.getNearbyObstacles(playerPosition, 12);
    const flankCount = Math.max(1, this.units.length);
    const lateral = new THREE.Vector3(-travelDir.z, 0, travelDir.x);

    this.units.forEach((unit, idx) => {
      const unitPos = unit.body.position;
      const distToPlayer = Math.hypot(unitPos.x - playerPosition.x, unitPos.z - playerPosition.z);

      const context = {
        heat,
        distToPlayer,
        playerSpeed: playerVelocity.length(),
        predictedPlayerPos,
        travelDir,
        lateral
      };

      this.updateUnitState(unit, context, delta);
      this.applyCollisionDurability(unit, delta);

      if (unit.durability <= 0 && this.despawnBudget >= 1) {
        this.despawnBudget -= 1;
        this.removeUnit(unit);
        this.units[idx] = null;
        return;
      }

      const target = this.getTargetForState(unit, context, idx, flankCount);
      const maxForce = unit.state === 'pit' ? 18 * delta : unit.state === 'recover' ? 9 * delta : 14 * delta;
      const seek = unit.state === 'patrol'
        ? this.steering.arrive(unitPos, target, 9, maxForce)
        : this.steering.seek(unitPos, target, maxForce);
      const avoid = this.steering.avoidObstacles(unitPos, obstacles, 4 * delta);

      const stunScale = unit.stunTimer > 0 ? 0.22 : 1;
      unit.body.velocity.x += (seek.x + avoid.x) * stunScale;
      unit.body.velocity.z += (seek.z + avoid.z) * stunScale;

      unit.mesh.position.copy(unit.body.position);
      unit.mesh.quaternion.copy(unit.body.quaternion);
    });

    this.units = this.units.filter(Boolean);
    this.closestDistance = this.getClosestDistanceTo(playerPosition);
    this.eventBus?.emit('police:proximity', { distance: this.closestDistance, heat });
  }
}
