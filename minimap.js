import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

export class Minimap {
  constructor(scene, player, bots) {
    this.scene = scene;
    this.player = player;
    this.bots = bots;

    this.canvas = document.getElementById('minimap');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(1);

    const aspect = this.width / this.height;
    const d = 25;
    this.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect,
       d, -d,
      0.1, 100
    );
    this.camera.position.set(0, 50, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);

    // Helper visual player indicator (small white cube)
    this.playerIcon = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.playerIcon.position.set(0, 0.5, 0);
    this.scene.add(this.playerIcon);
  }

  render() {
    // Posiciona camera do minimapa sobre o jogador
    const p = this.player.position;
    this.camera.position.set(p.x, 50, p.z);
    this.camera.updateMatrixWorld();

    // Atualiza ícone do jogador
    this.playerIcon.position.set(p.x, 0.5, p.z);

    // Opcional: colorir bots no main scene já resolve no minimapa pelo material
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
  }
}
