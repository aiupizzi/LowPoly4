# Voxel-State Guerrilla (LowPoly4)

A browser-based **3D open-world voxel sandbox** prototype built with:

- **Three.js** for rendering
- **cannon-es** for physics simulation
- **GSAP/postprocessing** ecosystem for visual polish

This project is organized around a **modular, class-based runtime** (`Game`, `World`, `Player`, `VehicleController`, `ChunkManager`, AI, combat, UI, VFX) so systems can be iterated independently.

---

## Features

### 1) Procedural voxel city with chunk streaming

- World is streamed in **16x16 chunks** around the player.
- Chunks are spawned/despawned dynamically based on the active chunk and a render radius.
- Buildings/blocks are rendered with **`THREE.InstancedMesh`** for performance.
- Special "neon" voxels are rendered with emissive material so Bloom can accent them.

### 2) Destruction + structural integrity behavior

- Voxels can be removed by shooting, explosions, or high-speed vehicle impacts.
- Debris particles are spawned from an object pool on destruction.
- If a supporting voxel is removed, voxels directly above can convert into dynamic physics cubes and fall.

### 3) RaycastVehicle driving model

- Vehicle uses **`CANNON.RaycastVehicle`** (not a simple translated mesh).
- Four wheels with configurable suspension stiffness, damping and friction slip.
- Input handling includes steering, acceleration/reverse and brake.
- Drive behavior includes a simple torque curve:
  - lower force at high speed,
  - stronger mid-band acceleration.
- High-speed collisions can deform the world by destroying impacted voxels and applying recoil impulse.

### 4) Heat + police AI escalation

- Heat is modeled as a **5-star system**.
- Escalation behavior:
  - **Star 1+**: baseline police cube pursuit.
  - **Star 3+**: more units + PIT-style side pressure behavior.
  - **Star 5**: dynamic blockade spawning ahead of player movement.
- AI movement uses steering behaviors (`seek`, `arrive`, `avoidObstacles`) around voxel obstacles.

### 5) Combat + explosive interaction

- Center-screen raycast shooting removes targeted voxels.
- Alternate fire triggers radial explosions that:
  - push nearby dynamic physics bodies,
  - remove nearby blocks probabilistically.

### 6) HUD + persistence

- Overlay HUD includes:
  - Speed (MPH)
  - Heat stars
  - Blocks destroyed
  - Credits/currency
- Local storage persistence remembers:
  - player position
  - current money

### 7) Visual juice

- Bloom postprocessing enabled through the `postprocessing` package.
- Neon voxel tops and debris particles increase readability and impact feedback.

---

## Controls

- `W` / `S` — accelerate / reverse
- `A` / `D` — steer
- `Space` — brake
- `Left Click` — shoot
- `Right Click` — alt-fire explosion

---

## Project structure

```text
src/
  ai/
    HeatSystem.js         # Wanted/heat stars and destruction accounting
    PoliceAgent.js        # Police spawning, escalation and pursuit behavior
    Steering.js           # Seek/arrive/avoid steering utilities

  combat/
    WeaponSystem.js       # Center-screen raycast shooting + alt-fire
    ExplosionSystem.js    # Radial impulses + block destruction

  core/
    Game.js               # Main update loop and cross-system orchestration

  player/
    Player.js             # Player viewpoint state synced from vehicle body

  state/
    SaveSystem.js         # localStorage save/load

  ui/
    HUD.js                # On-screen telemetry and status

  vehicles/
    VehicleController.js  # Cannon RaycastVehicle and drive logic

  vfx/
    ParticlePool.js       # Reusable debris particle object pool
    PostFX.js             # Bloom postprocessing pipeline

  world/
    World.js              # Physics world setup/materials/contact config
    ChunkManager.js       # Chunk streaming + instanced voxel data
    Building.js           # Building/destruction wrapper hooks

main.js                  # Scene bootstrap + dependency wiring
```

---

## Downloads

- Latest release: https://github.com/<org>/<repo>/releases/latest
- Windows (.exe): https://github.com/<org>/<repo>/releases/latest
- Optional integrity check: download the matching `.sha256` file from the release assets and verify locally.

## Getting started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

### Desktop (Electron) build

```bash
npm run dist:win
```

This command builds the Vite app and produces Windows distributables in `release/` (NSIS installer and portable `.exe`).

## Performance notes

- Instanced rendering is used for voxel geometry to reduce draw calls.
- Chunk streaming limits active world data near the player.
- Debris particles are pooled to avoid per-event allocations.
- Physics uses SAP broadphase and fixed-step simulation for stability.

---

## Current limitations / prototype caveats

- Voxel generation is deterministic but simple (sin-seeded density/height function).
- Structural collapse currently promotes directly-supported voxels; full flood-fill support checks are not yet implemented.
- AI navigation is steering-based and lightweight (not full navmesh pathfinding).
- Balance/tuning (vehicle, AI aggression, destruction economy) is intentionally prototype-level.

---

## Roadmap ideas

- Full connected-structure integrity solver for large buildings.
- Better procedural city grammar (roads, districts, landmarks).
- Dedicated minimap + mission hooks.
- More advanced vehicle damage states and wheel visuals.
- Save slots and expanded progression economy.

---

## Windows verification checklist

- [ ] App launches in a desktop window without dev tools.
- [ ] Controls work (`WASD`, `Space`, left click, right click).
- [ ] Save/load works in the packaged desktop app.

## License

No license file is currently included in this repository.
Add one (e.g. MIT) before external distribution.
