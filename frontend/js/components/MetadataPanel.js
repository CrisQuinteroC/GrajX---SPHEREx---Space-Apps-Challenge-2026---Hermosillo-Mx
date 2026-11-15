/**
 * CepheusLive — MetadataPanel Component
 * Exposición de Metadatos Científicos y Semáforo de Calidad/Contaminación.
 * Todos los textos se traducen en el cliente (los datos del API se usan solo como respaldo).
 */

import { store } from '../state.js';
import { api } from '../api.js';
import { i18n } from '../i18n.js';

export class MetadataPanel {
  constructor(container) {
    this.container = container;
    this.presets = api.getLocalPresets();
    this.init();
  }

  async init() {
    this.render();
    this.attachEvents();
    this.update();
    const remotePresets = await api.getPresets();
    if (Array.isArray(remotePresets) && remotePresets.length > 0) {
      this.presets = remotePresets;
      this.update();
    }
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

      <div class="telemetry-grid" id="meta-telemetry-grid">
        <div class="telemetry-item">
          <span class="telemetry-label" data-i18n="meta.band">${i18n.t('meta.band')}</span>
          <span class="telemetry-value" id="meta-val-band">--</span>
        </div>
        <div class="telemetry-item">
          <span class="telemetry-label" data-i18n="meta.wavelength">${i18n.t('meta.wavelength')}</span>
          <span class="telemetry-value" id="meta-val-wavelength">--</span>
        </div>
        <div class="telemetry-item">
          <span class="telemetry-label" data-i18n="meta.exposure">${i18n.t('meta.exposure')}</span>
          <span class="telemetry-value" id="meta-val-exposure">--</span>
        </div>
        <div class="telemetry-item">
          <span class="telemetry-label" data-i18n="meta.source">${i18n.t('meta.source')}</span>
          <span class="telemetry-value" id="meta-val-source">--</span>
        </div>
        <div class="telemetry-item">
          <span class="telemetry-label" data-i18n="meta.trajectory">${i18n.t('meta.trajectory')}</span>
          <span class="telemetry-value" id="meta-val-trajectory">--</span>
        </div>
        <div class="telemetry-item">
          <span class="telemetry-label" data-i18n="meta.flags">${i18n.t('meta.flags')}</span>
          <span class="telemetry-value" id="meta-val-flags">--</span>
        </div>
      </div>

      <div class="utility-actions-row">
        <button type="button" class="btn-secondary touch-target" id="btn-open-embed">
          <span>${i18n.t('meta.shareBtn')}</span>
        </button>
        <button type="button" class="btn-secondary touch-target" id="btn-export-gif-panel">
          <span data-i18n="player.exportGif">${i18n.t('player.exportGif')}</span>
        </button>
      </div>
    `;

    const btnEmbed = this.container.querySelector('#btn-open-embed');
    if (btnEmbed) {
      btnEmbed.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('grajx:open-embed-modal'));
      });
    }

    const btnGif = this.container.querySelector('#btn-export-gif-panel');
    if (btnGif) {
      btnGif.addEventListener('click', () => {
        const s = store.getState();
        const queryMode = s.mode === 'curtain'
          ? (s.detector === 'rgb' ? 'rgb' : 'blink')
          : (s.mode === 'rgb' && s.detector === 'all' ? 'blink' : s.mode);
        const url = api.getExportGifUrl({
          ra: s.ra,
          dec: s.dec,
          fov: s.fov,
          mode: queryMode,
          detector: s.detector,
          stretch: s.stretch,
          fps: s.fps,
          source: s.source,
        });
        window.open(url, '_blank', 'noopener');
      });
    }
  }

  update() {
    const s = store.getState();
    const preset = this.presets.find(p => p.id === s.activePresetId);

    const titleEl = this.container.querySelector('#meta-target-title');
    const coordsEl = this.container.querySelector('#meta-target-coords');
    const descEl = this.container.querySelector('#meta-target-description');
    const qualityBadge = this.container.querySelector('#quality-indicator');
    const qualityText = this.container.querySelector('#quality-text');

    // Textos del objeto actual (preset traducido o coordenadas personalizadas)
    let name, description;
    if (preset) {
      name = preset.name; // nombre propio astronómico: no se traduce
      description = i18n.presetText(preset, 'desc', preset.description);
    } else {
      name = i18n.t('meta.customName');
      description = i18n.t('meta.customDesc');
    }

    if (titleEl) titleEl.textContent = name;
    if (coordsEl) {
      const qLabel = s.ra < 90 ? 'Q1' : s.ra < 180 ? 'Q2' : s.ra < 270 ? 'Q3' : 'Q4';
      coordsEl.textContent =
        `${i18n.t('meta.ra')}: ${s.ra.toFixed(4)}° | ${i18n.t('meta.dec')}: ${s.dec.toFixed(4)}° (${s.fov.toFixed(1)}' FOV · ${qLabel})`;
    }
    if (descEl) descEl.textContent = description;

    const curFrame = s.frames && s.frames[s.currentFrameIndex];
    if (curFrame && curFrame.quality && qualityText && qualityBadge) {
      const qStatus = curFrame.quality.status;
      const excellent = qStatus === 'excellent' || qStatus === 'ok';
      qualityText.textContent = excellent ? i18n.t('meta.qualityExcellent') : i18n.t('meta.qualityZodiacal');
      qualityBadge.style.color = excellent
        ? 'var(--color-status-success)'
        : (qStatus === 'bad' ? '#ef4444' : 'var(--color-status-warning)');
      const frac = typeof curFrame.quality.contamination_fraction === 'number'
        ? ` (${(curFrame.quality.contamination_fraction * 100).toFixed(1)}%)`
        : '';
      qualityBadge.title = (excellent ? i18n.t('meta.qualityMsgExcellent') : i18n.t('meta.qualityMsgZodiacal')) + frac;
    }

    const valBand = this.container.querySelector('#meta-val-band');
    const valWl = this.container.querySelector('#meta-val-wavelength');
    const valExp = this.container.querySelector('#meta-val-exposure');
    const valSrc = this.container.querySelector('#meta-val-source');
    const valTraj = this.container.querySelector('#meta-val-trajectory');
    const valFlags = this.container.querySelector('#meta-val-flags');

    if (valBand) {
      const detLabel = s.detector === 'rgb'
        ? 'RGB (D56/D34/D12)'
        : (s.detector === 'all' ? 'D1–D6 (102 bands)' : s.detector);
      const frameMatchesSelection =
        curFrame &&
        curFrame.detector &&
        (s.detector === 'rgb'
          ? String(curFrame.detector).includes('RGB')
          : (s.detector === 'all' ? true : curFrame.detector === s.detector));
      if (frameMatchesSelection && curFrame.band_name) {
        valBand.textContent = `${curFrame.detector} · ${curFrame.band_name} (${s.stretch})`;
      } else {
        valBand.textContent = `${detLabel} · ${s.mode} · Stretch: ${s.stretch}`;
      }
    }

    if (valWl) {
      const detRanges = {
        D1: '0.75–1.10 µm',
        D2: '1.10–1.60 µm',
        D3: '1.60–2.40 µm',
        D4: '2.40–3.80 µm',
        D5: '3.80–4.40 µm',
        D6: '4.40–5.00 µm',
        rgb: '0.75–5.00 µm',
        all: '0.75–5.00 µm',
      };
      if (curFrame && typeof curFrame.wavelength_um === 'number' && s.detector !== 'rgb') {
        valWl.textContent = `${curFrame.wavelength_um.toFixed(2)} µm`;
      } else {
        valWl.textContent = detRanges[s.detector] || '0.75–5.00 µm';
      }
    }

    if (valExp) {
      valExp.textContent = (curFrame && typeof curFrame.exposure_sec === 'number')
        ? `${curFrame.exposure_sec.toFixed(1)} s`
        : '--';
    }

    if (valSrc) {
      const srcMap = {
        irsa_live: 'NASA SPHEREx (IRSA Live)',
        preset_cache: 'NASA SPHEREx (IRSA FITS)',
        local_cache: 'NASA SPHEREx (Caché FITS)',
        synthetic_fallback: 'NASA SPHEREx (Reproyección WCS)',
      };
      const reqLabel = s.source === 'live' ? ' [Live]' : s.source === 'cache' ? ' [FITS]' : '';
      valSrc.textContent = (srcMap[s.dataSource] || s.dataSource || '--') + reqLabel;
    }

    if (valTraj) {
      const traj = s.trajectory || [];
      if (!s.showTrajectory) {
        valTraj.textContent = `${i18n.t('meta.none')} (off)`;
      } else if (traj.length >= 2) {
        const lastDisp = traj[traj.length - 1].displacement_arcsec || 0;
        valTraj.textContent = lastDisp > 0.05
          ? `Δ ${lastDisp.toFixed(2)}" (${traj.length} ep)`
          : i18n.t('meta.stationary');
      } else {
        valTraj.textContent = '--';
      }
    }

    if (valFlags) {
      const flags = curFrame && curFrame.quality && curFrame.quality.active_flags;
      const maskNote = s.includeMask ? '3σ on' : '3σ off';
      valFlags.textContent = (flags && flags.length > 0)
        ? `${flags.join(', ')} (${maskNote})`
        : `${i18n.t('meta.none')} (${maskNote})`;
    }
  }

  attachEvents() {
    [
      'activePresetId',
      'ra',
      'dec',
      'fov',
      'mode',
      'detector',
      'stretch',
      'includeMask',
      'showTrajectory',
      'source',
      'currentFrameIndex',
      'frames',
      'trajectory',
      'dataSource',
    ].forEach((key) => {
      store.subscribe(key, () => this.update());
    });

    window.addEventListener('grajx:locale-changed', () => {
      this.render();
      this.update();
    });
  }
}
