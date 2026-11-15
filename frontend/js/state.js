/**
 * GrajX — State Management & Reactive Store
 * Maneja el estado global reactivo y sincroniza la URL en tiempo real (Deep Linking).
 */
import { i18n } from './i18n.js';

class ReactiveState {
  constructor() {
    this.listeners = new Map();
    
    // Parsear parámetros iniciales de la URL
    const urlParams = new URLSearchParams(window.location.search);

    this.state = {
      // Coordenadas y Campo de Visión (ICRS)
      ra: parseFloat(urlParams.get('ra')) || 269.45208, // Barnard's Star por defecto
      dec: parseFloat(urlParams.get('dec')) || 4.69336,
      fov: parseFloat(urlParams.get('fov')) || 5.0, // Minutos de arco

      // Modos de visualización: 'blink' | 'stack' | 'diff' | 'curtain'
      mode: urlParams.get('mode') || 'diff',

      // Detector activo: 'all' | 'D1'..'D6' | 'rgb'
      detector: urlParams.get('detector') || 'all',

      // Control temporal
      currentFrameIndex: 0,
      isPlaying: urlParams.get('play') === '1',
      fps: Math.min(Math.max(parseFloat(urlParams.get('fps')) || 2.0, 0.5), 5.0),
      splitPosition: 0.5,

      // Identificador de objeto actual
      activePresetId: urlParams.get('preset') || null,

      // Idioma activo (Default 'en')
      language: i18n.locale,

      // Modos de accesibilidad y presentación
      embed: urlParams.get('embed') === '1' || urlParams.get('embed') === 'true',
      highContrast: false,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,

      // Datos cargados desde la API
      frames: [],
      totalFrames: 0,
      activeTargetInfo: null,
      spectralData: null,
      isLoading: false,
      error: null
    };

    if (this.state.reducedMotion) {
      this.state.isPlaying = false;
    }
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
    callback(this.state[key], this.state);
  }

  setState(partialState) {
    const changedKeys = [];
    
    for (const [key, value] of Object.entries(partialState)) {
      if (this.state[key] !== value) {
        this.state[key] = value;
        changedKeys.push(key);
      }
    }

    if (changedKeys.length > 0) {
      const urlRelevantKeys = ['ra', 'dec', 'fov', 'mode', 'detector', 'fps', 'preset', 'embed'];
      if (changedKeys.some(k => urlRelevantKeys.includes(k))) {
        this.syncUrl();
      }

      changedKeys.forEach(key => {
        if (this.listeners.has(key)) {
          this.listeners.get(key).forEach(cb => cb(this.state[key], this.state));
        }
      });

      if (this.listeners.has('*')) {
        this.listeners.get('*').forEach(cb => cb(this.state));
      }
    }
  }

  getState() {
    return this.state;
  }

  syncUrl() {
    const params = new URLSearchParams();
    params.set('ra', this.state.ra.toFixed(5));
    params.set('dec', this.state.dec.toFixed(5));
    params.set('fov', this.state.fov.toFixed(1));
    params.set('mode', this.state.mode);
    params.set('detector', this.state.detector);
    params.set('fps', this.state.fps.toFixed(1));
    if (this.state.activePresetId) {
      params.set('preset', this.state.activePresetId);
    }
    if (this.state.embed) {
      params.set('embed', '1');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }
}

export const store = new ReactiveState();