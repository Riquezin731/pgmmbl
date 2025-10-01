import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

export class Bot {
  constructor(scene, x, z, domContainer) {
    this.health = 100;
    this.maxHealth = 100;
    this.scene = scene;
    this.domContainer = domContainer;

    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, 1, z);
    this.mesh.userData.bot = this;
    scene.add(this.mesh);

    // IA
    this.speed = 2; // unidades por segundo
    this.state = 'patrol'; // patrol | chase
    this.patrolTarget = this._randomPatrolPoint();

    // HUD: barra de vida
    this.healthEl = document.createElement('div');
    this.healthEl.className = 'botHealth';
    this.healthBar = document.createElement('div');
    this.healthBar.className = 'botHealthBar';
    this.healthEl.appendChild(this.healthBar);
    domContainer.appendChild(this.healthEl);
  }

  _randomPatrolPoint() {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      0,
      (Math.random() - 0.5) * 40
    );
  }

  update(delta, playerPosition) {
    if (!this.mesh) return;

    // Distância para o jogador
    const d = this.mesh.position.distanceTo(playerPosition);

    // Decide estado
    if (d < 12 && this.health > 0) this.state = 'chase';
    else if (this.state === 'chase' && d >= 14) this.state = 'patrol';

    // Movimento
    let target;
    if (this.state === 'chase') {
      target = playerPosition.clone();
      target.y = 0;
    } else {
      target = this.patrolTarget;
      if (this.mesh.position.distanceTo(target) < 1) {
        this.patrolTarget = this._randomPatrolPoint();
      }
    }

    // direção e deslocamento
    const dir = new THREE.Vector3().subVectors(target, this.mesh.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.0001) {
      dir.normalize();
      this.mesh.position.addScaledVector(dir, this.speed * delta * (this.state === 'chase' ? 1.5 : 1));
      // olhar na direção do movimento
      const angle = Math.atan2(dir.x, dir.z);
      this.mesh.rotation.y = angle;
    }

    // Atualiza cor conforme vida
    const t = Math.max(0, this.health) / this.maxHealth;
    if (this.mesh.material) this.mesh.material.color.setRGB(1 - t, t, 0);

    // Atualiza HUD
    const pct = Math.max(0, this.health) / this.maxHealth * 100;
    this.healthBar.style.width = pct + '%';
  }

  takeDamage(amount) {
    this.health -= amount;
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }
    if (this.healthEl && this.healthEl.parentElement) {
      this.healthEl.parentElement.removeChild(this.healthEl);
    }
  }
}
