import * as THREE from 'three';

export class Building {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(8, 20, 8),
      new THREE.MeshStandardMaterial({ color: '#5a5a66', flatShading: true })
    );
    this.mesh.position.set(12, 10, -20);
    scene.add(this.mesh);
  }
}
