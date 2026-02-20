export class HUD {
  constructor(root) {
    this.root = root;
    this.root.className = 'hud-overlay';
  }

  render({ speedMps, heatStars, blocksDestroyed, currency }) {
    const mph = Math.round(speedMps * 2.23694);
    const stars = '★'.repeat(heatStars) + '☆'.repeat(5 - heatStars);
    this.root.innerHTML = `
      <div>MPH: <b>${mph}</b></div>
      <div>HEAT: <b>${stars}</b></div>
      <div>BLOCKS: <b>${blocksDestroyed}</b></div>
      <div>CURRENCY: <b>$${currency}</b></div>
    `;
  }
}

export function injectHUDStyles(doc) {
  const style = doc.createElement('style');
  style.textContent = `
  .hud-overlay {
    position: fixed;
    top: 12px;
    left: 12px;
    color: #fff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
    pointer-events: none;
    line-height: 1.4;
  }`;
  doc.head.appendChild(style);
}
