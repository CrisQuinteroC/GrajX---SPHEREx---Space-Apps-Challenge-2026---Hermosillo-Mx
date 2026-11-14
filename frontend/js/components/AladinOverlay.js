/**
 * GrajX — AladinOverlay Component
 * Comparador Histórico entre AllWISE (2010) y SPHEREx (2025) con 15 años de línea base.
 * Muestra vectores de movimiento propio de Gaia DR3.
 */

import { store } from '../state.js';

export class AladinOverlay {
  constructor(container) {
    this.container = container;
    this.viewMode = 'spherex';
    this.init();
  }

  init() {
    this.render();
    this.attachEvents();
    this.drawComparisonScene();
  }

  render() {
    this.container.innerHTML = `
      <div class="comparison-header">
        <h3>Línea Base Histórica (15 Años)</h3>
        <div class="comparison-toggle-group">
          <button type="button" class="comparison-btn" data-view="wise">WISE 2010</button>
          <button type="button" class="comparison-btn active" data-view="spherex">SPHEREx 2025</button>
          <button type="button" class="comparison-btn" data-view="split">Superposición</button>
        </div>
      </div>

      <div class="comparison-view-area">
        <canvas id="comparison-canvas" width="400" height="150" style="width: 100%; height: 100%; display: block;"></canvas>
      </div>
    `;
  }

  drawComparisonScene() {
    const canvas = this.container.querySelector('#comparison-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const s = store.getState();
    const isBarnard = Math.abs(s.ra - 269.45208) < 0.1;

    ctx.fillStyle = "#060910";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#64748b";
    for (let i = 0; i < 20; i++) {
      const rx = (i * 73) % w;
      const ry = (i * 47) % h;
      ctx.fillRect(rx, ry, 1.2, 1.2);
    }

    const pos2010X = w * 0.38;
    const pos2010Y = h * 0.58;
    const pos2025X = isBarnard ? w * 0.62 : w * 0.50;
    const pos2025Y = isBarnard ? h * 0.38 : h * 0.50;

    if (this.viewMode === 'wise' || this.viewMode === 'split') {
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(pos2010X, pos2010Y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("WISE 2010", pos2010X - 25, pos2010Y + 16);
    }

    if (this.viewMode === 'spherex' || this.viewMode === 'split') {
      ctx.fillStyle = "#00E5FF";
      ctx.beginPath();
      ctx.arc(pos2025X, pos2025Y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#00E5FF";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("SPHEREx 2025", pos2025X - 35, pos2025Y - 10);
    }

    if (this.viewMode === 'split' && isBarnard) {
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pos2010X, pos2010Y);
      ctx.lineTo(pos2025X, pos2025Y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#10B981";
      ctx.font = "10px sans-serif";
      ctx.fillText("Vector Gaia DR3 (10.3\"/a)", (pos2010X + pos2025X) / 2 - 35, (pos2010Y + pos2025Y) / 2 + 14);
    }
  }

  attachEvents() {
    const btns = this.container.querySelectorAll('.comparison-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.viewMode = btn.dataset.view;
        this.drawComparisonScene();
      });
    });

    store.subscribe('ra', () => this.drawComparisonScene());
  }
}
