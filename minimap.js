import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

export class Minimap {
  constructor(scene) {
    this.scene = scene;

    const width  = 200;
    const height = 200;
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('minimap'),
      antialias: true
    });
    this.renderer.setSize(width, height);

    const aspect = width / height;
    const d = 25;
    this.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect,
       d, -d,
      0.1, 100
    );
    this.camera.position.set(0, 30, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
