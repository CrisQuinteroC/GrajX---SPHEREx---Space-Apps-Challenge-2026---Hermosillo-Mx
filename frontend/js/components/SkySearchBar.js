/**
 * GrajX — SkySearchBar Component
 * Barra de control: Selección de objetos desde lista, entrada de coordenadas y FOV.
 * Preparada para recibir listas arbitrarias del backend o fuentes externas.
 */

import { store } from '../state.js';
import { api } from '../api.js';

export class SkySearchBar {
  constructor(container) {
    this.container = container;
    this.targetList = [];
    this.init();
  }

  async init() {
    this.renderSkeleton();
    this.targetList = await api.getPresets();
    this.populateTargetSelect();
    this.attachEvents();
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="search-control-bar">
        <!-- Selector desde Lista de Datos -->
        <div class="control-item control-item-select">
          <label for="target-list-select" class="control-label">Objeto de la lista:</label>
          <div class="select-wrapper">
            <select id="target-list-select" class="target-select" aria-label="Seleccionar objeto de la lista">
              <option value="">Cargando lista...</option>
            </select>
          </div>
        </div>

        <!-- Búsqueda o Entrada de Coordenadas Manuales -->
        <div class="control-item control-item-coords">
          <label for="sky-search-input" class="control-label">Coordenadas (RA, Dec) o Nombre:</label>
          <div class="input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              id="sky-search-input" 
              class="search-input" 
              placeholder="Ej. 269.452, 4.693 o nombre..."
              aria-label="Coordenadas celestes o nombre del objeto"
            />
          </div>
        </div>

        <!-- Control de Campo de Visión (FOV) -->
        <div class="control-item control-item-fov">
          <label for="fov-slider" class="control-label">Campo de visión (FOV):</label>
          <div class="fov-wrapper">
            <input 
              type="range" 
              id="fov-slider" 
              class="fov-slider" 
              min="2" 
              max="30" 
              step="1" 
              value="${store.getState().fov}"
            />
            <span id="fov-display-pill" class="fov-value-pill">${store.getState().fov.toFixed(0)}'</span>
          </div>
        </div>

        <!-- Botón de Ejecución -->
        <div class="control-item control-item-action">
          <label class="control-label" style="visibility: hidden;">Acción</label>
          <button type="button" id="btn-submit-search" class="btn-primary">
            <span>Cargar datos</span>
          </button>
        </div>
      </div>
    `;
  }

  populateTargetSelect() {
    const select = this.container.querySelector('#target-list-select');
    if (!select) return;

    const currentPreset = store.getState().activePresetId;

    select.innerHTML = `
      <optgroup label="Objetos disponibles">
        ${this.targetList.map(item => `
          <option value="${item.id}" ${item.id === currentPreset ? 'selected' : ''}>
            ${item.name} (${item.friendly_title})
          </option>
        `).join('')}
      </optgroup>
      <optgroup label="Personalizado">
        <option value="custom">Coordenadas manuales...</option>
      </optgroup>
    `;

    // Sincronizar input de texto con las coordenadas actuales
    const s = store.getState();
    const input = this.container.querySelector('#sky-search-input');
    if (input) {
      input.value = `${s.ra.toFixed(4)}, ${s.dec.toFixed(4)}`;
    }
  }

  attachEvents() {
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

        if (fovSlider && fovPill) {
          fovSlider.value = item.recommended_fov || 5.0;
          fovPill.textContent = `${(item.recommended_fov || 5.0).toFixed(0)}'`;
        }
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
      const matched = this.targetList.find(t => 
        t.name.toLowerCase().includes(val) || 
        t.id.toLowerCase().includes(val) ||
        (t.friendly_title && t.friendly_title.toLowerCase().includes(val))
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

      alert("Formato no reconocido. Selecciona de la lista o escribe coordenadas numéricas (ej. 269.45, 4.69).");
    };

    searchBtn.addEventListener('click', execute);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') execute();
    });

    // Suscribirse al estado externo
    store.subscribe('activePresetId', (id) => {
      if (select && id) {
        select.value = id;
      }
    });

    store.subscribe('ra', (ra, s) => {
      if (input && !s.activePresetId) {
        input.value = `${s.ra.toFixed(4)}, ${s.dec.toFixed(4)}`;
      }
    });
  }
}
