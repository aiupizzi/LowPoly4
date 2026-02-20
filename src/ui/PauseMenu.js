const KEY_OPTIONS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'KeyQ', 'KeyE', 'KeyF', 'MouseLeft', 'MouseRight'];

export class PauseMenu {
  constructor({ root, initialSettings, onApply, onPauseChange }) {
    this.root = root;
    this.onApply = onApply;
    this.onPauseChange = onPauseChange;
    this.settings = structuredClone(initialSettings);
    this.paused = false;

    this.build();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.toggle();
    });
  }

  build() {
    this.element = document.createElement('div');
    Object.assign(this.element.style, {
      position: 'absolute', inset: '0', background: 'rgba(8,12,16,0.74)', display: 'none',
      alignItems: 'center', justifyContent: 'center', zIndex: '30', color: '#d8ecff', fontFamily: 'monospace'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: '420px', background: 'rgba(16,22,30,0.92)', border: '1px solid rgba(130,180,255,0.3)', borderRadius: '12px', padding: '14px'
    });

    const controls = ['forward', 'backward', 'left', 'right', 'brake', 'shoot', 'altFire'];
    const options = KEY_OPTIONS.map((code) => `<option value="${code}">${code}</option>`).join('');

    panel.innerHTML = `
      <h3 style="margin:4px 0 12px;">PAUSED</h3>
      <label>Steering sensitivity: <span id="sensVal">${this.settings.steeringSensitivity.toFixed(2)}</span></label>
      <input id="sens" type="range" min="0.5" max="2" step="0.05" value="${this.settings.steeringSensitivity}" style="width:100%" />
      <div style="margin-top:12px;font-size:12px;opacity:0.9">Keybindings</div>
      ${controls.map((name) => `<div style="display:flex;justify-content:space-between;margin-top:6px"><span>${name}</span><select data-bind="${name}">${options}</select></div>`).join('')}
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
        <button id="resumeBtn">Resume</button>
      </div>`;

    this.element.appendChild(panel);
    this.root.appendChild(this.element);

    this.sensEl = panel.querySelector('#sens');
    this.sensValEl = panel.querySelector('#sensVal');
    this.sensEl.addEventListener('input', () => {
      this.settings.steeringSensitivity = Number(this.sensEl.value);
      this.sensValEl.textContent = this.settings.steeringSensitivity.toFixed(2);
      this.apply();
    });

    controls.forEach((name) => {
      const select = panel.querySelector(`[data-bind="${name}"]`);
      select.value = this.settings.keybindings[name];
      select.addEventListener('change', () => {
        this.settings.keybindings[name] = select.value;
        this.apply();
      });
    });

    panel.querySelector('#resumeBtn').addEventListener('click', () => this.toggle(false));
  }

  apply() {
    this.onApply?.(structuredClone(this.settings));
  }

  toggle(next = !this.paused) {
    this.paused = next;
    this.element.style.display = this.paused ? 'flex' : 'none';
    this.onPauseChange?.(this.paused);
  }
}
