/**
 * GrajX — BlinkPlayer Component
 * Motor de Renderizado en Canvas 2D/WebGL del Visor Astronómico Multi-Época.
 * Soporta Parpadeo Rápido Seguro, Suma de Luz, Resta Temporal (Dipolo) y Cortina Deslizante.
 */

import { store } from '../state.js';
import { api } from '../api.js';

export class BlinkPlayer {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.framesData = null;
    this.curtainDragging = false;
    
    this.backgroundStars = this.generateFieldStars(120);

    this.init();
  }

  async init() {
    this.renderSkeleton();
    this.canvas = this.container.querySelector('#astronomical-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    this.attachEvents();
    await this.loadData();
    this.startAnimationLoop();
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="viewer-top-bar">
        <div class="mode-selector-pill" role="tablist">
          <button type="button" class="mode-tab-btn active" data-mode="diff" role="tab">
            <span>Diferencia</span>
          </button>
          <button type="button" class="mode-tab-btn" data-mode="blink" role="tab">
            <span>Parpadeo</span>
          </button>
          <button type="button" class="mode-tab-btn" data-mode="stack" role="tab">
            <span>Coadición</span>
          </button>
          <button type="button" class="mode-tab-btn" data-mode="curtain" role="tab">
            <span>Cortina</span>
          </button>
        </div>

        <div id="quality-pill-container"></div>
      </div>

      <div class="canvas-viewport-wrapper" id="canvas-viewport">
        <canvas id="astronomical-canvas" class="astronomical-canvas" width="600" height="600"></canvas>
        
        <div class="canvas-epoch-watermark">
          <div class="epoch-badge-dot"></div>
          <span class="epoch-watermark-text" id="epoch-watermark-label">Cargando...</span>
        </div>

        <div class="motion-target-box" id="motion-target-box">
          <div class="motion-target-label" id="motion-target-label">Objetivo detectado</div>
        </div>

        <div class="curtain-divider" id="curtain-divider">
          <div class="curtain-handle" aria-label="Arrastrar cortina">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
              <polyline points="19 18 13 12 19 6"></polyline>
            </svg>
          </div>
        </div>
      </div>

      <div class="playback-controls-panel">
        <div class="timeline-scrubber-row">
          <input 
            type="range" 
            id="epoch-timeline-slider" 
            class="epoch-timeline-slider" 
            min="0" 
            max="3" 
            step="1" 
            value="0"
            aria-label="Línea temporal de épocas SPHEREx"
          />
          <span class="timeline-label" id="timeline-counter-label">1 / 4</span>
        </div>

        <div class="playback-buttons-row">
          <div class="playback-main-btns">
            <button type="button" id="btn-step-prev" class="btn-icon-control touch-target" title="Época anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="19 20 9 12 19 4 19 20"></polygon>
                <line x1="5" y1="19" x2="5" y2="5"></line>
              </svg>
            </button>
            <button type="button" id="btn-play-pause" class="btn-icon-control btn-play-pause touch-target" title="Reproducir / Pausa">
              <svg id="play-pause-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            <button type="button" id="btn-step-next" class="btn-icon-control touch-target" title="Época siguiente">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19"></line>
              </svg>
            </button>
          </div>

          <div class="speed-control-group">
            <span class="speed-meta-label">Velocidad:</span>
            <input 
              type="range" 
              id="speed-slider" 
              class="speed-slider" 
              min="0.5" 
              max="4.0" 
              step="0.5" 
              value="${store.getState().fps}"
              aria-label="Tasa de fotogramas"
            />
            <span class="speed-text" id="speed-display-label">${store.getState().fps.toFixed(1)} fps</span>
          </div>
        </div>

        <div class="detectors-row" id="detectors-bar-container"></div>
      </div>
    `;
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.renderCurrentScene();
  }

  async loadData() {
    const s = store.getState();
    try {
      this.framesData = await api.getFrames(s.ra, s.dec, s.fov, s.mode, s.detector);
      store.setState({ 
        frames: this.framesData.frames, 
        totalFrames: this.framesData.total_frames 
      });
      this.updateScrubber();
      this.renderCurrentScene();
    } catch (e) {
      console.warn("Actualizando consulta:", e);
    }
  }

  updateScrubber() {
    const s = store.getState();
    const scrubber = this.container.querySelector('#epoch-timeline-slider');
    const label = this.container.querySelector('#timeline-counter-label');
    const watermark = this.container.querySelector('#epoch-watermark-label');
    
    if (this.framesData && this.framesData.frames.length > 0) {
      const current = s.currentFrameIndex;
      const total = this.framesData.frames.length;
      scrubber.max = total - 1;
      scrubber.value = current;
      label.textContent = `${current + 1} / ${total}`;

      const f = this.framesData.frames[current];
      if (f) {
        watermark.textContent = `${f.epoch_label} | MJD ${f.mjd.toFixed(1)}`;
      }
    }
  }

  startAnimationLoop() {
    const loop = (timestamp) => {
      const s = store.getState();

      if (s.isPlaying && s.mode === 'blink' && this.framesData && this.framesData.frames.length > 1) {
        const intervalMs = 1000 / s.fps;
        if (timestamp - this.lastFrameTime >= intervalMs) {
          const nextIndex = (s.currentFrameIndex + 1) % this.framesData.frames.length;
          store.setState({ currentFrameIndex: nextIndex });
          this.lastFrameTime = timestamp;
          this.updateScrubber();
        }
      }

      this.renderCurrentScene();
      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  renderCurrentScene() {
    if (!this.ctx || !this.canvas) return;
    const s = store.getState();
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    if (!this.framesData || !this.framesData.frames || this.framesData.frames.length === 0) {
      this.ctx.fillStyle = "#07090e";
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.fillStyle = "#94a3b8";
      this.ctx.font = "14px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("Procesando datos SPHEREx...", w / 2, h / 2);
      return;
    }

    const currentFrame = this.framesData.frames[s.currentFrameIndex] || this.framesData.frames[0];

    if (s.mode === 'diff') {
      this.renderDifferenceMode(w, h, currentFrame);
    } else if (s.mode === 'stack') {
      this.renderStackMode(w, h);
    } else if (s.mode === 'curtain') {
      this.renderCurtainMode(w, h);
    } else {
      this.renderSingleFrame(w, h, currentFrame, 0, 0, w, h);
    }

    this.updateMotionHighlight(w, h, currentFrame);
  }

  renderSingleFrame(w, h, frame, clipX = 0, clipY = 0, clipW = w, clipH = h) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(clipX, clipY, clipW, clipH);
    this.ctx.clip();

    const bgGrad = this.ctx.createRadialGradient(w/2, h/2, 20, w/2, h/2, w);
    bgGrad.addColorStop(0, "#080c16");
    bgGrad.addColorStop(1, "#020408");
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, w, h);

    this.backgroundStars.forEach(star => {
      const sx = star.x * w;
      const sy = star.y * h;
      this.drawStarPSF(sx, sy, star.size, star.brightness, "#e0f2fe");
    });

    if (frame && frame.target_coords) {
      const tc = frame.target_coords;
      const tx = tc.x * w;
      const ty = tc.y * h;
      const isWarm = store.getState().detector === 'D5' || store.getState().detector === 'D6';
      const color = isWarm ? "#FF6361" : "#F59E0B";

      this.drawStarPSF(tx, ty, 6 * tc.brightness, tc.brightness, color, true);

      if (tc.companionX != null) {
        const cx = tc.companionX * w;
        const cy = tc.companionY * h;
        this.drawStarPSF(cx, cy, 4, 0.8, "#818CF8", true);
      }
    }

    this.ctx.restore();
  }

  renderDifferenceMode(w, h, currentFrame) {
    this.ctx.fillStyle = "#141a26";
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    for (let i = 0; i < 30; i++) {
      this.ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }

    if (currentFrame && currentFrame.target_coords) {
      const tc = currentFrame.target_coords;
      const curX = tc.x * w;
      const curY = tc.y * h;

      const refFrame = this.framesData.frames[0];
      const refX = refFrame.target_coords.x * w;
      const refY = refFrame.target_coords.y * h;

      const isBarnard = Math.abs(store.getState().ra - 269.45208) < 0.1;
      const isRwAur = Math.abs(store.getState().ra - 76.95608) < 0.1;

      if (isBarnard && currentFrame.frame_index > 0) {
        this.drawStarPSF(refX, refY, 7, 1.0, "#FF6361", true); // Posición anterior (Coral)
        this.drawStarPSF(curX, curY, 7, 1.0, "#00E5FF", true); // Posición actual (Cian eléctrico curiosidad)

        this.ctx.strokeStyle = "#818CF8"; // Índigo curiosidad
        this.ctx.setLineDash([4, 4]);
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(refX, refY);
        this.ctx.lineTo(curX, curY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      } else if (isRwAur) {
        const diffBright = tc.brightness - refFrame.target_coords.brightness;
        const col = diffBright >= 0 ? "#F59E0B" : "#FF6361";
        this.drawStarPSF(curX, curY, 8 * Math.abs(diffBright), Math.abs(diffBright), col, true);
      } else {
        this.drawStarPSF(curX, curY, 6, 0.9, "#00E5FF", true);
      }
    }
  }

  renderStackMode(w, h) {
    this.ctx.fillStyle = "#04060a";
    this.ctx.fillRect(0, 0, w, h);

    this.backgroundStars.forEach(star => {
      this.drawStarPSF(star.x * w, star.y * h, star.size * 1.3, star.brightness * 1.4, "#ffffff");
    });

    this.framesData.frames.forEach((f, idx) => {
      const tc = f.target_coords;
      const tx = tc.x * w;
      const ty = tc.y * h;
      this.drawStarPSF(tx, ty, 5, 0.7, idx === store.getState().currentFrameIndex ? "#00f0ff" : "#ffb300");
    });
  }

  renderCurtainMode(w, h) {
    const splitX = store.getState().splitPosition * w;
    const f0 = this.framesData.frames[0];
    const f1 = this.framesData.frames[Math.min(1, this.framesData.frames.length - 1)];

    this.renderSingleFrame(w, h, f0, 0, 0, splitX, h);
    this.renderSingleFrame(w, h, f1, splitX, 0, w - splitX, h);

    const divider = this.container.querySelector('#curtain-divider');
    if (divider) {
      divider.style.left = `${splitX}px`;
      divider.style.display = 'block';
    }
  }

  drawStarPSF(x, y, radius, alpha, colorHex, hasHalo = false) {
    this.ctx.save();
    this.ctx.globalAlpha = Math.min(1.0, alpha);

    if (hasHalo) {
      const halo = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 3.5);
      halo.addColorStop(0, colorHex);
      halo.addColorStop(0.3, colorHex);
      halo.addColorStop(1, "transparent");
      this.ctx.fillStyle = halo;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius * 3.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(1.2, radius * 0.6), 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  updateMotionHighlight(w, h, currentFrame) {
    const box = this.container.querySelector('#motion-target-box');
    const label = this.container.querySelector('#motion-target-label');
    const s = store.getState();

    if (!box || !currentFrame || !currentFrame.target_coords) return;

    if (s.mode === 'diff' || s.mode === 'blink') {
      const tc = currentFrame.target_coords;
      const tx = tc.x * w;
      const ty = tc.y * h;
      const size = 44;

      box.style.display = 'block';
      box.style.left = `${tx - size / 2}px`;
      box.style.top = `${ty - size / 2}px`;
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;

      const preset = store.getState().activePresetId;
      label.textContent = preset === 'barnards_star' ? "Desplazamiento propio" :
                          preset === 'wise_0855' ? "Emisión NIR" :
                          preset === 'rw_aurigae' ? "Variación fotométrica" : "Objetivo";
    } else {
      box.style.display = 'none';
    }
  }

  generateFieldStars(count) {
    const stars = [];
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < count; i++) {
      stars.push({
        x: pseudoRandom(),
        y: pseudoRandom(),
        size: 0.8 + pseudoRandom() * 2.2,
        brightness: 0.3 + pseudoRandom() * 0.7
      });
    }
    return stars;
  }

  updatePlayPauseButton(isPlaying) {
    const icon = this.container.querySelector('#play-pause-icon');
    if (!icon) return;
    if (isPlaying) {
      icon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    } else {
      icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    }
  }

  attachEvents() {
    const btnPlay = this.container.querySelector('#btn-play-pause');
    const btnPrev = this.container.querySelector('#btn-step-prev');
    const btnNext = this.container.querySelector('#btn-step-next');
    const scrubber = this.container.querySelector('#epoch-timeline-slider');
    const speedSlider = this.container.querySelector('#speed-slider');
    const speedLabel = this.container.querySelector('#speed-display-label');
    const modeBtns = this.container.querySelectorAll('.mode-tab-btn');

    btnPlay.addEventListener('click', () => {
      const isPlaying = !store.getState().isPlaying;
      store.setState({ isPlaying });
      this.updatePlayPauseButton(isPlaying);
    });

    btnPrev.addEventListener('click', () => {
      const s = store.getState();
      if (this.framesData) {
        const next = (s.currentFrameIndex - 1 + this.framesData.frames.length) % this.framesData.frames.length;
        store.setState({ currentFrameIndex: next, isPlaying: false });
        this.updatePlayPauseButton(false);
        this.updateScrubber();
      }
    });

    btnNext.addEventListener('click', () => {
      const s = store.getState();
      if (this.framesData) {
        const next = (s.currentFrameIndex + 1) % this.framesData.frames.length;
        store.setState({ currentFrameIndex: next, isPlaying: false });
        this.updatePlayPauseButton(false);
        this.updateScrubber();
      }
    });

    scrubber.addEventListener('input', (e) => {
      const idx = parseInt(e.target.value);
      store.setState({ currentFrameIndex: idx, isPlaying: false });
      this.updatePlayPauseButton(false);
      this.updateScrubber();
    });

    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      speedLabel.textContent = `${val.toFixed(1)} fps`;
      store.setState({ fps: val });
    });

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        
        const divider = this.container.querySelector('#curtain-divider');
        if (divider) divider.style.display = mode === 'curtain' ? 'block' : 'none';

        store.setState({ mode });
        this.loadData();
      });
    });

    const viewport = this.container.querySelector('#canvas-viewport');
    const onCurtainMove = (clientX) => {
      const rect = viewport.getBoundingClientRect();
      const pos = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
      store.setState({ splitPosition: pos });
    };

    viewport.addEventListener('mousedown', (e) => {
      if (store.getState().mode === 'curtain') {
        this.curtainDragging = true;
        onCurtainMove(e.clientX);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.curtainDragging) {
        onCurtainMove(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      this.curtainDragging = false;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      window.dispatchEvent(new CustomEvent('grajx:sample-spectrum', { detail: { px, py } }));
    });

    store.subscribe('ra', () => this.loadData());
    store.subscribe('detector', () => this.loadData());
    store.subscribe('mode', (m) => {
      modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    });
  }
}
