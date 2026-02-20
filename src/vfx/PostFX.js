import { EffectComposer, EffectPass, RenderPass, BloomEffect } from 'postprocessing';

export class PostFX {
  constructor({ renderer, scene, camera }) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 0.2, luminanceThreshold: 0.6 })));
  }

  render() {
    this.composer.render();
  }
}
