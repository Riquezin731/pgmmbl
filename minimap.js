import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export class Minimap {
  constructor(mainScene, bots) {
    // Cena separada apenas para minimapa
    this.scene = mainScene;
    this.bots = bots;

    const width  = 200;
    const height = 200;
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('minimap'),
      antialias: true
    });
    this.renderer.setSize(width, height);

    // Câmera ortográfica de topo
    const aspect = width / height;
    const d = 20;
    this.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect,
       d, -d,
      0.1, 100
    );
    this.camera.position.set(0, 30, 0);
    this.camera.lookAt(0, 0, 0);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
