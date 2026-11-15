/**
 * CepheusLive — SkySearchBar Component
 * Barra de control manual (AR, Dec), FOV, fuente SPHEREx y Mapa Celeste de Cuadrantes (Q1–Q4).
 */

import { store } from '../state.js';
import { api } from '../api.js';
import { i18n } from '../i18n.js';

const NGP_RA_RAD = (192.85948 * Math.PI) / 180;
const TAN_NGP_DEC = Math.tan((27.12825 * Math.PI) / 180);
const OBLIQUITY_RAD = (23.43929 * Math.PI) / 180;

const QUADRANT_DEFAULTS = {
  Q1: { ra: 76.95608, dec: 30.40133, id: 'rw_aurigae' },
  Q2: { ra: 133.79513, dec: -7.24515, id: 'wise_0855' },
  Q3: { ra: 269.45208, dec: 4.69336, id: 'barnards_star' },
  Q4: { ra: 331.04390, dec: -56.78194, id: 'epsilon_indi_b' },
};

const REFERENCE_TARGETS = [
  { id: 'barnards_star', label: 'Barnard', ra: 269.45208, dec: 4.69336, aliases: ['barnard', "barnard's star", 'gj 699', 'gj699'] },
  { id: 'epsilon_indi_b', label: 'ε Ind B', ra: 331.04390, dec: -56.78194, aliases: ['epsilon indi', 'eps indi', 'epsilon indi b', 'eps indi b'] },
  { id: 'wise_0855', label: 'WISE 0855', ra: 133.79513, dec: -7.24515, aliases: ['wise 0855', 'wise0855', 'wise 0855-0714', 'wisej0855'] },
  { id: 'rw_aurigae', label: 'RW Aur', ra: 76.95608, dec: 30.40133, aliases: ['rw aurigae', 'rw aur', 'rwaur'] },
  { id: 'r_draconis', label: 'R Dra', ra: 248.16763, dec: 66.75497, aliases: ['r draconis', 'r dra', 'rdra'] },
];

export class SkySearchBar {
  constructor(container) {
    this.container = container;
    this.targetList = api.getLocalPresets();
    this.estimateTimer = null;
    this.inputDebounceTimer = null;
    this.activeQuadrant = 'all';
    this.hoverCoords = null;
    this.isDraggingMap = false;
    this._dragStartPx = null;
    this.skyFieldStars = this.generateMapStars(96);
    this.init();
  }

  async init() {
    this.renderSkeleton();
    this.populateTargetControls();
    this.attachDomEvents();
    this.attachGlobalEvents(); // una sola vez: store, resize, preset e idioma
    this.drawSkyMap();
    this.refreshEstimate();

    const presets = await api.getPresets();
    if (Array.isArray(presets) && presets.length > 0) {
      this.targetList = presets;
      this.populateTargetControls();
    }
  }

  getPresetCoords(item) {
    const ra = Number.isFinite(item.ra_deg) ? item.ra_deg : Number(item.ra);
    const dec = Number.isFinite(item.dec_deg) ? item.dec_deg : Number(item.dec);
    const fov = Number.isFinite(item.default_fov_arcmin)
      ? item.default_fov_arcmin
      : (Number.isFinite(item.recommended_fov) ? item.recommended_fov : 6.0);
    return { ra, dec, fov };
  }

  renderSkeleton() {
    const s = store.getState();
    const fov = s.fov;
    this.container.innerHTML = `
      <div class="search-control-bar">
        <!-- Selector de los 5 Objetos Predeterminados -->
        <div class="control-item control-item-select">
          <label for="target-list-select" class="control-label">${i18n.t('search.objectLabel')}</label>
          <div class="select-wrapper">
            <select id="target-list-select" class="target-select" aria-label="${i18n.t('search.objectAria')}">
              <option value="">${i18n.t('search.objectPlaceholder')}</option>
            </select>
          </div>
        </div>

        <!-- Búsqueda o Entrada de Coordenadas Manuales -->
        <div class="control-item control-item-coords">
          <label for="sky-search-input" class="control-label">${i18n.t('search.coordsLabel')}</label>
          <div class="input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="sky-search-input"
              class="search-input"
              value="${s.ra.toFixed(5)}, ${s.dec.toFixed(5)}"
              placeholder="${i18n.t('search.coordsPlaceholder')}"
              aria-label="${i18n.t('search.coordsAria')}"
            />
          </div>
        </div>

        <!-- Control de Campo de Visión (FOV) -->
        <div class="control-item control-item-fov">
          <label for="fov-slider" class="control-label">${i18n.t('search.fovLabel')}</label>
          <div class="fov-wrapper">
            <input type="range" id="fov-slider" class="fov-slider" min="1" max="30" step="0.5" value="${fov}" />
            <span id="fov-display-pill" class="fov-value-pill">${fov.toFixed(1)}'</span>
            <span id="fov-estimate-hint" class="fov-estimate-hint" title="Estimated transfer"></span>
          </div>
        </div>

        <!-- Origen de datos SPHEREx -->
        <div class="control-item control-item-source">
          <label for="source-select" class="control-label">${i18n.t('search.sourceLabel')}</label>
          <div class="select-wrapper">
            <select id="source-select" class="target-select" aria-label="${i18n.t('search.sourceLabel')}">
              <option value="auto" ${s.source === 'auto' ? 'selected' : ''}>${i18n.t('search.sourceAuto')}</option>
              <option value="cache" ${s.source === 'cache' ? 'selected' : ''}>${i18n.t('search.sourceCache')}</option>
              <option value="live" ${s.source === 'live' ? 'selected' : ''}>${i18n.t('search.sourceLive')}</option>
            </select>
          </div>
        </div>

        <!-- Botón de Ejecución -->
        <div class="control-item control-item-action">
          <label class="control-label" aria-hidden="true" style="visibility: hidden;">&nbsp;</label>
          <button type="button" id="btn-submit-search" class="btn-primary">
            <span>${i18n.t('search.loadBtn')}</span>
          </button>
        </div>
      </div>

      <!-- Mapa Interactivo de Cuadrantes Celestes -->
      <div class="sky-quadrant-panel" id="sky-quadrant-panel">
        <div class="sky-quadrant-header">
          <div class="sky-quadrant-title-group">
            <span class="sky-quadrant-title">${i18n.t('search.mapTitle')}</span>
            <span class="sky-quadrant-hint">${i18n.t('search.mapHint')}</span>
          </div>

          <div class="quadrant-btn-group" role="group" aria-label="Celestial Quadrants">
            <button type="button" class="quadrant-btn ${this.activeQuadrant === 'all' ? 'active' : ''}" data-quad="all">${i18n.t('search.quadAll')}</button>
            <button type="button" class="quadrant-btn ${this.activeQuadrant === 'Q1' ? 'active' : ''}" data-quad="Q1">Q1 (0°–90°)</button>
            <button type="button" class="quadrant-btn ${this.activeQuadrant === 'Q2' ? 'active' : ''}" data-quad="Q2">Q2 (90°–180°)</button>
            <button type="button" class="quadrant-btn ${this.activeQuadrant === 'Q3' ? 'active' : ''}" data-quad="Q3">Q3 (180°–270°)</button>
            <button type="button" class="quadrant-btn ${this.activeQuadrant === 'Q4' ? 'active' : ''}" data-quad="Q4">Q4 (270°–360°)</button>
          </div>

          <span class="sky-map-hover-coords" id="sky-map-hover-coords">
            ${this.formatCoordReadout(s.ra, s.dec)}
          </span>
        </div>

        <div class="sky-quadrant-canvas-wrap">
          <canvas id="sky-quadrant-canvas" height="190"></canvas>
        </div>
      </div>
    `;
  }

  populateTargetControls() {
    const s = store.getState();
    const currentPreset = s.activePresetId;
    const isCustom = !currentPreset;

    const select = this.container.querySelector('#target-list-select');
    if (select) {
      select.innerHTML = `
        <optgroup label="${i18n.t('search.optgroupTargets')}">
          ${this.targetList.map((item) => {
            const { ra, dec } = this.getPresetCoords(item);
            const title = i18n.presetText(item, 'title', item.friendly_title || item.phenomenon || '');
            return `
              <option value="${item.id}" ${item.id === currentPreset ? 'selected' : ''}>
                ${item.name} — ${title} (${ra.toFixed(5)}°, ${dec >= 0 ? '+' : ''}${dec.toFixed(5)}°)
              </option>
            `;
          }).join('')}
        </optgroup>
        <optgroup label="${i18n.t('search.optgroupCustom')}">
          <option value="custom" ${isCustom ? 'selected' : ''}>${i18n.t('search.customOption')}</option>
        </optgroup>
      `;
    }
  }

  selectPresetById(presetId) {
    const item = this.targetList.find(t => t.id === presetId);
    if (!item) return;

    const { ra, dec, fov } = this.getPresetCoords(item);
    const input = this.container.querySelector('#sky-search-input');
    const fovSlider = this.container.querySelector('#fov-slider');
    const fovPill = this.container.querySelector('#fov-display-pill');
    const select = this.container.querySelector('#target-list-select');
    const hoverReadout = this.container.querySelector('#sky-map-hover-coords');

    if (input) {
      input.removeAttribute('aria-invalid');
      input.value = `${ra.toFixed(5)}, ${dec.toFixed(5)}`;
    }
    if (fovSlider) fovSlider.value = fov;
    if (fovPill) fovPill.textContent = `${fov.toFixed(1)}'`;
    if (select) select.value = item.id;
    if (hoverReadout && !this.hoverCoords) {
      hoverReadout.textContent = this.formatCoordReadout(ra, dec);
    }

    const recDetector = (item.recommended_detector && item.recommended_detector !== 'all')
      ? item.recommended_detector
      : 'rgb';

    store.setState({
      activePresetId: item.id,
      ra,
      dec,
      fov,
      mode: item.recommended_mode || 'rgb',
      detector: recDetector,
      currentFrameIndex: 0,
    });

    this.drawSkyMap();
    this.refreshEstimate();
  }

  findClickedReferenceMarker(clientX, clientY, radiusPx = 10) {
    const canvas = this.container.querySelector('#sky-quadrant-canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    const padLeft = 38;
    const padRight = 14;
    const padTop = 14;
    const padBottom = 22;
    const plotW = Math.max(1, rect.width - padLeft - padRight);
    const plotH = Math.max(1, rect.height - padTop - padBottom);
    const { raMin, raMax } = this.getQuadrantBounds();
    const raSpan = raMax - raMin;

    let best = null;
    let bestDist = Infinity;
    for (const ref of REFERENCE_TARGETS) {
      if (ref.ra < raMin || ref.ra > raMax) continue;
      const rx = padLeft + ((ref.ra - raMin) / raSpan) * plotW;
      const ry = padTop + ((90.0 - ref.dec) / 180.0) * plotH;
      const d = Math.hypot(cx - rx, cy - ry);
      if (d <= radiusPx && d < bestDist) {
        bestDist = d;
        best = ref;
      }
    }
    return best;
  }

  getQuadrantBounds() {
    switch (this.activeQuadrant) {
      case 'Q1': return { raMin: 0, raMax: 90 };
      case 'Q2': return { raMin: 90, raMax: 180 };
      case 'Q3': return { raMin: 180, raMax: 270 };
      case 'Q4': return { raMin: 270, raMax: 360 };
      default: return { raMin: 0, raMax: 360 };
    }
  }

  getQuadrantTag(raDeg) {
    const r = ((raDeg % 360) + 360) % 360;
    if (r < 90) return 'Q1';
    if (r < 180) return 'Q2';
    if (r < 270) return 'Q3';
    return 'Q4';
  }

  formatSexagesimalShort(raDeg, decDeg) {
    const totalHours = (((raDeg % 360) + 360) % 360) / 15.0;
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    const sign = decDeg >= 0 ? '+' : '-';
    const absDec = Math.abs(decDeg);
    const d = Math.floor(absDec);
    const am = Math.floor((absDec - d) * 60);
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m ${sign}${String(d).padStart(2, '0')}°${String(am).padStart(2, '0')}'`;
  }

  formatCoordReadout(raDeg, decDeg) {
    const q = this.getQuadrantTag(raDeg);
    return `${q} · ${raDeg.toFixed(2)}°, ${decDeg >= 0 ? '+' : ''}${decDeg.toFixed(2)}° (${this.formatSexagesimalShort(raDeg, decDeg)})`;
  }

  generateMapStars(count) {
    const stars = [];
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < count; i++) {
      const ra = rand() * 360;
      const raRad = (ra * Math.PI) / 180;
      const galDec = Math.atan(-Math.cos(raRad - NGP_RA_RAD) / TAN_NGP_DEC) * (180 / Math.PI);
      const nearPlane = rand() < 0.55;
      const dec = nearPlane
        ? Math.max(-85, Math.min(85, galDec + (rand() - 0.5) * 32))
        : (rand() * 170 - 85);
      stars.push({
        ra,
        dec,
        r: 0.7 + rand() * 1.4,
        alpha: 0.22 + rand() * 0.45,
      });
    }
    return stars;
  }

  canvasPointToSky(clientX, clientY, clamp = false) {
    const canvas = this.container.querySelector('#sky-quadrant-canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const padLeft = 38;
    const padRight = 14;
    const padTop = 14;
    const padBottom = 22;
    const plotW = Math.max(1, w - padLeft - padRight);
    const plotH = Math.max(1, h - padTop - padBottom);

    let px = clientX - rect.left - padLeft;
    let py = clientY - rect.top - padTop;

    if (!clamp && (px < 0 || px > plotW || py < 0 || py > plotH)) {
      return null;
    }

    px = Math.max(0, Math.min(plotW, px));
    py = Math.max(0, Math.min(plotH, py));

    const { raMin, raMax } = this.getQuadrantBounds();
    const ra = Math.min(359.9999, raMin + (px / plotW) * (raMax - raMin));
    const dec = Math.max(-89.5, Math.min(89.5, 90.0 - (py / plotH) * 180.0));
    return { ra, dec };
  }

  drawSkyMap() {
    const canvas = this.container.querySelector('#sky-quadrant-canvas');
    if (!canvas || !canvas.parentElement) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = 190;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padLeft = 38;
    const padRight = 14;
    const padTop = 14;
    const padBottom = 22;
    const plotW = Math.max(1, w - padLeft - padRight);
    const plotH = Math.max(1, h - padTop - padBottom);

    const { raMin, raMax } = this.getQuadrantBounds();
    const raSpan = raMax - raMin;
    const toX = (ra) => padLeft + ((ra - raMin) / raSpan) * plotW;
    const toY = (dec) => padTop + ((90.0 - dec) / 180.0) * plotH;

    // Fondo espacial profundo
    const bg = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    bg.addColorStop(0, '#050914');
    bg.addColorStop(0.5, '#091124');
    bg.addColorStop(1, '#04070f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    // Bandas sutiles de cuadrantes en vista completa
    if (this.activeQuadrant === 'all') {
      const qBounds = [
        { label: 'Q1', start: 0, end: 90, tint: 'rgba(56, 189, 248, 0.04)' },
        { label: 'Q2', start: 90, end: 180, tint: 'rgba(16, 185, 129, 0.03)' },
        { label: 'Q3', start: 180, end: 270, tint: 'rgba(129, 140, 248, 0.04)' },
        { label: 'Q4', start: 270, end: 360, tint: 'rgba(245, 158, 11, 0.03)' },
      ];
      qBounds.forEach((q) => {
        const x1 = toX(q.start);
        const x2 = toX(q.end);
        ctx.fillStyle = q.tint;
        ctx.fillRect(x1, padTop, x2 - x1, plotH);

        ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(q.label, x1 + 6, padTop + 14);
      });
    }

    // Rejilla Dec
    [-60, -30, 0, 30, 60].forEach((dec) => {
      const y = toY(dec);
      ctx.strokeStyle = dec === 0 ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = dec === 0 ? 1.1 : 0.8;
      ctx.setLineDash(dec === 0 ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Rejilla RA
    const stepRa = this.activeQuadrant === 'all' ? 30 : 15;
    for (let ra = raMin; ra <= raMax; ra += stepRa) {
      const x = toX(ra);
      const isQuadBorder = ra % 90 === 0 && ra > raMin && ra < raMax;
      ctx.strokeStyle = isQuadBorder ? 'rgba(0, 229, 255, 0.28)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = isQuadBorder ? 1.2 : 0.8;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }

    // Plano Galáctico (azul-índigo) y Plano Eclíptico (ámbar)
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.42)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let ra = raMin; ra <= raMax; ra += 2) {
      const raRad = (ra * Math.PI) / 180;
      const decGal = Math.atan(-Math.cos(raRad - NGP_RA_RAD) / TAN_NGP_DEC) * (180 / Math.PI);
      const px = toX(ra);
      const py = toY(decGal);
      if (ra === raMin) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let ra = raMin; ra <= raMax; ra += 2) {
      const raRad = (ra * Math.PI) / 180;
      const decEcl = Math.atan(Math.tan(OBLIQUITY_RAD) * Math.sin(raRad)) * (180 / Math.PI);
      const px = toX(ra);
      const py = toY(decEcl);
      if (ra === raMin) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Estrellas de campo de referencia en el mapa
    this.skyFieldStars.forEach((st) => {
      if (st.ra < raMin || st.ra > raMax) return;
      ctx.fillStyle = `rgba(226, 232, 240, ${st.alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(toX(st.ra), toY(st.dec), st.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Marcadores sutiles de los 5 objetos de referencia dentro del cuadrante visible
    REFERENCE_TARGETS.forEach((ref) => {
      if (ref.ra < raMin || ref.ra > raMax) return;
      const rx = toX(ref.ra);
      const ry = toY(ref.dec);
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.72)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 4.5);
      ctx.lineTo(rx + 4.5, ry);
      ctx.lineTo(rx, ry + 4.5);
      ctx.lineTo(rx - 4.5, ry);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = rx > padLeft + plotW - 60 ? 'right' : 'left';
      const lx = rx > padLeft + plotW - 60 ? rx - 7 : rx + 7;
      ctx.fillText(ref.label, lx, ry + 3);
    });

    // Posición y FOV seleccionados actualmente
    const s = store.getState();
    const curRa = ((s.ra % 360) + 360) % 360;
    if (curRa >= raMin && curRa <= raMax) {
      const tx = toX(curRa);
      const ty = toY(s.dec);
      const fovPx = Math.max(7, Math.min(26, 5 + s.fov * 0.65));

      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(tx, ty, fovPx, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx - fovPx - 5, ty);
      ctx.lineTo(tx + fovPx + 5, ty);
      ctx.moveTo(tx, ty - fovPx - 5);
      ctx.lineTo(tx, ty + fovPx + 5);
      ctx.stroke();

      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cursor hover en el mapa
    if (this.hoverCoords && this.hoverCoords.ra >= raMin && this.hoverCoords.ra <= raMax) {
      const hx = toX(this.hoverCoords.ra);
      const hy = toY(this.hoverCoords.dec);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, padTop);
      ctx.lineTo(hx, padTop + plotH);
      ctx.moveTo(padLeft, hy);
      ctx.lineTo(padLeft + plotW, hy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Marco del área de mapa
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Etiquetas de ejes Dec
    ctx.fillStyle = '#8493A8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    [-60, 0, 60].forEach((dec) => {
      ctx.fillText(`${dec > 0 ? '+' : ''}${dec}°`, padLeft - 5, toY(dec) + 3);
    });

    // Etiquetas de ejes RA
    ctx.textAlign = 'center';
    for (let ra = raMin; ra <= raMax; ra += stepRa) {
      if (ra === raMax && this.activeQuadrant === 'all') continue;
      const x = toX(ra);
      const hr = Math.round(ra / 15);
      ctx.fillText(`${ra}° (${hr}h)`, x, h - 6);
    }

    // Leyenda compacta de planos (traducida según i18n.locale)
    const planeLabels = {
      en: { gal: 'Galactic plane', ecl: 'Ecliptic' },
      es: { gal: 'Plano galáctico', ecl: 'Eclíptica' },
      fr: { gal: 'Plan galactique', ecl: 'Écliptique' },
    }[i18n.locale] || { gal: 'Galactic plane', ecl: 'Ecliptic' };

    ctx.textAlign = 'right';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(129, 140, 248, 0.85)';
    ctx.fillText(planeLabels.gal, padLeft + plotW - 86, padTop + 12);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillText(planeLabels.ecl, padLeft + plotW - 8, padTop + 12);
  }

  matchPresetLocally(raDeg, decDeg, toleranceDeg = 5.0 / 60.0) {
    const normRa = ((raDeg % 360) + 360) % 360;
    for (const ref of REFERENCE_TARGETS) {
      let dRa = Math.abs(normRa - ref.ra);
      if (dRa > 180) dRa = 360 - dRa;
      const dDec = Math.abs(decDeg - ref.dec);
      if (Math.hypot(dRa * Math.cos((decDeg * Math.PI) / 180), dDec) <= toleranceDeg) {
        return ref.id;
      }
    }
    return null;
  }

  parseInputLocally(rawVal) {
    if (!rawVal) return null;
    const trimmed = rawVal.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();

    // 1. Nombres o alias de los 5 objetos de referencia
    for (const ref of REFERENCE_TARGETS) {
      if (ref.id === lower || ref.aliases.some(a => lower === a || (lower.length >= 4 && a.startsWith(lower)))) {
        return { ra: ref.ra, dec: ref.dec, activePresetId: ref.id };
      }
    }

    // 2. Coordenadas decimales ("ra, dec" o "ra dec")
    const decMatch = trimmed.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*[\s,;]+\s*([+-]?\d+(?:\.\d+)?)\s*$/);
    if (decMatch) {
      const parsedRa = parseFloat(decMatch[1]);
      const parsedDec = parseFloat(decMatch[2]);
      if (Number.isFinite(parsedRa) && Number.isFinite(parsedDec) && parsedDec >= -90 && parsedDec <= 90) {
        const ra = ((parsedRa % 360) + 360) % 360;
        const dec = parsedDec;
        return { ra, dec, activePresetId: this.matchPresetLocally(ra, dec) };
      }
    }

    // 3. Sexagesimal con unidades ("08h55m10.831s -7d14m42.53s")
    const hmsMatch = trimmed.match(
      /^\s*(\d{1,2})h\s*(\d{1,2})m\s*(\d{1,2}(?:\.\d+)?)s?\s*[\s,;]*\s*([+-]?\d{1,2})[d°]\s*(\d{1,2})[m'′]\s*(\d{1,2}(?:\.\d+)?)[s"″]?\s*$/i
    );
    if (hmsMatch) {
      const h = parseFloat(hmsMatch[1]);
      const m = parseFloat(hmsMatch[2]);
      const sec = parseFloat(hmsMatch[3]);
      const decDegPart = parseFloat(hmsMatch[4]);
      const dm = parseFloat(hmsMatch[5]);
      const ds = parseFloat(hmsMatch[6]);
      if (h < 24 && m < 60 && sec < 60 && Math.abs(decDegPart) <= 90 && dm < 60 && ds < 60) {
        const ra = (h + m / 60 + sec / 3600) * 15.0;
        const sign = hmsMatch[4].trim().startsWith('-') || decDegPart < 0 ? -1 : 1;
        const dec = sign * (Math.abs(decDegPart) + dm / 60 + ds / 3600);
        if (dec >= -90 && dec <= 90) {
          return { ra, dec, activePresetId: this.matchPresetLocally(ra, dec) };
        }
      }
    }

    // 4. Sexagesimal con dos puntos ("17:57:48.5 +04:41:36")
    const colonMatch = trimmed.match(
      /^\s*(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\s*[\s,;]+\s*([+-]?\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\s*$/
    );
    if (colonMatch) {
      const h = parseFloat(colonMatch[1]);
      const m = parseFloat(colonMatch[2]);
      const sec = parseFloat(colonMatch[3]);
      const decDegPart = parseFloat(colonMatch[4]);
      const dm = parseFloat(colonMatch[5]);
      const ds = parseFloat(colonMatch[6]);
      if (h < 24 && m < 60 && sec < 60 && Math.abs(decDegPart) <= 90 && dm < 60 && ds < 60) {
        const ra = (h + m / 60 + sec / 3600) * 15.0;
        const sign = colonMatch[4].trim().startsWith('-') || decDegPart < 0 ? -1 : 1;
        const dec = sign * (Math.abs(decDegPart) + dm / 60 + ds / 3600);
        if (dec >= -90 && dec <= 90) {
          return { ra, dec, activePresetId: this.matchPresetLocally(ra, dec) };
        }
      }
    }

    return null;
  }

  scheduleEstimate(delayMs = 120) {
    if (this.estimateTimer) clearTimeout(this.estimateTimer);
    this.estimateTimer = setTimeout(() => {
      this.estimateTimer = null;
      this.refreshEstimate();
    }, delayMs);
  }

  async refreshEstimate() {
    const hint = this.container.querySelector('#fov-estimate-hint');
    if (!hint) return;
    const s = store.getState();
    const est = await api.getEstimate(s.ra, s.dec, s.fov);
    if (!est) {
      hint.textContent = '';
      return;
    }
    hint.textContent = `~${est.estimated_frames}f · ${est.estimated_size_mb} MB`;
  }

  /** Eventos ligados al DOM actual (se vuelven a ligar tras cada render). */
  attachDomEvents() {
    const targetSelect = this.container.querySelector('#target-list-select');
    const input = this.container.querySelector('#sky-search-input');
    const searchBtn = this.container.querySelector('#btn-submit-search');
    const fovSlider = this.container.querySelector('#fov-slider');
    const fovPill = this.container.querySelector('#fov-display-pill');
    const sourceSelect = this.container.querySelector('#source-select');
    const quadBtns = this.container.querySelectorAll('.quadrant-btn');
    const mapCanvas = this.container.querySelector('#sky-quadrant-canvas');
    const hoverReadout = this.container.querySelector('#sky-map-hover-coords');

    if (targetSelect) {
      targetSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (selectedId === 'custom') {
          if (input) input.focus();
          return;
        }
        this.selectPresetById(selectedId);
      });
    }

    // FOV en tiempo real (0 ms en UI) + throttle ligero para estimación de transferencia
    fovSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (fovPill) fovPill.textContent = `${val.toFixed(1)}'`;
      store.setState({ fov: val });
      this.scheduleEstimate(120);
    });

    fovSlider.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (fovPill) fovPill.textContent = `${val.toFixed(1)}'`;
      store.setState({ fov: val });
      this.refreshEstimate();
    });

    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        store.setState({ source: e.target.value });
      });
    }

    quadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        quadBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeQuadrant = btn.dataset.quad;

        if (this.activeQuadrant !== 'all') {
          const { raMin, raMax } = this.getQuadrantBounds();
          const s = store.getState();
          const curRa = ((s.ra % 360) + 360) % 360;
          if (curRa < raMin || curRa >= raMax) {
            const target = QUADRANT_DEFAULTS[this.activeQuadrant];
            if (target) {
              this.selectPresetById(target.id);
              return;
            }
          }
        }
        this.drawSkyMap();
      });
    });

    if (mapCanvas) {
      const updateFromMapCoords = (clientX, clientY) => {
        const coords = this.canvasPointToSky(clientX, clientY, true);
        if (!coords) return null;
        const raRounded = parseFloat(coords.ra.toFixed(4));
        const decRounded = parseFloat(coords.dec.toFixed(4));
        const matchedId = this.matchPresetLocally(raRounded, decRounded);

        if (input && document.activeElement !== input) {
          input.removeAttribute('aria-invalid');
          input.value = `${raRounded.toFixed(5)}, ${decRounded.toFixed(5)}`;
        }
        if (hoverReadout) {
          hoverReadout.textContent = this.formatCoordReadout(raRounded, decRounded);
        }

        store.setState({
          ra: raRounded,
          dec: decRounded,
          activePresetId: matchedId,
          currentFrameIndex: 0,
        });
        this.scheduleEstimate(120);
        return { ra: raRounded, dec: decRounded };
      };

      mapCanvas.addEventListener('pointerdown', (e) => {
        this.isDraggingMap = true;
        this._dragStartPx = { x: e.clientX, y: e.clientY };
        if (mapCanvas.setPointerCapture) {
          try { mapCanvas.setPointerCapture(e.pointerId); } catch {}
        }
        const hitRef = this.findClickedReferenceMarker(e.clientX, e.clientY);
        if (hitRef) {
          this.selectPresetById(hitRef.id);
        } else {
          updateFromMapCoords(e.clientX, e.clientY);
        }
      });

      mapCanvas.addEventListener('pointermove', (e) => {
        const hover = this.canvasPointToSky(e.clientX, e.clientY, this.isDraggingMap);
        this.hoverCoords = hover;
        if (this.isDraggingMap) {
          const moved = this._dragStartPx
            ? Math.hypot(e.clientX - this._dragStartPx.x, e.clientY - this._dragStartPx.y)
            : 99;
          if (moved >= 5) {
            updateFromMapCoords(e.clientX, e.clientY);
          }
        } else {
          if (hoverReadout) {
            const s = store.getState();
            hoverReadout.textContent = hover
              ? this.formatCoordReadout(hover.ra, hover.dec)
              : this.formatCoordReadout(s.ra, s.dec);
          }
          this.drawSkyMap();
        }
      });

      const endDrag = async (e) => {
        if (!this.isDraggingMap) return;
        this.isDraggingMap = false;
        const moved = this._dragStartPx
          ? Math.hypot(e.clientX - this._dragStartPx.x, e.clientY - this._dragStartPx.y)
          : 99;
        this._dragStartPx = null;
        if (mapCanvas.releasePointerCapture) {
          try { mapCanvas.releasePointerCapture(e.pointerId); } catch {}
        }
        if (moved < 5) {
          const hitRef = this.findClickedReferenceMarker(e.clientX, e.clientY);
          if (hitRef) {
            this.selectPresetById(hitRef.id);
            return;
          }
        }
        const finalCoords = updateFromMapCoords(e.clientX, e.clientY);
        if (finalCoords) {
          const parsed = await api.parseCoordinates(`${finalCoords.ra}, ${finalCoords.dec}`);
          const current = store.getState();
          // Aplicar refinamiento del servidor solo si no cambió mientras respondía
          if (parsed && Math.abs(current.ra - finalCoords.ra) < 0.01 && Math.abs(current.dec - finalCoords.dec) < 0.01) {
            const matched = parsed.matched_preset;
            store.setState({
              ra: parsed.ra_deg,
              dec: parsed.dec_deg,
              activePresetId: matched ? matched.id : null,
            });
          }
          this.refreshEstimate();
        }
      };

      mapCanvas.addEventListener('pointerup', endDrag);
      mapCanvas.addEventListener('pointercancel', () => {
        this.isDraggingMap = false;
        this._dragStartPx = null;
      });

      mapCanvas.addEventListener('mouseleave', () => {
        if (!this.isDraggingMap) {
          this.hoverCoords = null;
          if (hoverReadout) {
            const s = store.getState();
            hoverReadout.textContent = this.formatCoordReadout(s.ra, s.dec);
          }
          this.drawSkyMap();
        }
      });
    }

    // Entrada manual en tiempo real mientras se escribe (sin mover el cursor)
    input.addEventListener('input', () => {
      const rawVal = input.value.trim();
      if (!rawVal) return;

      const localParsed = this.parseInputLocally(rawVal);
      if (localParsed) {
        input.removeAttribute('aria-invalid');
        store.setState({
          ra: localParsed.ra,
          dec: localParsed.dec,
          activePresetId: localParsed.activePresetId,
          currentFrameIndex: 0,
        });
      }

      if (this.inputDebounceTimer) clearTimeout(this.inputDebounceTimer);
      this.inputDebounceTimer = setTimeout(async () => {
        this.inputDebounceTimer = null;
        if (input.value.trim() !== rawVal) return;
        const parsed = await api.parseCoordinates(rawVal);
        if (parsed && input.value.trim() === rawVal) {
          input.removeAttribute('aria-invalid');
          const matched = parsed.matched_preset;
          store.setState({
            activePresetId: matched ? matched.id : null,
            ra: parsed.ra_deg,
            dec: parsed.dec_deg,
            currentFrameIndex: 0,
          });
          this.refreshEstimate();
        }
      }, 150);
    });

    // Normalización explícita al pulsar Enter, perder foco o pulsar el botón Cargar
    const execute = async (normalizeField = true) => {
      if (this.inputDebounceTimer) {
        clearTimeout(this.inputDebounceTimer);
        this.inputDebounceTimer = null;
      }
      const rawVal = input.value.trim();
      if (!rawVal) return;
      input.removeAttribute('aria-invalid');

      const parsed = await api.parseCoordinates(rawVal);
      if (parsed) {
        const matched = parsed.matched_preset;
        if (normalizeField) {
          input.value = `${parsed.ra_deg.toFixed(5)}, ${parsed.dec_deg.toFixed(5)}`;
        }
        store.setState({
          activePresetId: matched ? matched.id : null,
          ra: parsed.ra_deg,
          dec: parsed.dec_deg,
          currentFrameIndex: 0,
        });
        this.drawSkyMap();
        this.refreshEstimate();
        return;
      }

      const localParsed = this.parseInputLocally(rawVal);
      if (localParsed) {
        if (normalizeField) {
          input.value = `${localParsed.ra.toFixed(5)}, ${localParsed.dec.toFixed(5)}`;
        }
        store.setState({
          ra: localParsed.ra,
          dec: localParsed.dec,
          activePresetId: localParsed.activePresetId,
          currentFrameIndex: 0,
        });
        this.drawSkyMap();
        this.refreshEstimate();
        return;
      }

      if (normalizeField) {
        input.setAttribute('aria-invalid', 'true');
        input.title = i18n.t('search.formatError');
        input.focus();
      }
    };

    searchBtn.addEventListener('click', () => execute(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') execute(true);
    });
    input.addEventListener('blur', () => {
      const localParsed = this.parseInputLocally(input.value.trim());
      if (localParsed) {
        input.value = `${localParsed.ra.toFixed(5)}, ${localParsed.dec.toFixed(5)}`;
      }
    });
  }

  /** Suscripciones globales: se registran UNA sola vez para no duplicarse al cambiar idioma. */
  attachGlobalEvents() {
    window.addEventListener('resize', () => this.drawSkyMap());
    window.addEventListener('grajx:theme-changed', () => this.drawSkyMap());

    const syncCoordsDisplay = (s) => {
      const input = this.container.querySelector('#sky-search-input');
      if (input && document.activeElement !== input) {
        input.value = `${s.ra.toFixed(5)}, ${s.dec.toFixed(5)}`;
      }
      const hoverReadout = this.container.querySelector('#sky-map-hover-coords');
      if (hoverReadout && !this.hoverCoords) {
        hoverReadout.textContent = this.formatCoordReadout(s.ra, s.dec);
      }
      this.drawSkyMap();
    };

    store.subscribe('activePresetId', (id) => {
      const select = this.container.querySelector('#target-list-select');
      if (select) select.value = id || 'custom';
    });

    store.subscribe('ra', (_ra, s) => syncCoordsDisplay(s));
    store.subscribe('dec', (_dec, s) => syncCoordsDisplay(s));

    store.subscribe('fov', (val) => {
      const fovSlider = this.container.querySelector('#fov-slider');
      const fovPill = this.container.querySelector('#fov-display-pill');
      if (fovSlider && parseFloat(fovSlider.value) !== val) fovSlider.value = val;
      if (fovPill) fovPill.textContent = `${val.toFixed(1)}'`;
      this.drawSkyMap();
    });

    store.subscribe('source', (src) => {
      const sourceSelect = this.container.querySelector('#source-select');
      if (sourceSelect && sourceSelect.value !== src) sourceSelect.value = src;
    });

    // Actualizar UI cuando cambia el idioma, conservando lo que el usuario había escrito
    window.addEventListener('grajx:locale-changed', () => {
      const prevInput = this.container.querySelector('#sky-search-input');
      const prevValue = prevInput ? prevInput.value : '';
      this.renderSkeleton();
      this.populateTargetControls();
      const input = this.container.querySelector('#sky-search-input');
      if (input && prevValue) input.value = prevValue;
      this.attachDomEvents();
      this.drawSkyMap();
      this.refreshEstimate();
    });
  }
}
