/**
 * GrajX — DetectorSelector Component
 * Selector de los 6 detectores infrarrojos de SPHEREx (D1 a D6) y modo Color Compuesto RGB.
 */

import { store } from '../state.js';

export class DetectorSelector {
  constructor(container) {
    this.container = container;
    this.detectors = [
      { id: "all", label: "Todas", hint: "Coadición de 102 bandas espectrales" },
      { id: "D1", label: "D1 (0.75-1.1 um)", hint: "Óptico cercano / estrellas de secuencia principal" },
      { id: "D2", label: "D2 (1.1-1.6 um)", hint: "Baja extinción por polvo interestelar" },
      { id: "D3", label: "D3 (1.6-2.4 um)", hint: "Sensibilidad a gigantes rojas" },
      { id: "D4", label: "D4 (2.4-3.8 um)", hint: "Absorción molecular de hielo de agua (H2O)" },
      { id: "D5", label: "D5 (3.8-4.4 um)", hint: "Monóxido y dióxido de carbono; enanas frías" },
      { id: "D6", label: "D6 (4.4-5.0 um)", hint: "Infrarrojo térmico; objetos de temperatura subestelar" },
      { id: "rgb", label: "Compuesto RGB", hint: "R: D5/D6, G: D3/D4, B: D1/D2", isRgb: true }
    ];
    this.init();
  }

  init() {
    this.render();
    this.attachEvents();
  }

  render() {
    const current = store.getState().detector;

    this.container.innerHTML = `
      <span class="detectors-title">Bandas:</span>
      ${this.detectors.map(d => `
        <button 
          type="button" 
          class="detector-btn ${d.isRgb ? 'btn-rgb' : ''} ${d.id === current ? 'active' : ''}" 
          data-detector="${d.id}"
          title="${d.hint}"
        >
          ${d.label}
        </button>
      `).join('')}
    `;
  }

  attachEvents() {
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('.detector-btn');
      if (btn) {
        const det = btn.dataset.detector;
        store.setState({ detector: det });
        this.highlightActive(det);
      }
    });

    store.subscribe('detector', (det) => this.highlightActive(det));
  }

  highlightActive(det) {
    const buttons = this.container.querySelectorAll('.detector-btn');
    buttons.forEach(b => {
      b.classList.toggle('active', b.dataset.detector === det);
    });
  }
}
