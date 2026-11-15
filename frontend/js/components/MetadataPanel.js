/**
 * GrajX — MetadataPanel Component
 * Exposición de Metadatos Científicos y Semáforo de Calidad/Contaminación.
 * Todos los textos se traducen en el cliente (los datos del API se usan solo como respaldo).
 */

import { store } from '../state.js';
import { api } from '../api.js';
import { i18n } from '../i18n.js';

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
          <h2 id="meta-target-title">${i18n.t('meta.loading')}</h2>
          <p id="meta-target-coords">${i18n.t('meta.ra')}: -- | ${i18n.t('meta.dec')}: --</p>
        </div>

        <div class="quality-indicator-badge" id="quality-indicator">
          <div class="quality-dot"></div>
          <span id="quality-text">${i18n.t('meta.qualityExcellent')}</span>
        </div>
      </div>

      <p class="info-story" id="meta-target-description"></p>

      <div class="info-fun-fact" id="meta-fun-fact" style="display: none;">
        <span id="meta-fun-fact-text"></span>
      </div>

      <div class="utility-actions-row">
        <button type="button" class="btn-secondary touch-target" id="btn-open-embed">
          <span>${i18n.t('meta.shareBtn')}</span>
        </button>
      </div>
    `;

    const btnEmbed = this.container.querySelector('#btn-open-embed');
    if (btnEmbed) {
      btnEmbed.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('grajx:open-embed-modal'));
      });
    }
  }

  async update() {
    const s = store.getState();
    const presets = await api.getPresets();
    const preset = presets.find(p => p.id === s.activePresetId);

    const titleEl = this.container.querySelector('#meta-target-title');
    const coordsEl = this.container.querySelector('#meta-target-coords');
    const descEl = this.container.querySelector('#meta-target-description');
    const factBox = this.container.querySelector('#meta-fun-fact');
    const factEl = this.container.querySelector('#meta-fun-fact-text');
    const qualityBadge = this.container.querySelector('#quality-indicator');
    const qualityText = this.container.querySelector('#quality-text');

    // Textos del objeto actual (preset traducido o coordenadas personalizadas)
    let name, description, fact;
    if (preset) {
      name = preset.name; // nombre propio astronómico: no se traduce
      description = i18n.presetText(preset, 'desc', preset.description);
      fact = i18n.presetText(preset, 'fact', preset.fun_fact);
    } else {
      name = i18n.t('meta.customName');
      description = i18n.t('meta.customDesc');
      fact = i18n.t('meta.customFact');
    }

    if (titleEl) titleEl.textContent = name;
    if (coordsEl) {
      coordsEl.textContent =
        `${i18n.t('meta.ra')}: ${s.ra.toFixed(4)}° | ${i18n.t('meta.dec')}: ${s.dec.toFixed(4)}° (${s.fov.toFixed(1)}' FOV)`;
    }
    if (descEl) descEl.textContent = description;

    if (factBox && factEl) {
      if (fact) {
        factEl.textContent = fact;
        factBox.style.display = 'block';
      } else {
        factBox.style.display = 'none';
      }
    }

    const curFrame = s.frames && s.frames[s.currentFrameIndex];
    if (curFrame && curFrame.quality && qualityText && qualityBadge) {
      const excellent = curFrame.quality.status === 'excellent' || curFrame.quality.status === 'ok';
      qualityText.textContent = excellent ? i18n.t('meta.qualityExcellent') : i18n.t('meta.qualityZodiacal');
      qualityBadge.style.color = excellent ? 'var(--color-status-success)' : 'var(--color-status-warning)';
      qualityBadge.title = excellent ? i18n.t('meta.qualityMsgExcellent') : i18n.t('meta.qualityMsgZodiacal');
    }
  }

  attachEvents() {
    store.subscribe('activePresetId', () => this.update());
    store.subscribe('ra', () => this.update());
    store.subscribe('currentFrameIndex', () => this.update());
    store.subscribe('frames', () => this.update());

    window.addEventListener('grajx:locale-changed', () => {
      this.render();
      this.update();
    });
  }
}
