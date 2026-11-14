/**
 * GrajX — SkySearchBar Component
 * Barra de control: Exploración libre: entrada de coordenadas (RA, Dec) y FOV. Sin selector de objetos.
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
    this.syncInput();
    this.attachEvents();
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="search-control-bar">
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

  syncInput() {
    const s = store.getState();
    const input = this.container.querySelector('#sky-search-input');
    if (input) input.value = `${s.ra.toFixed(4)}, ${s.dec.toFixed(4)}`;
  }

  attachEvents() {
    const input = this.container.querySelector('#sky-search-input');
    const searchBtn = this.container.querySelector('#btn-submit-search');
    const fovSlider = this.container.querySelector('#fov-slider');
    const fovPill = this.container.querySelector('#fov-display-pill');

    // Control de slider FOV
    fovSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      fovPill.textContent = `${val.toFixed(0)}'`;
      store.setState({ fov: val });
    });

    // Ejecutar: coordenadas libres (prioridad) o nombre conocido (respaldo)
    const execute = () => {
      const val = input.value.trim().toLowerCase();
      if (!val) return;
      input.removeAttribute('aria-invalid');

      const parts = val.split(/[\s,;]+/);
      if (parts.length >= 2) {
        const parsedRa = parseFloat(parts[0]);
        const parsedDec = parseFloat(parts[1]);
        if (!isNaN(parsedRa) && !isNaN(parsedDec)) {
          store.setState({
            ra: ((parsedRa % 360) + 360) % 360,
            dec: Math.max(-90, Math.min(90, parsedDec)),
            activePresetId: null,
            currentFrameIndex: 0
          });
          return;
        }
      }

      // Respaldo: nombre de objeto conocido (no limita la exploración libre)
      const matched = this.targetList.find(t =>
        t.name.toLowerCase().includes(val) ||
        t.id.toLowerCase().includes(val) ||
        (t.friendly_title && t.friendly_title.toLowerCase().includes(val))
      );
      if (matched) {
        input.value = `${matched.ra.toFixed(4)}, ${matched.dec.toFixed(4)}`;
        store.setState({
          activePresetId: matched.id,
          ra: matched.ra,
          dec: matched.dec,
          currentFrameIndex: 0
        });
        return;
      }

      input.setAttribute('aria-invalid', 'true');
      input.title = 'Formato no reconocido. Usa "RA, Dec" en grados (ej. 269.45, 4.69).';
      input.focus();
    };

    searchBtn.addEventListener('click', execute);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') execute();
    });

    // Suscribirse al estado externo
    store.subscribe('ra', (ra, s) => {
      if (input && document.activeElement !== input) {
        input.value = `${s.ra.toFixed(4)}, ${s.dec.toFixed(4)}`;
      }
    });
  }
}
