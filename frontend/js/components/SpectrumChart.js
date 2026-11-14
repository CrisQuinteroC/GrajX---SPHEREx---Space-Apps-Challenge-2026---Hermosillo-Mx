/**
 * GrajX — SpectrumChart Component
 * Visualizador de Distribución Espectral de Energía (102 bandas de 0.75 a 5.0 um).
 */

import { store } from '../state.js';
import { api } from '../api.js';

export class SpectrumChart {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.spectrumData = null;
    this.init();
  }

  async init() {
    this.renderSkeleton();
    this.canvas = this.container.querySelector('#spectrum-chart-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    this.attachEvents();
    await this.fetchSpectrum();
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="spectrum-header">
        <h3>Espectro Infrarrojo (0.75 a 5.0 um)</h3>
        <span class="preset-badge" id="spectrum-source-badge">102 Bandas LVF</span>
      </div>

      <div class="spectrum-canvas-wrapper" id="spectrum-wrapper">
        <canvas id="spectrum-chart-canvas" class="spectrum-chart-canvas"></canvas>
      </div>

      <div class="molecules-tags-row" id="molecules-tags-container"></div>
      <p class="info-story" id="spectrum-interpretation-text" style="margin-top: 8px; font-size: 13px;"></p>
    `;
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.renderChart();
  }

  async fetchSpectrum(px = 0.5, py = 0.5) {
    const s = store.getState();
    this.spectrumData = await api.getSpectrum(s.ra, s.dec, px, py);
    this.renderMolecules();
    this.renderChart();
  }

  renderMolecules() {
    const tagsContainer = this.container.querySelector('#molecules-tags-container');
    const interpText = this.container.querySelector('#spectrum-interpretation-text');

    if (!this.spectrumData) return;

    tagsContainer.innerHTML = this.spectrumData.molecules.map(m => `
      <span class="molecule-tag" title="Absorción detectada a ${m.wavelength}">
        ${m.name} (${m.confidence})
      </span>
    `).join('');

    interpText.textContent = this.spectrumData.interpretation;
  }

  renderChart() {
    if (!this.ctx || !this.canvas || !this.spectrumData) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    const padLeft = 38;
    const padRight = 16;
    const padTop = 15;
    const padBottom = 22;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const pts = this.spectrumData.points;
    if (pts.length < 2) return;

    const minWl = 0.75;
    const maxWl = 5.0;
    const maxFlux = Math.max(...pts.map(p => p.flux)) * 1.15;

    const getX = (wl) => padLeft + ((wl - minWl) / (maxWl - minWl)) * plotW;
    const getY = (flux) => padTop + plotH - (flux / maxFlux) * plotH;

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    this.ctx.lineWidth = 1;

    for (let wl = 1.0; wl <= 5.0; wl += 1.0) {
      const gx = getX(wl);
      this.ctx.beginPath();
      this.ctx.moveTo(gx, padTop);
      this.ctx.lineTo(gx, padTop + plotH);
      this.ctx.stroke();

      this.ctx.fillStyle = "#64748b";
      this.ctx.font = "11px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`${wl.toFixed(0)} um`, gx, h - 6);
    }

    const grad = this.ctx.createLinearGradient(padLeft, 0, padLeft + plotW, 0);
    grad.addColorStop(0, "#FF6361");
    grad.addColorStop(0.3, "#F59E0B");
    grad.addColorStop(0.6, "#10B981");
    grad.addColorStop(1, "#00E5FF");

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(getX(pts[0].wavelength_um), padTop + plotH);
    pts.forEach(p => {
      this.ctx.lineTo(getX(p.wavelength_um), getY(p.flux));
    });
    this.ctx.lineTo(getX(pts[pts.length - 1].wavelength_um), padTop + plotH);
    this.ctx.closePath();

    const fillGrad = this.ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    fillGrad.addColorStop(0, "rgba(0, 229, 255, 0.22)");
    fillGrad.addColorStop(1, "rgba(6, 9, 19, 0.0)");
    this.ctx.fillStyle = fillGrad;
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.strokeStyle = grad;
    this.ctx.lineWidth = 2.0;
    this.ctx.beginPath();
    pts.forEach((p, idx) => {
      const px = getX(p.wavelength_um);
      const py = getY(p.flux);
      if (idx === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    });
    this.ctx.stroke();

    const waterWl = 3.05;
    const waterX = getX(waterWl);
    this.ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(waterX, padTop);
    this.ctx.lineTo(waterX, padTop + plotH);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = "#00E5FF";
    this.ctx.font = "bold 10px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("H2O Ice", waterX, padTop + 12);
  }

  attachEvents() {
    window.addEventListener('grajx:sample-spectrum', (e) => {
      this.fetchSpectrum(e.detail.px, e.detail.py);
    });

    store.subscribe('ra', () => this.fetchSpectrum());
  }
}
