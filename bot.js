import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

export class Bot {
  constructor(scene, x, z) {
    this.health = 100;
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, 1, z);
    scene.add(this.mesh);
  }

  update(delta) {
    // Gira lentamente no lugar
    this.mesh.rotation.y += delta * 0.5;
  }
}
