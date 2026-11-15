/**
 * GrajX — AladinOverlay Component
 * Comparador Histórico entre AllWISE (2010) y SPHEREx (2025) con 15 años de línea base.
 * Muestra vectores de movimiento propio de Gaia DR3.
 */

import { store } from '../state.js';
import { i18n } from '../i18n.js';

export class AladinOverlay {
  constructor(container) {
    this.container = container;
    this.viewMode = 'split';
    this.previewCache = new Map();
    this.init();
  }

  loadPreviewImage(url) {
    if (!url) return null;
    const cached = this.previewCache.get(url);
    if (cached) return cached;

    const img = new Image();
    const entry = { status: 'loading', img };
    img.onload = () => {
      entry.status = 'loaded';
      this.drawComparisonScene();
    };
    img.onerror = () => {
      entry.status = 'error';
    };
    this.previewCache.set(url, entry);
    img.src = url;
    return entry;
  }

  init() {
    this.render();
    this.attachEvents();
    this.drawComparisonScene();
  }

  render() {
    this.container.innerHTML = `
      <div class="comparison-header">
        <h3 data-i18n="aladin.title">${i18n.t('aladin.title')}</h3>
        <div class="comparison-toggle-group">
          <button type="button" class="comparison-btn${this.viewMode === 'wise' ? ' active' : ''}" data-view="wise" data-i18n="aladin.wise">${i18n.t('aladin.wise')}</button>
          <button type="button" class="comparison-btn${this.viewMode === 'gaia' ? ' active' : ''}" data-view="gaia" data-i18n="aladin.gaia">${i18n.t('aladin.gaia')}</button>
          <button type="button" class="comparison-btn${this.viewMode === 'split' ? ' active' : ''}" data-view="split" data-i18n="aladin.split">${i18n.t('aladin.split')}</button>
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
    const frames = s.frames || [];
    const trajectory = s.trajectory || [];
    const curFrame = frames[s.currentFrameIndex] || frames[frames.length - 1] || frames[0];
    const realUrl = curFrame && curFrame.image_url;
    const imgEntry = realUrl ? this.loadPreviewImage(realUrl) : null;
    const hasRealImg = imgEntry && imgEntry.status === 'loaded';
    const maskUrl = s.includeMask && curFrame && curFrame.mask_overlay_url;
    const maskEntry = maskUrl ? this.loadPreviewImage(maskUrl) : null;

    const fov = Number.isFinite(s.fov) && s.fov > 0 ? s.fov : 6.0;
    const fovScale = Math.max(0.35, Math.min(2.2, 6.0 / fov));

    ctx.fillStyle = "#060910";
    ctx.fillRect(0, 0, w, h);

    const drawBackgroundStars = (centerX = w / 2, centerY = h / 2, boxW = w) => {
      ctx.fillStyle = "#64748b";
      for (let i = 0; i < 24; i++) {
        const normX = (((i * 73 + Math.round(s.ra * 3)) % 100) / 100) - 0.5;
        const normY = (((i * 47 + Math.round((s.dec + 90) * 2)) % 100) / 100) - 0.5;
        const rx = centerX + normX * boxW * fovScale;
        const ry = centerY + normY * h * fovScale;
        if (rx >= 0 && rx <= boxW && ry >= 0 && ry <= h) {
          ctx.fillRect(rx, ry, 1.3, 1.3);
        }
      }
    };

    const dispArcsec = trajectory.length >= 2
      ? (trajectory[trajectory.length - 1].displacement_arcsec || 0)
      : 0;

    if (this.viewMode === 'gaia') {
      drawBackgroundStars();
      // Astrometric grid (Gaia DR3 ICRS J2016.0) escalado al FOV
      const gridStepX = Math.max(24, Math.min(90, 56 * fovScale));
      const gridStepY = Math.max(20, Math.min(72, 42 * fovScale));
      ctx.strokeStyle = "rgba(16, 185, 129, 0.16)";
      ctx.lineWidth = 1;
      for (let x = (w / 2) % gridStepX; x < w; x += gridStepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = (h / 2) % gridStepY; y < h; y += gridStepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const gx = w * 0.50;
      const gy = h * 0.50;
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(gx, gy, 8 + 3 * Math.min(1.5, fovScale), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(gx, gy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      if (s.showTrajectory && trajectory.length >= 2 && s.wcs && s.wcs.width > 1 && s.wcs.height > 1) {
        const p0 = trajectory[0];
        const pN = trajectory[trajectory.length - 1];
        const vx = (pN.x - p0.x) * (w / s.wcs.width) * 1.4 * Math.max(0.6, fovScale);
        const vy = (pN.y - p0.y) * (h / s.wcs.height) * 1.4 * Math.max(0.6, fovScale);
        if (Math.hypot(vx, vy) > 2) {
          ctx.strokeStyle = "#00E5FF";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + vx, gy + vy);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "rgba(6, 9, 16, 0.85)";
      ctx.fillRect(8, 8, 250, 22);
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 11px sans-serif";
      const label = dispArcsec > 0.05
        ? `${i18n.t('aladin.gaia')} · ${fov.toFixed(1)}' · Δ ${dispArcsec.toFixed(2)}"`
        : `${i18n.t('aladin.gaia')} · RA ${s.ra.toFixed(2)}° · ${fov.toFixed(1)}'`;
      ctx.fillText(label, 14, 23);
      return;
    }

    if (hasRealImg && this.viewMode === 'split') {
      const halfW = w / 2;

      // Left half: AllWISE (2010) + Gaia DR3 baseline escalado con FOV
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, halfW, h);
      ctx.clip();
      drawBackgroundStars(halfW * 0.5, h * 0.5, halfW);
      const wiseX = halfW * 0.48;
      const wiseY = h * 0.54;
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(wiseX, wiseY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Gaia vector indicator on left reference panel
      if (s.showTrajectory && dispArcsec > 0.05 && trajectory.length >= 2) {
        const p0 = trajectory[0];
        const pN = trajectory[trajectory.length - 1];
        const angle = Math.atan2(pN.y - p0.y, pN.x - p0.x);
        const vecLen = Math.max(14, Math.min(46, 26 * fovScale));
        const tx = wiseX + Math.cos(angle) * vecLen;
        const ty = wiseY + Math.sin(angle) * vecLen;
        ctx.strokeStyle = "#10B981";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(wiseX, wiseY);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#10B981";
        ctx.font = "10px sans-serif";
        ctx.fillText(`${i18n.t('aladin.gaia')}`, Math.min(halfW - 55, tx + 4), ty + 4);
      }

      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`${i18n.t('aladin.wise')} · ${fov.toFixed(1)}'`, 10, 20);
      ctx.restore();

      // Right half: Live SPHEREx frame + mask + trajectory
      ctx.save();
      ctx.beginPath();
      ctx.rect(halfW, 0, halfW, h);
      ctx.clip();
      const scale = Math.min(halfW / imgEntry.img.naturalWidth, h / imgEntry.img.naturalHeight);
      const dw = imgEntry.img.naturalWidth * scale;
      const dh = imgEntry.img.naturalHeight * scale;
      const dx = halfW + (halfW - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(imgEntry.img, dx, dy, dw, dh);

      if (maskEntry && maskEntry.status === 'loaded') {
        ctx.drawImage(maskEntry.img, dx, dy, dw, dh);
      }

      if (s.showTrajectory && trajectory.length >= 2 && s.wcs && s.wcs.width > 1 && s.wcs.height > 1) {
        ctx.strokeStyle = "#00E5FF";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        trajectory.forEach((pt, idx) => {
          const px = dx + ((pt.x + 0.5) / s.wcs.width) * dw;
          const py = dy + ((pt.y + 0.5) / s.wcs.height) * dh;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, h);
      ctx.stroke();

      const detTag = s.detector === 'rgb' ? 'RGB' : s.detector;
      ctx.fillStyle = "rgba(6, 9, 16, 0.78)";
      ctx.fillRect(halfW + 8, 8, 134, 20);
      ctx.fillStyle = "#00E5FF";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`${i18n.t('aladin.spherex')} (${detTag})`, halfW + 14, 22);

      if (dispArcsec > 0.05) {
        ctx.fillStyle = "#10B981";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`Δ ${dispArcsec.toFixed(2)}"`, halfW + 10, h - 10);
      }
      return;
    }

    // Vista WISE 2010 o Split de respaldo escalados dinámicamente por FOV
    drawBackgroundStars();
    const angle = (trajectory.length >= 2)
      ? Math.atan2(trajectory[trajectory.length - 1].y - trajectory[0].y, trajectory[trajectory.length - 1].x - trajectory[0].x)
      : -0.68;
    const shift = Math.max(16, Math.min(58, 34 * fovScale));
    const cx = w * 0.5;
    const cy = h * 0.5;
    const pos2010X = cx - Math.cos(angle) * (shift * 0.5);
    const pos2010Y = cy - Math.sin(angle) * (shift * 0.5);
    const pos2025X = cx + Math.cos(angle) * (shift * 0.5);
    const pos2025Y = cy + Math.sin(angle) * (shift * 0.5);

    if (this.viewMode === 'wise' || this.viewMode === 'split') {
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(pos2010X, pos2010Y, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`${i18n.t('aladin.wise')} (3.4–4.6 µm) · ${fov.toFixed(1)}'`, Math.max(8, pos2010X - 60), Math.min(h - 10, pos2010Y + 20));
    }

    if (this.viewMode === 'wise' || this.viewMode === 'split') {
      ctx.fillStyle = "#00E5FF";
      ctx.beginPath();
      ctx.arc(pos2025X, pos2025Y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 11px sans-serif";
      ctx.fillText(i18n.t('aladin.spherex'), Math.min(w - 95, pos2025X - 30), Math.max(16, pos2025Y - 12));

      if (s.showTrajectory) {
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
        ctx.fillText(i18n.t('aladin.gaiavector'), Math.max(8, cx - 48), Math.min(h - 8, cy + 28));
      }
    }
  }

  attachButtons() {
    const btns = this.container.querySelectorAll('.comparison-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.viewMode = btn.dataset.view;
        this.drawComparisonScene();
      });
    });
  }

  attachEvents() {
    this.attachButtons();

    window.addEventListener('resize', () => this.drawComparisonScene());

    store.subscribe('ra', () => this.drawComparisonScene());
    store.subscribe('dec', () => this.drawComparisonScene());
    store.subscribe('fov', () => this.drawComparisonScene());
    store.subscribe('mode', () => this.drawComparisonScene());
    store.subscribe('detector', () => this.drawComparisonScene());
    store.subscribe('stretch', () => this.drawComparisonScene());
    store.subscribe('showTrajectory', () => this.drawComparisonScene());
    store.subscribe('includeMask', () => this.drawComparisonScene());
    store.subscribe('frames', () => this.drawComparisonScene());
    store.subscribe('trajectory', () => this.drawComparisonScene());
    store.subscribe('currentFrameIndex', () => this.drawComparisonScene());

    // Re-render completo al cambiar de idioma (conserva la vista activa)
    window.addEventListener('grajx:locale-changed', () => {
      this.render();
      this.attachButtons();
      this.drawComparisonScene();
    });
  }
}
