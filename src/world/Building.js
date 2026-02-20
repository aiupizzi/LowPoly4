export class Building {
  constructor({ id, voxels = [], supportPredicate }) {
    this.id = id;
    this.voxels = new Map(); // key => voxel
    this.supportedBy = new Map(); // key => Set<key>
    this.supportGraph = new Map(); // key => Set<dependent>
    this.dynamicBodies = [];
    this.supportPredicate = supportPredicate || ((v) => v.y === 0);

    voxels.forEach((v) => this.addVoxel(v));
  }

  static key({ x, y, z }) {
    return `${x},${y},${z}`;
  }

  addVoxel(voxel) {
    const key = Building.key(voxel);
    this.voxels.set(key, { ...voxel, dynamic: false });
    this.rebuildSupportLinksFor(key);
    const aboveKey = Building.key({ x: voxel.x, y: voxel.y + 1, z: voxel.z });
    if (this.voxels.has(aboveKey)) this.rebuildSupportLinksFor(aboveKey);
  }

  rebuildSupportLinksFor(key) {
    const voxel = this.voxels.get(key);
    if (!voxel) return;

    const supports = new Set();
    if (this.supportPredicate(voxel)) {
      supports.add('__GROUND__');
    }

    const belowKey = Building.key({ x: voxel.x, y: voxel.y - 1, z: voxel.z });
    if (this.voxels.has(belowKey)) supports.add(belowKey);

    if (this.supportedBy.has(key)) {
      for (const prev of this.supportedBy.get(key)) {
        if (this.supportGraph.has(prev)) this.supportGraph.get(prev).delete(key);
      }
    }

    this.supportedBy.set(key, supports);
    for (const s of supports) {
      if (!this.supportGraph.has(s)) this.supportGraph.set(s, new Set());
      this.supportGraph.get(s).add(key);
    }
  }

  removeVoxel(position, toDynamicBody) {
    const key = Building.key(position);
    if (!this.voxels.has(key)) return { removed: false, dynamicBodies: [] };

    this.voxels.delete(key);
    const dependents = [...(this.supportGraph.get(key) || [])];
    this.supportGraph.delete(key);
    this.supportedBy.delete(key);

    const detached = [];
    for (const depKey of dependents) {
      const supports = this.supportedBy.get(depKey) || new Set();
      supports.delete(key);
      if (supports.size === 0 || (supports.size === 1 && supports.has('__GROUND__') === false && ![...supports].some((k) => this.voxels.has(k)))) {
        const voxel = this.voxels.get(depKey);
        if (voxel) {
          voxel.dynamic = true;
          this.voxels.delete(depKey);
          this.supportedBy.delete(depKey);
          const body = toDynamicBody(voxel);
          detached.push(body);
          this.dynamicBodies.push(body);
        }
      }
    }

    return { removed: true, dynamicBodies: detached };
  }
}
