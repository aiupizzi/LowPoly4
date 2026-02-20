export function createBloomPipeline({ three, scene, camera, renderer, size = { width: 1280, height: 720 } }) {
  const composer = new three.EffectComposer(renderer);
  composer.addPass(new three.RenderPass(scene, camera));
  const bloom = new three.UnrealBloomPass(
    new three.Vector2(size.width, size.height),
    0.95,
    0.6,
    0.82,
  );
  composer.addPass(bloom);
  return { composer, bloom };
}
