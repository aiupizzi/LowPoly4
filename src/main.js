import * as THREE from 'three';
import { Game } from './core/Game.js';
import { EventBus } from './core/EventBus.js';
import { World } from './world/World.js';
import { ChunkManager } from './world/ChunkManager.js';
import { Building } from './world/Building.js';
import { Player } from './player/Player.js';
import { VehicleController } from './vehicles/VehicleController.js';
import { HeatSystem } from './ai/HeatSystem.js';
import { PoliceAgent } from './ai/PoliceAgent.js';
import { WeaponSystem } from './combat/WeaponSystem.js';
import { ExplosionSystem } from './combat/ExplosionSystem.js';
import { HUD } from './ui/HUD.js';
import { SaveSystem } from './state/SaveSystem.js';
import { ParticlePool } from './vfx/ParticlePool.js';
import { PostFX } from './vfx/PostFX.js';
import { MissionSystem } from './gameplay/MissionSystem.js';
import { FeedbackSystem } from './vfx/FeedbackSystem.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { PickupSystem } from './world/PickupSystem.js';

const app = document.querySelector('#app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#151a21');

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 12, 18);

scene.add(new THREE.AmbientLight('#ffffff', 0.8));
const dir = new THREE.DirectionalLight('#fff8df', 1.4);
dir.position.set(20, 30, 10);
scene.add(dir);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1200, 1200),
  new THREE.MeshStandardMaterial({ color: '#2d3642', roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const eventBus = new EventBus();
const world = new World({ scene });
const player = new Player(scene, camera);
const particlePool = new ParticlePool(scene);
const chunkManager = new ChunkManager({ scene, world, particlePool });
const vehicleController = new VehicleController({ scene, world, player, chunkManager, eventBus });
const heatSystem = new HeatSystem(vehicleController);
const policeAgent = new PoliceAgent({ scene, world, heatSystem, vehicleController, chunkManager, eventBus });
const explosionSystem = new ExplosionSystem(world, chunkManager, eventBus);
const weaponSystem = new WeaponSystem({ camera, scene, chunkManager, heatSystem, explosionSystem, eventBus });
const postFX = new PostFX({ renderer, scene, camera });
const hud = new HUD(app, eventBus);
const feedbackSystem = new FeedbackSystem({ camera, root: app, eventBus });
const audioSystem = new AudioSystem({ eventBus });
const saveSystem = new SaveSystem();
const saveData = saveSystem.load();
const building = new Building(chunkManager);
const missionSystem = new MissionSystem({
  heatSystem,
  vehicleController,
  policeAgent,
  chunkManager,
  weaponSystem,
  hud,
  state: saveData
});

let game;

const pickupSystem = new PickupSystem({
  scene,
  eventBus,
  vehicleController,
  heatSystem,
  chunkManager,
  addMoney: (amount) => game?.addMoney(amount)
});

game = new Game({
  camera,
  world,
  player,
  vehicleController,
  heatSystem,
  policeAgent,
  weaponSystem,
  explosionSystem,
  particlePool,
  postFX,
  hud,
  saveSystem,
  chunkManager,
  building,
  missionSystem,
  feedbackSystem,
  audioSystem,
  pickupSystem
});

game.start();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
