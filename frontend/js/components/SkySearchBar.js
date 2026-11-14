/**
 * GrajX — SkySearchBar Component
 * Barra de control: Selección de objetos desde lista, entrada de coordenadas y FOV.
 * Preparada para recibir listas arbitrarias del backend o fuentes externas.
 */

import { store } from '../state.js';
import { api } from '../api.js';
import { i18n } from '../i18n.js';

export class SkySearchBar {
  constructor(container) {
    this.container = container;
    this.targetList = [];
    this.init();
  }

  async init() {
    this.renderSkeleton();
    this.attachDomEvents();
    this.attachGlobalEvents(); // una sola vez: store + idioma

    this.targetList = await api.getPresets();
    this.populateTargetSelect();
  }

  renderSkeleton() {
    const fov = store.getState().fov;
    this.container.innerHTML = `
      <div class="search-control-bar">
        <!-- Selector desde Lista de Datos -->
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
              placeholder="${i18n.t('search.coordsPlaceholder')}"
              aria-label="${i18n.t('search.coordsAria')}"
            />
          </div>
        </div>

        <!-- Control de Campo de Visión (FOV) -->
        <div class="control-item control-item-fov">
          <label for="fov-slider" class="control-label">${i18n.t('search.fovLabel')}</label>
          <div class="fov-wrapper">
            <input type="range" id="fov-slider" class="fov-slider" min="2" max="30" step="1" value="${fov}" />
            <span id="fov-display-pill" class="fov-value-pill">${fov.toFixed(0)}'</span>
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
    `;
  }

  populateTargetSelect() {
    const select = this.container.querySelector('#target-list-select');
    if (!select) return;

    const currentPreset = store.getState().activePresetId;
    const isCustom = !currentPreset;

    select.innerHTML = `
      <optgroup label="${i18n.t('search.optgroupTargets')}">
        ${this.targetList.map(item => `
          <option value="${item.id}" ${item.id === currentPreset ? 'selected' : ''}>
            ${item.name} (${i18n.presetText(item, 'title', item.friendly_title)})
          </option>
        `).join('')}
      </optgroup>
      <optgroup label="${i18n.t('search.optgroupCustom')}">
        <option value="custom" ${isCustom ? 'selected' : ''}>${i18n.t('search.customOption')}</option>
      </optgroup>
    `;

    // Sincronizar input de texto con las coordenadas actuales
    const s = store.getState();
    const input = this.container.querySelector('#sky-search-input');
    if (input && !input.value) {
      input.value = `${s.ra.toFixed(4)}, ${s.dec.toFixed(4)}`;
    }
  }

  /** Eventos ligados al DOM actual (se vuelven a ligar tras cada render). */
  attachDomEvents() {
    const select = this.container.querySelector('#target-list-select');
    const input = this.container.querySelector('#sky-search-input');
    const searchBtn = this.container.querySelector('#btn-submit-search');
    const fovSlider = this.container.querySelector('#fov-slider');
    const fovPill = this.container.querySelector('#fov-display-pill');

    // Cambio en el selector de la lista
    select.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (selectedId === 'custom') {
        input.focus();
        return;
      }

      const item = this.targetList.find(t => t.id === selectedId);
      if (item) {
        input.value = `${item.ra.toFixed(4)}, ${item.dec.toFixed(4)}`;
        store.setState({
          activePresetId: item.id,
          ra: item.ra,
          dec: item.dec,
          fov: item.recommended_fov || 5.0,
          mode: item.recommended_mode || 'diff',
          detector: item.recommended_detector || 'all',
          currentFrameIndex: 0
        });

        fovSlider.value = item.recommended_fov || 5.0;
        fovPill.textContent = `${(item.recommended_fov || 5.0).toFixed(0)}'`;
      }
    });

    // Control de slider FOV
    fovSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      fovPill.textContent = `${val.toFixed(0)}'`;
      store.setState({ fov: val });
    });

    // Ejecutar búsqueda o coordenadas ingresadas
    const execute = () => {
      const val = input.value.trim().toLowerCase();
      if (!val) return;

      // Buscar si coincide con el nombre de algún elemento de la lista
      // (nombre propio, id o título en CUALQUIER idioma)
      const matched = this.targetList.find(t =>
        t.name.toLowerCase().includes(val) ||
        t.id.toLowerCase().includes(val) ||
        (t.friendly_title && t.friendly_title.toLowerCase().includes(val)) ||
        i18n.presetText(t, 'title').toLowerCase().includes(val)
      );

      if (matched) {
        select.value = matched.id;
        input.value = `${matched.ra.toFixed(4)}, ${matched.dec.toFixed(4)}`;
        store.setState({
          activePresetId: matched.id,
          ra: matched.ra,
          dec: matched.dec,
          fov: matched.recommended_fov || 5.0,
          mode: matched.recommended_mode || 'diff',
          detector: matched.recommended_detector || 'all'
        });
        fovSlider.value = matched.recommended_fov || 5.0;
        fovPill.textContent = `${(matched.recommended_fov || 5.0).toFixed(0)}'`;
        return;
      }

      // Parsear formato numérico "ra, dec" o "ra dec"
      const parts = val.split(/[\s,]+/);
      if (parts.length >= 2) {
        const parsedRa = parseFloat(parts[0]);
        const parsedDec = parseFloat(parts[1]);
        if (!isNaN(parsedRa) && !isNaN(parsedDec)) {
          select.value = 'custom';
          store.setState({
            ra: Math.max(0, Math.min(360, parsedRa)),
            dec: Math.max(-90, Math.min(90, parsedDec)),
            activePresetId: null
          });
          return;
        }
      }

      alert(i18n.t('search.formatError'));
    };

    searchBtn.addEventListener('click', execute);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') execute();
    });
  }

  /** Suscripciones globales: se registran UNA sola vez (antes se duplicaban en cada cambio de idioma). */
  attachGlobalEvents() {
    store.subscribe('activePresetId', (id) => {
      const select = this.container.querySelector('#target-list-select');
      if (select) select.value = id || 'custom';
    });

    store.subscribe('ra', (ra, s) => {
      const input = this.container.querySelector('#sky-search-input');
      if (input && !s.activePresetId) {
        input.value = `${s.ra.toFixed(4)}, ${s.dec.toFixed(4)}`;
      }
    });

    // Actualizar UI cuando cambia el idioma, conservando lo que el usuario había escrito
    window.addEventListener('grajx:locale-changed', () => {
      const prevInput = this.container.querySelector('#sky-search-input');
      const prevValue = prevInput ? prevInput.value : '';
      this.renderSkeleton();
      this.populateTargetSelect();
      const input = this.container.querySelector('#sky-search-input');
      if (input && prevValue) input.value = prevValue;
      this.attachDomEvents();
    });
  }
}
