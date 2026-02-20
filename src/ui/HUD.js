export class HUD {
  constructor(root) {
    this.root = root;
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.top = '16px';
    this.element.style.left = '16px';
    this.element.style.padding = '10px 12px';
    this.element.style.borderRadius = '10px';
    this.element.style.background = 'rgba(0,0,0,0.45)';
    this.element.style.fontSize = '12px';
    this.element.style.lineHeight = '1.5';
    this.element.style.pointerEvents = 'none';
    this.root.appendChild(this.element);
    this.update({ fps: 0, heat: 0, speed: 0, time: 0 });
  }

  update({ fps, heat, speed, time }) {
    this.element.innerHTML = `FPS: ${fps}<br>HEAT: ${heat.toFixed(0)}<br>SPEED: ${speed.toFixed(1)}<br>TIME: ${time.toFixed(1)}s`;
  }
}
