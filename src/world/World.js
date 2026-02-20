import * as CANNON from 'cannon-es';

export class World {
  constructor({ scene }) {
    this.scene = scene;
    this.physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
    this.physics.broadphase = new CANNON.SAPBroadphase(this.physics);
    this.physics.allowSleep = true;

    this.defaultMaterial = new CANNON.Material('default');
    this.wheelMaterial = new CANNON.Material('wheel');
    this.voxelMaterial = new CANNON.Material('voxel');

    this.physics.defaultContactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
      friction: 0.4,
      restitution: 0.05
    });

    this.physics.addContactMaterial(
      new CANNON.ContactMaterial(this.wheelMaterial, this.defaultMaterial, {
        friction: 0.9,
        restitution: 0
      })
    );

    this.fixedTimeStep = 1 / 60;
    this.dynamicBodies = new Set();

    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.defaultMaterial
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.physics.addBody(groundBody);
  }

  addBody(body) {
    this.physics.addBody(body);
    if (body.type === CANNON.Body.DYNAMIC) {
      this.dynamicBodies.add(body);
    }
  }

  removeBody(body) {
    this.physics.removeBody(body);
    this.dynamicBodies.delete(body);
  }

  update(delta) {
    this.physics.step(this.fixedTimeStep, delta, 3);
  }
}
