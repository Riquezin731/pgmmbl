import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/PointerLockControls.js';
import { Bot } from './bot.js';
import { Minimap } from './minimap.js';

// Setup básico
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// Luz
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Chão
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
const ground    = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Controles de mira e movimento
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
document.addEventListener('click', () => controls.lock(), false);

// Bots
const bots = [];
for (let i = 0; i < 5; i++) {
  const x = (Math.random() - 0.5) * 50;
  const z = (Math.random() - 0.5) * 50;
  bots.push(new Bot(scene, x, z));
}

// Minimap
const minimap = new Minimap(scene, bots);

// Raycaster para tiro
const raycaster = new THREE.Raycaster();
const mouseDir  = new THREE.Vector2();

// Container de dano na tela
const damageContainer = document.getElementById('damageContainer');

function showDamage(point3D, amount) {
  // Converte para coordenadas de tela
  const vector = point3D.clone().project(camera);
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

  const span = document.createElement('span');
  span.className = 'damageText';
  span.style.left = `${x}px`;
  span.style.top  = `${y}px`;
  span.textContent = amount;
  damageContainer.appendChild(span);

  // Remove após a animação
  setTimeout(() => damageContainer.removeChild(span), 1000);
}

// Disparo ao clicar com botão direito
window.addEventListener('mousedown', e => {
  if (e.button !== 2) return; // apenas clique direito
  raycaster.setFromCamera(mouseDir, camera);

  const meshes = bots.map(b => b.mesh);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    const hit = hits[0];
    const bot = bots.find(b => b.mesh === hit.object);
    if (bot && bot.health > 0) {
      const dmg = Math.floor(Math.random() * 20) + 5;
      bot.health -= dmg;
      showDamage(hit.point, dmg);
      if (bot.health <= 0) {
        scene.remove(bot.mesh);
      }
    }
  }
});

// Gameplay loop
let lastTime = performance.now();
function animate(time) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // Atualiza bots
  bots.forEach(b => b.update(delta));

  // Render principal
  renderer.render(scene, camera);

  // Render do minimapa
  minimap.render();

  requestAnimationFrame(animate);
}
animate();
