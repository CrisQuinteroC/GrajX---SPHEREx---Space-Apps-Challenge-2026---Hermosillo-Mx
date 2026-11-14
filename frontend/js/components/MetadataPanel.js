/**
 * GrajX — MetadataPanel Component
 * Exposición de Metadatos Científicos y Semáforo de Calidad/Contaminación.
 */

import { store } from '../state.js';
import { api } from '../api.js';

export class MetadataPanel {
  constructor(container) {
    this.container = container;
    this.init();
  }

  async init() {
    this.render();
    this.attachEvents();
    await this.update();
  }

  render() {
    this.container.innerHTML = `
      <div class="info-header">
        <div class="info-title-group">
          <h2 id="meta-target-title">Cargando...</h2>
          <p id="meta-target-coords">RA: -- | Dec: --</p>
        </div>

        <div class="quality-indicator-badge" id="quality-indicator">
          <div class="quality-dot"></div>
          <span id="quality-text">Óptimo</span>
        </div>
      </div>

      <p class="info-story" id="meta-target-description"></p>

      <div class="info-fun-fact" id="meta-fun-fact" style="display: none;">
        <span id="meta-fun-fact-text"></span>
      </div>
    `;
  }

  async update() {
    const s = store.getState();
    const presets = await api.getPresets();
    const current = presets.find(p => p.id === s.activePresetId) || {
      name: "Coordenadas Personalizadas",
      friendly_title: "Zona de Exploración",
      description: "Observación infrarroja centrada en el parche celeste seleccionado.",
      fun_fact: "SPHEREx visita este punto cada 6 meses acumulando un mapa espectral de todo el cielo.",
      ra: s.ra,
      dec: s.dec
    };

    const titleEl = this.container.querySelector('#meta-target-title');
    const coordsEl = this.container.querySelector('#meta-target-coords');
    const descEl = this.container.querySelector('#meta-target-description');
    const factBox = this.container.querySelector('#meta-fun-fact');
    const factEl = this.container.querySelector('#meta-fun-fact-text');
    const qualityBadge = this.container.querySelector('#quality-indicator');
    const qualityText = this.container.querySelector('#quality-text');

    if (titleEl) titleEl.textContent = current.name;
    if (coordsEl) coordsEl.textContent = `RA: ${s.ra.toFixed(4)}° | Dec: ${s.dec.toFixed(4)}° (${s.fov.toFixed(1)}' FOV)`;
    if (descEl) descEl.textContent = current.description;
    
    if (factBox && factEl) {
      if (current.fun_fact) {
        factEl.textContent = current.fun_fact;
        factBox.style.display = 'block';
      } else {
        factBox.style.display = 'none';
      }
    }

    const curFrame = s.frames && s.frames[s.currentFrameIndex];
    if (curFrame && curFrame.quality && qualityBadge && qualityText) {
      const q = curFrame.quality;
      qualityText.textContent = q.status === 'excellent' ? "Calidad Óptima" : "Luz Zodiacal";
      qualityBadge.style.color = q.status === 'excellent' ? "var(--color-status-success)" : "var(--color-status-warning)";
      qualityBadge.title = q.message;
    }
  }

  attachEvents() {
    store.subscribe('activePresetId', () => this.update());
    store.subscribe('ra', () => this.update());
    store.subscribe('currentFrameIndex', () => this.update());
  }
}
