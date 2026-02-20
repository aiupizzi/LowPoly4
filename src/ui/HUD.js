export class HUD {
  constructor(root) {
    this.root = root;
    this.element = document.createElement('div');
    Object.assign(this.element.style, {
      position: 'absolute',
      top: '16px',
      left: '16px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: 'rgba(0,0,0,0.45)',
      fontSize: '12px',
      color: '#d8ecff',
      lineHeight: '1.5',
      fontFamily: 'monospace',
      pointerEvents: 'none'
    });
    this.root.appendChild(this.element);
    this.update({ heat: 0, speed: 0, blocksDestroyed: 0, money: 0 });
  }

  update({ heat, speed, blocksDestroyed, money }) {
    const stars = '★'.repeat(heat) + '☆'.repeat(Math.max(0, 5 - heat));
    this.element.innerHTML = `SPD: ${speed.toFixed(1)} MPH<br>HEAT: ${stars}<br>BLOCKS: ${blocksDestroyed}<br>CREDITS: $${money}`;
  }
}
