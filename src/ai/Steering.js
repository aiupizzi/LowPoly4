export class Steering {
  seek(from, to, strength = 1) {
    return {
      x: (to.x - from.x) * strength,
      z: (to.z - from.z) * strength
    };
  }
}
