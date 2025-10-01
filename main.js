import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/PointerLockControls.js';
import { Bot } from './bot.js';
import { Minimap } from './minimap.js';

// cena, câmera e render
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// luzes e ambiente
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// chão
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// controles com movimento (WASD + espaço)
const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');
instructions.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => instructions.style.display = 'none');
controls.addEventListener('unlock', () => instructions.style.display = 'block');

const moveState = { forward: false, back: false, left: false, right: false, jump: false };
let velocity = new THREE.Vector3();
const speed = 7;
const gravity = 30;
let canJump = false;

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW') moveState.forward = true;
  if (e.code === 'KeyS') moveState.back = true;
  if (e.code === 'KeyA') moveState.left = true;
  if (e.code === 'KeyD') moveState.right = true;
  if (e.code === 'Space') {
    if (canJump) {
      velocity.y = 8;
      canJump = false;
    }
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') moveState.forward = false;
  if (e.code === 'KeyS') moveState.back = false;
  if (e.code === 'KeyA') moveState.left = false;
  if (e.code === 'KeyD') moveState.right = false;
});

// bots
const damageContainer = document.getElementById('damageContainer');
const bots = [];
for (let i = 0; i < 6; i++) {
  const x = (Math.random() - 0.5) * 60;
  const z = (Math.random() - 0.5) * 60;
  bots.push(new Bot(scene, x, z, damageContainer));
}

// minimap
const minimap = new Minimap(scene, camera, bots);

// raycaster para tiros
const raycaster = new THREE.Raycaster();

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

  setTimeout(() => {
    if (span.parentElement) damageContainer.removeChild(span);
  }, 1000);
}

// tiro (click) com pointer lock
window.addEventListener('click', () => {
  if (!controls.isLocked) return;

  const origin = camera.position.clone();
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  raycaster.set(origin, direction);

  const aliveMeshes = bots.filter(b => b.mesh).map(b => b.mesh);
  const hits = raycaster.intersectObjects(aliveMeshes);
  if (hits.length > 0) {
    const hit = hits[0];
    const bot = hit.object.userData.bot;
    if (bot && bot.health > 0) {
      const dmg = Math.floor(Math.random() * 20) + 5;
      bot.takeDamage(dmg);
      showDamage(hit.point, dmg);
      if (bot.health <= 0) {
        bot.destroy();
        const idx = bots.indexOf(bot);
        if (idx !== -1) bots.splice(idx, 1);
      }
    }
  }
});

// animação
let lastTime = performance.now();
function animate(time) {
  const delta = Math.min(0.05, (time - lastTime) / 1000); // clamp para estabilidade
  lastTime = time;

  // Movimento do jogador simples
  const speedFactor = speed * delta;
  const direction = new THREE.Vector3();
  if (moveState.forward) direction.z -= 1;
  if (moveState.back) direction.z += 1;
  if (moveState.left) direction.x -= 1;
  if (moveState.right) direction.x += 1;
  direction.normalize();

  // aplica rotação da câmera para direção
  if (controls.isLocked) {
    const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
    const move = new THREE.Vector3(direction.x, 0, direction.z).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.x += move.x * speedFactor * 60;
    velocity.z += move.z * speedFactor * 60;

    velocity.y -= gravity * delta;
    controls.getObject().position.addScaledVector(new THREE.Vector3(velocity.x, 0, velocity.z), delta);
    controls.getObject().position.y += velocity.y * delta;

    if (controls.getObject().position.y < 1.8) {
      velocity.y = 0;
      controls.getObject().position.y = 1.8;
      canJump = true;
    }
  }

  // Atualiza bots (IA)
  const playerPos = controls.getObject().position.clone();
  playerPos.y = 0;
  for (const b of bots) {
    b.update(delta, playerPos);
  }

  // Atualiza posição das barras de vida (projeção)
  for (const b of bots) {
    if (!b.mesh || !b.healthEl) continue;
    const worldPos = b.mesh.position.clone();
    worldPos.y += 2.5;
    const projected = worldPos.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    b.healthEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    b.healthEl.style.pointerEvents = 'none';
  }

  renderer.render(scene, camera);
  minimap.render();

  requestAnimationFrame(animate);
}
animate();
