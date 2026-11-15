/**
 * GrajX — Main Application Bootstrap
 * Orquestador principal de componentes, atajos de teclado y accesibilidad global.
 */

import { store } from './state.js';
import { SkySearchBar } from './components/SkySearchBar.js';
import { BlinkPlayer } from './components/BlinkPlayer.js';
import { DetectorSelector } from './components/DetectorSelector.js';
import { SpectrumChart } from './components/SpectrumChart.js';
import { AladinOverlay } from './components/AladinOverlay.js';
import { MetadataPanel } from './components/MetadataPanel.js';
import { EmbedModal } from './components/EmbedModal.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { i18n } from './i18n.js';

class GrajXApp {
  constructor() {
    this.init();
  }

  init() {
    // Aplicar i18n al DOM inicial
    i18n.applyToDOM();

    // Verificar si estamos en modo embed
    if (store.getState().embed) {
      document.body.classList.add('embed-mode');
    }

    // Inicializar los 5 componentes principales
    const searchContainer = document.querySelector('#search-presets-section');
    if (searchContainer) new SkySearchBar(searchContainer);

    const viewerContainer = document.querySelector('#viewer-card');
    if (viewerContainer) new BlinkPlayer(viewerContainer);

    const detectorsContainer = document.querySelector('#detectors-bar-container');
    if (detectorsContainer) new DetectorSelector(detectorsContainer);

    const spectrumContainer = document.querySelector('#spectrum-card');
    if (spectrumContainer) new SpectrumChart(spectrumContainer);

    const comparisonContainer = document.querySelector('#comparison-card');
    if (comparisonContainer) new AladinOverlay(comparisonContainer);

    const infoContainer = document.querySelector('#info-box');
    if (infoContainer) new MetadataPanel(infoContainer);

    const modalContainer = document.querySelector('#modal-container');
    if (modalContainer) new EmbedModal(modalContainer);

    // Inicializar panel de ajustes
    new SettingsPanel();

    // Escuchar cambios globales de idioma
    window.addEventListener('grajx:locale-changed', () => {
      i18n.applyToDOM();
    });

    // Atajos de Teclado Accesibles
    this.setupKeyboardShortcuts();

    console.log("%cGrajX — Visor SPHEREx NASA Space Apps Challenge 2026 inicializado.", "color: #00f0ff; font-size: 13px; font-weight: bold;");
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        const btnPlay = document.querySelector('#btn-play-pause');
        if (btnPlay) btnPlay.click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const btnPrev = document.querySelector('#btn-step-prev');
        if (btnPrev) btnPrev.click();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const btnNext = document.querySelector('#btn-step-next');
        if (btnNext) btnNext.click();
      } else if (e.key === 'm' || e.key === 'M') {
        const modes = ['diff', 'blink', 'stack', 'curtain'];
        const currentMode = store.getState().mode;
        const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
        const nextBtn = document.querySelector(`.mode-tab-btn[data-mode="${nextMode}"]`);
        if (nextBtn) nextBtn.click();
      }
    });
  }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new GrajXApp();
});