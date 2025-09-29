import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { PointerLockControls }
  from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/PointerLockControls.js';
import { Bot } from './bot.js';
import { Minimap } from './minimap.js';

// Cena, câmera e renderizador
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// Ajuste ao redimensionar
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Luzes
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Solo
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
const ground    = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Controles de primeira pessoa
const controls = new PointerLockControls(camera, renderer.domElement);
const instructions = document.getElementById('instructions');
instructions.addEventListener('click', () => controls.lock());
controls.addEventListener('lock',   () => instructions.style.display = 'none');
controls.addEventListener('unlock', () => instructions.style.display = '');

// Cria bots
const bots = [];
for (let i = 0; i < 5; i++) {
  const x = (Math.random() - 0.5) * 50;
  const z = (Math.random() - 0.5) * 50;
  bots.push(new Bot(scene, x, z));
}

// Minimap
const minimap = new Minimap(scene);

// Raycaster para tiro
const raycaster = new THREE.Raycaster();

// Container de dano
const damageContainer = document.getElementById('damageContainer');

function showDamage(point3D, amount) {
  const vector = point3D.clone().project(camera);
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

  const span = document.createElement('span');
  span.className = 'damageText';
  span.style.left = `${x}px`;
  span.style.top  = `${y}px`;
  span.textContent = amount;
  damageContainer.appendChild(span);

  setTimeout(() => damageContainer.removeChild(span), 1000);
}

// Disparo ao clicar (botão esquerdo) com cursor travado
window.addEventListener('click', () => {
  if (!controls.isLocked) return;

  // Origem e direção
  const origin    = camera.position.clone();
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  raycaster.set(origin, direction);

  const hits = raycaster.intersectObjects(bots.map(b => b.mesh));
  if (hits.length > 0) {
    const hit = hits[0];
    const bot = bots.find(b => b.mesh === hit.object);
    if (bot && bot.health > 0) {
      const dmg = Math.floor(Math.random() * 20) + 5;
      bot.health -= dmg;
      showDamage(hit.point, dmg);
      if (bot.health <= 0) scene.remove(bot.mesh);
    }
  }
});

// Loop de jogo
let lastTime = performance.now();
function animate(time) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  bots.forEach(b => b.update(delta));

  renderer.render(scene, camera);
  minimap.render();

  requestAnimationFrame(animate);
}
animate();
