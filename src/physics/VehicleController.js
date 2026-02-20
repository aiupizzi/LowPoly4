export class VehicleController {
  constructor({ cannon, world, chassisBody, wheelOptions = {} }) {
    this.cannon = cannon;
    this.world = world;
    this.chassisBody = chassisBody;
    this.raycastVehicle = new cannon.RaycastVehicle({
      chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    this.wheelBodies = [];
    const defaults = {
      radius: 0.45,
      directionLocal: new cannon.Vec3(0, -1, 0),
      suspensionStiffness: 45,
      suspensionRestLength: 0.35,
      frictionSlip: 4,
      dampingRelaxation: 2.5,
      dampingCompression: 4.2,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new cannon.Vec3(-1, 0, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    const axleOffset = 0.9;
    const zFront = 1.25;
    const zRear = -1.15;
    [
      new cannon.Vec3(-axleOffset, 0, zFront),
      new cannon.Vec3(axleOffset, 0, zFront),
      new cannon.Vec3(-axleOffset, 0, zRear),
      new cannon.Vec3(axleOffset, 0, zRear),
    ].forEach((position) => {
      this.raycastVehicle.addWheel({ ...defaults, ...wheelOptions, chassisConnectionPointLocal: position });
    });

    this.raycastVehicle.addToWorld(world);
  }

  getDriveTorque(speedMps, throttle) {
    const absSpeed = Math.abs(speedMps);
    if (absSpeed < 8) return throttle * 120;
    if (absSpeed < 22) return throttle * 220;
    return throttle * 140;
  }

  updateDriveState({ speedMps, throttle = 0, steering = 0, brake = 0 }) {
    const torque = this.getDriveTorque(speedMps, throttle);
    this.raycastVehicle.applyEngineForce(-torque, 2);
    this.raycastVehicle.applyEngineForce(-torque, 3);
    this.raycastVehicle.setSteeringValue(steering, 0);
    this.raycastVehicle.setSteeringValue(steering, 1);

    for (let i = 0; i < 4; i++) this.raycastVehicle.setBrake(brake, i);
  }

  processVoxelCollision({ relativeVelocity, voxel, removeVoxel }) {
    const impactSpeed = relativeVelocity.length();
    if (impactSpeed <= 10 || !voxel) return false;

    removeVoxel(voxel.position);
    const recoil = relativeVelocity.scale(-0.35);
    this.chassisBody.applyImpulse(recoil, this.chassisBody.position);
    return true;
  }
}
