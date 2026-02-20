import * as THREE from 'three';

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.position = new THREE.Vector3(0, 3, 0);
    this.velocity = new THREE.Vector3();
  }

  syncFromVehicle(body) {
    this.position.copy(body.position);
    this.velocity.copy(body.velocity);
  }

  update() {
    const camTarget = new THREE.Vector3(this.position.x, this.position.y + 7, this.position.z + 14);
    this.camera.position.lerp(camTarget, 0.08);
    this.camera.lookAt(this.position.x, this.position.y + 1.2, this.position.z);
  }
}
