/**
 * CepheusLive — DetectorSelector Component
 * Selector de los 6 detectores infrarrojos de SPHEREx (D1 a D6) y modo Color Compuesto RGB.
 */

import { store } from '../state.js';
import { i18n } from '../i18n.js';

// Rangos espectrales (µm). Los textos se traducen en tiempo de render.
const DETECTORS = [
  { id: 'all' },
  { id: 'D1', range: [0.75, 1.1] },
  { id: 'D2', range: [1.1, 1.6] },
  { id: 'D3', range: [1.6, 2.4] },
  { id: 'D4', range: [2.4, 3.8] },
  { id: 'D5', range: [3.8, 4.4] },
  { id: 'D6', range: [4.4, 5.0] },
  { id: 'rgb', isRgb: true }
];

export class DetectorSelector {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.render();
    this.attachEvents();
  }

  labelFor(d) {
    if (d.id === 'all') return i18n.t('detector.all');
    if (d.id === 'rgb') return i18n.t('detector.rgb');
    const [a, b] = d.range;
    return `${d.id} (${i18n.num(a, 2)}–${i18n.num(b, 2)} µm)`;
  }

  hintFor(d) {
    if (d.id === 'all') return i18n.t('detector.allHint');
    if (d.id === 'rgb') return i18n.t('detector.rgbHint');
    return i18n.t(`detector.${d.id}hint`);
  }

  render() {
    const current = store.getState().detector;

    this.container.innerHTML = `
      <span class="detectors-title">${i18n.t('detector.title')}</span>
      ${DETECTORS.map(d => `
        <button
          type="button"
          class="detector-btn ${d.isRgb ? 'btn-rgb' : ''} ${d.id === current ? 'active' : ''}"
          data-detector="${d.id}"
          title="${this.hintFor(d)}"
        >
          ${this.labelFor(d)}
        </button>
      `).join('')}
    `;
  }

  attachEvents() {
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('.detector-btn');
      if (btn) {
        const det = btn.dataset.detector;
        if (det === 'rgb') {
          const curMode = store.getState().mode;
          store.setState({ detector: 'rgb', mode: curMode === 'blink' ? 'rgb' : curMode });
        } else {
          store.setState({ detector: det });
        }
        this.highlightActive(det);
      }
    });

    store.subscribe('detector', (det) => this.highlightActive(det));

    // Re-render al cambiar de idioma (el listener delegado del contenedor sigue válido)
    window.addEventListener('grajx:locale-changed', () => this.render());
  }

  highlightActive(det) {
    const buttons = this.container.querySelectorAll('.detector-btn');
    buttons.forEach(b => {
      b.classList.toggle('active', b.dataset.detector === det);
    });
  }
}
