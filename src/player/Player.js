import * as THREE from 'three';

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.position = new THREE.Vector3(0, 1, 10);
    this.velocity = new THREE.Vector3();
    this.input = { forward: false, backward: false, left: false, right: false };

    this.bindInput();
  }

  bindInput() {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyW') this.input.forward = true;
      if (event.code === 'KeyS') this.input.backward = true;
      if (event.code === 'KeyA') this.input.left = true;
      if (event.code === 'KeyD') this.input.right = true;
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'KeyW') this.input.forward = false;
      if (event.code === 'KeyS') this.input.backward = false;
      if (event.code === 'KeyA') this.input.left = false;
      if (event.code === 'KeyD') this.input.right = false;
    });
  }

  update(delta) {
    const direction = new THREE.Vector3(
      Number(this.input.right) - Number(this.input.left),
      0,
      Number(this.input.backward) - Number(this.input.forward)
    ).normalize();

    this.velocity.lerp(direction.multiplyScalar(16), 0.08);
    this.position.addScaledVector(this.velocity, delta);

    this.camera.position.lerp(new THREE.Vector3(this.position.x, 12, this.position.z + 18), 0.08);
    this.camera.lookAt(this.position.x, 0, this.position.z);
  }
}
