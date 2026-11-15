/**
 * GrajX — SpectrumChart Component
 * Visualizador de Distribución Espectral de Energía (102 bandas de 0.75 a 5.0 um).
 */

import { store } from '../state.js';
import { api } from '../api.js';
import { i18n } from '../i18n.js';

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
        <h3 data-i18n="spectrum.title">${i18n.t('spectrum.title')}</h3>
        <span class="preset-badge" id="spectrum-source-badge" data-i18n="spectrum.badge">${i18n.t('spectrum.badge')}</span>
      </div>

      <div class="spectrum-canvas-wrapper" id="spectrum-wrapper">
        <canvas id="spectrum-chart-canvas" class="spectrum-chart-canvas"></canvas>
      </div>

      <div class="molecules-tags-row" id="molecules-tags-container"></div>
    `;
  }

  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderChart();
  }

  scheduleFetch(px = 0.5, py = 0.5, delayMs = 0) {
    this._pendingSample = { px, py };
    if (this._fetchDebounceTimer) {
      clearTimeout(this._fetchDebounceTimer);
      this._fetchDebounceTimer = null;
    }
    if (delayMs > 0) {
      this._fetchDebounceTimer = setTimeout(() => {
        this._fetchDebounceTimer = null;
        this._fetchScheduled = false;
        const sample = this._pendingSample || { px: 0.5, py: 0.5 };
        this.fetchSpectrum(sample.px, sample.py);
      }, delayMs);
      return;
    }
    if (this._fetchScheduled) return;
    this._fetchScheduled = true;
    queueMicrotask(() => {
      this._fetchScheduled = false;
      const sample = this._pendingSample || { px: 0.5, py: 0.5 };
      this.fetchSpectrum(sample.px, sample.py);
    });
  }

  async fetchSpectrum(px = 0.5, py = 0.5) {
    const s = store.getState();
    const seq = (this._fetchSeq || 0) + 1;
    this._fetchSeq = seq;
    try {
      const data = await api.getSpectrum(s.ra, s.dec, px, py, s.fov, s.source);
      if (seq !== this._fetchSeq) return;
      this.spectrumData = data;
      this.updateBadge();
      this.renderMolecules();
      this.renderChart();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      console.warn("Spectrum fetch error:", e);
    }
  }

  updateBadge() {
    const badge = this.container.querySelector('#spectrum-source-badge');
    if (!badge) return;
    if (!this.spectrumData) {
      badge.textContent = i18n.t('spectrum.badge');
      return;
    }
    const d = this.spectrumData;
    const nPts = d.points ? d.points.length : 0;
    const unit = d.flux_unit || 'MJy/sr';
    badge.textContent = `${unit} · ${nPts} ch`;
    if (typeof d.target_ra_deg === 'number' && typeof d.target_dec_deg === 'number') {
      badge.title = `RA ${d.target_ra_deg.toFixed(4)}°, Dec ${d.target_dec_deg.toFixed(4)}° (${d.aperture_arcsec || 4.0}" ap)`;
    }
  }

  renderMolecules() {
    const tagsContainer = this.container.querySelector('#molecules-tags-container');

    if (!this.spectrumData) return;

    tagsContainer.innerHTML = this.spectrumData.molecules.map(m => {
      const wl = i18n.num(parseFloat(m.wavelength), 2);
      return `
        <span class="molecule-tag" title="${i18n.t('spectrum.absorptionAt', { wl })}">
          ${this.moleculeName(m)} (${m.confidence})
        </span>
      `;
    }).join('');
  }

  /** Identificador estable de la molécula (el API actual lo envía; se deduce por nombre como respaldo). */
  moleculeId(m) {
    if (m.id) return m.id;
    const n = (m.name || '').toLowerCase();
    if (/hielo|ice|glace/.test(n)) return 'water_ice';
    if (/vapor|vapeur/.test(n)) return 'water_vapor';
    if (/metano|methane|méthane/.test(n)) return 'methane';
    if (/di[óo]xi|dioxide|dioxyde|co2|co₂/.test(n)) return 'co2';
    if (/mon[óo]xi|monoxide|monoxyde|\(co\)/.test(n)) return 'co';
    return null;
  }

  moleculeName(m) {
    const id = this.moleculeId(m);
    return id && i18n.has(`mol.${id}`) ? i18n.t(`mol.${id}`) : m.name;
  }

  interpretationText() {
    const d = this.spectrumData;
    const id = d.interpretation_id || (/250 K/.test(d.interpretation || '') ? 'cold_body' : 'continuous');
    return i18n.has(`spectrum.interp.${id}`) ? i18n.t(`spectrum.interp.${id}`) : d.interpretation;
  }

  renderChart() {
    if (!this.ctx || !this.canvas || !this.spectrumData) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    const padLeft = 46;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 22;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const rawPts = this.spectrumData.points || [];
    const pts = rawPts
      .filter(p => Number.isFinite(p.wavelength_um) && Number.isFinite(p.flux))
      .slice()
      .sort((a, b) => a.wavelength_um - b.wavelength_um);
    if (pts.length < 2) return;

    const minWl = 0.75;
    const maxWl = 5.0;
    const loVals = pts.map(p => p.flux - (p.flux_err || 0));
    const hiVals = pts.map(p => p.flux + (p.flux_err || 0));
    let minFlux = Math.min(0, ...loVals);
    let maxFlux = Math.max(...hiVals);
    if (maxFlux <= minFlux) maxFlux = minFlux + 1;
    const span = maxFlux - minFlux;
    minFlux = minFlux < 0 ? minFlux - span * 0.05 : 0;
    maxFlux = maxFlux + span * 0.14;
    const fluxRange = maxFlux - minFlux || 1;

    const getX = (wl) => padLeft + ((wl - minWl) / (maxWl - minWl)) * plotW;
    const getY = (flux) => padTop + plotH - ((flux - minFlux) / fluxRange) * plotH;

    const DETECTOR_RANGES = {
      D1: [0.75, 1.1],
      D2: [1.1, 1.6],
      D3: [1.6, 2.4],
      D4: [2.4, 3.8],
      D5: [3.8, 4.4],
      D6: [4.4, 5.0],
    };
    const DETECTOR_COLORS = {
      D1: '#60A5FA',
      D2: '#34D399',
      D3: '#A7F3D0',
      D4: '#FBBF24',
      D5: '#FB923C',
      D6: '#F472B6',
    };

    const s = store.getState();
    const activeDetector = DETECTOR_RANGES[s.detector] ? s.detector : null;

    // Resaltar franja espectral del detector seleccionado (D1..D6)
    if (activeDetector) {
      const [wlMin, wlMax] = DETECTOR_RANGES[activeDetector];
      const bx1 = getX(wlMin);
      const bx2 = getX(wlMax);
      const col = DETECTOR_COLORS[activeDetector] || '#00E5FF';
      this.ctx.save();
      this.ctx.fillStyle = col;
      this.ctx.globalAlpha = 0.12;
      this.ctx.fillRect(bx1, padTop, Math.max(2, bx2 - bx1), plotH);
      this.ctx.globalAlpha = 0.55;
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(bx1, padTop, Math.max(2, bx2 - bx1), plotH);
      this.ctx.globalAlpha = 0.9;
      this.ctx.fillStyle = col;
      this.ctx.font = "bold 10px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(activeDetector, (bx1 + bx2) / 2, padTop + 12);
      this.ctx.restore();
    }

    // Wavelength vertical grid
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
      this.ctx.fillText(`${wl.toFixed(0)} µm`, gx, h - 6);
    }

    // Y-axis limits and zero baseline
    const fmtFlux = (v) => (Math.abs(v) >= 1000 || (Math.abs(v) > 0 && Math.abs(v) < 0.01) ? v.toExponential(1) : v.toFixed(1));
    this.ctx.fillStyle = "#64748b";
    this.ctx.font = "10px monospace";
    this.ctx.textAlign = "right";
    this.ctx.fillText(fmtFlux(maxFlux), padLeft - 5, padTop + 8);
    this.ctx.fillText(fmtFlux(minFlux), padLeft - 5, padTop + plotH);

    if (minFlux < 0) {
      const zeroY = getY(0);
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      this.ctx.setLineDash([2, 3]);
      this.ctx.beginPath();
      this.ctx.moveTo(padLeft, zeroY);
      this.ctx.lineTo(padLeft + plotW, zeroY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    const grad = this.ctx.createLinearGradient(padLeft, 0, padLeft + plotW, 0);
    grad.addColorStop(0, "#60A5FA");
    grad.addColorStop(0.3, "#34D399");
    grad.addColorStop(0.65, "#FBBF24");
    grad.addColorStop(1, "#F472B6");

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(getX(pts[0].wavelength_um), getY(Math.max(minFlux, 0)));
    pts.forEach(p => {
      this.ctx.lineTo(getX(p.wavelength_um), getY(p.flux));
    });
    this.ctx.lineTo(getX(pts[pts.length - 1].wavelength_um), getY(Math.max(minFlux, 0)));
    this.ctx.closePath();

    const fillGrad = this.ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    fillGrad.addColorStop(0, "rgba(0, 229, 255, 0.18)");
    fillGrad.addColorStop(1, "rgba(6, 9, 19, 0.0)");
    this.ctx.fillStyle = fillGrad;
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.strokeStyle = grad;
    this.ctx.lineWidth = 1.6;
    this.ctx.beginPath();
    pts.forEach((p, idx) => {
      const px = getX(p.wavelength_um);
      const py = getY(p.flux);
      if (idx === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    });
    this.ctx.stroke();

    // Detector-colored scatter points + error bars (red if flagged)
    pts.forEach((p) => {
      const px = getX(p.wavelength_um);
      const py = getY(p.flux);
      const err = Number.isFinite(p.flux_err) ? p.flux_err : 0;
      const inSelectedDetector = !activeDetector || p.detector === activeDetector;

      this.ctx.save();
      this.ctx.globalAlpha = inSelectedDetector ? 1.0 : 0.28;

      if (err > 0) {
        const yTop = Math.max(padTop, getY(p.flux + err));
        const yBot = Math.min(padTop + plotH, getY(p.flux - err));
        this.ctx.strokeStyle = p.flagged ? "rgba(239, 68, 68, 0.55)" : "rgba(255, 255, 255, 0.3)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(px, yTop);
        this.ctx.lineTo(px, yBot);
        this.ctx.moveTo(px - 2, yTop);
        this.ctx.lineTo(px + 2, yTop);
        this.ctx.moveTo(px - 2, yBot);
        this.ctx.lineTo(px + 2, yBot);
        this.ctx.stroke();
      }

      const ptColor = p.flagged ? "#EF4444" : (DETECTOR_COLORS[p.detector] || "#00E5FF");
      const radius = p.flagged ? 3.2 : (activeDetector && p.detector === activeDetector ? 3.8 : 2.3);
      this.ctx.fillStyle = ptColor;
      this.ctx.beginPath();
      this.ctx.arc(px, py, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Marcador vertical de la longitud de onda efectiva del cuadro actual
    const curFrame = s.frames && s.frames[s.currentFrameIndex];
    if (curFrame && Number.isFinite(curFrame.wavelength_um) && curFrame.wavelength_um >= minWl && curFrame.wavelength_um <= maxWl) {
      const fx = getX(curFrame.wavelength_um);
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
      this.ctx.lineWidth = 1.3;
      this.ctx.setLineDash([4, 3]);
      this.ctx.beginPath();
      this.ctx.moveTo(fx, padTop);
      this.ctx.lineTo(fx, padTop + plotH);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = "#F59E0B";
      this.ctx.font = "10px monospace";
      this.ctx.textAlign = fx > padLeft + plotW - 55 ? "right" : "left";
      const lx = fx > padLeft + plotW - 55 ? fx - 4 : fx + 4;
      this.ctx.fillText(`λ ${curFrame.wavelength_um.toFixed(2)}µm`, lx, padTop + plotH - 6);
      this.ctx.restore();
    }

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
    this.ctx.fillText(i18n.t('spectrum.waterIce'), waterX, padTop + 12);
  }

  attachEvents() {
    window.addEventListener('grajx:sample-spectrum', (e) => {
      this.scheduleFetch(e.detail.px, e.detail.py, 0);
    });

    store.subscribe('ra', () => this.scheduleFetch(0.5, 0.5, 60));
    store.subscribe('dec', () => this.scheduleFetch(0.5, 0.5, 60));
    store.subscribe('fov', () => this.scheduleFetch(0.5, 0.5, 80));
    store.subscribe('source', () => this.scheduleFetch(0.5, 0.5, 0));
    store.subscribe('detector', () => this.renderChart());
    store.subscribe('mode', () => this.renderChart());
    store.subscribe('currentFrameIndex', () => this.renderChart());
    store.subscribe('frames', () => this.renderChart());

    // Re-traducir título, moléculas, interpretación y etiquetas del gráfico
    window.addEventListener('grajx:locale-changed', () => {
      i18n.applyToDOM();
      this.updateBadge();
      this.renderMolecules();
      this.renderChart();
    });
  }
}
