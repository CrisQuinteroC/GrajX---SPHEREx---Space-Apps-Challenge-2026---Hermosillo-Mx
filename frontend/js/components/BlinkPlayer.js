/**
 * GrajX — BlinkPlayer Component
 * Motor de Renderizado en Canvas 2D/WebGL del Visor Astronómico Multi-Época.
 * Soporta Parpadeo Rápido Seguro, Suma de Luz, Resta Temporal (Dipolo) y Cortina Deslizante.
 */

import { store } from '../state.js';
import { api } from '../api.js';
import { i18n } from '../i18n.js';

export class BlinkPlayer {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.framesData = null;
    this.curtainDragging = false;
    this.isSamplingSpectrum = false;
    this.lastSampleDispatch = 0;
    this.imageCache = new Map();
    this.lastValidFrameImg = null;
    this.lastLoadedFov = null;
    this.lastLoadedCoords = null;
    this._loadDebounceTimer = null;

    this.backgroundStars = this.generateFieldStars(120);

    this.init();
  }

  async init() {
    this.renderSkeleton();
    this.canvas = this.container.querySelector('#astronomical-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.updatePlayPauseButton(store.getState().isPlaying);

    window.addEventListener('resize', () => this.resizeCanvas());

    this.attachEvents();
    await this.loadData();
    this.startAnimationLoop();
  }

  renderSkeleton() {
    const s = store.getState();
    const m = s.mode;
    this.container.innerHTML = `
      <div class="viewer-top-bar">
        <div class="mode-selector-pill" role="tablist">
          <button type="button" class="mode-tab-btn ${m === 'rgb' ? 'active' : ''}" data-mode="rgb" role="tab">
            <span data-i18n="player.modeRgb">${i18n.t('player.modeRgb')}</span>
          </button>
          <button type="button" class="mode-tab-btn ${m === 'diff' ? 'active' : ''}" data-mode="diff" role="tab">
            <span data-i18n="player.modeDiff">${i18n.t('player.modeDiff')}</span>
          </button>
          <button type="button" class="mode-tab-btn ${m === 'blink' ? 'active' : ''}" data-mode="blink" role="tab">
            <span data-i18n="player.modeBlink">${i18n.t('player.modeBlink')}</span>
          </button>
          <button type="button" class="mode-tab-btn ${m === 'stack' ? 'active' : ''}" data-mode="stack" role="tab">
            <span data-i18n="player.modeStack">${i18n.t('player.modeStack')}</span>
          </button>
          <button type="button" class="mode-tab-btn ${m === 'curtain' ? 'active' : ''}" data-mode="curtain" role="tab">
            <span data-i18n="player.modeCurtain">${i18n.t('player.modeCurtain')}</span>
          </button>
        </div>

        <div class="viewer-tools-bar">
          <label class="viewer-tool-item">
            <span data-i18n="player.stretch">${i18n.t('player.stretch')}</span>
            <select id="stretch-select" class="viewer-mini-select" aria-label="Stretch">
              <option value="asinh" ${s.stretch === 'asinh' ? 'selected' : ''}>asinh</option>
              <option value="zscale" ${s.stretch === 'zscale' ? 'selected' : ''}>zscale</option>
              <option value="percentile" ${s.stretch === 'percentile' ? 'selected' : ''}>percentile</option>
            </select>
          </label>
          <label class="viewer-tool-check">
            <input type="checkbox" id="toggle-mask-check" ${s.includeMask ? 'checked' : ''} />
            <span data-i18n="player.maskToggle">${i18n.t('player.maskToggle')}</span>
          </label>
          <label class="viewer-tool-check">
            <input type="checkbox" id="toggle-traj-check" ${s.showTrajectory ? 'checked' : ''} />
            <span data-i18n="player.trajToggle">${i18n.t('player.trajToggle')}</span>
          </label>
          <button type="button" id="btn-export-gif" class="viewer-mini-btn" title="${i18n.t('player.exportGif')}" data-i18n="player.exportGif">${i18n.t('player.exportGif')}</button>
        </div>
      </div>

      <div class="canvas-viewport-wrapper" id="canvas-viewport">
        <canvas id="astronomical-canvas" class="astronomical-canvas" width="600" height="600"></canvas>
        
        <div class="canvas-epoch-watermark">
          <div class="epoch-badge-dot"></div>
          <span class="epoch-watermark-text" id="epoch-watermark-label">${i18n.t('player.epochLoading')}</span>
        </div>

        <div class="motion-target-box" id="motion-target-box">
          <div class="motion-target-label" id="motion-target-label">${i18n.t('player.motionTarget')}</div>
        </div>

        <div class="curtain-divider" id="curtain-divider">
          <div class="curtain-handle" aria-label="${i18n.t('player.curtainHandle')}" data-i18n-aria="player.curtainHandle">
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
            aria-label="${i18n.t('player.timeline')}"
            data-i18n-aria="player.timeline"
          />
          <span class="timeline-label" id="timeline-counter-label">1 / 4</span>
        </div>

        <div class="playback-buttons-row">
          <div class="playback-main-btns">
            <button type="button" id="btn-step-prev" class="btn-icon-control touch-target" title="${i18n.t('player.prevEpoch')}" aria-label="${i18n.t('player.prevEpoch')}" data-i18n-title="player.prevEpoch" data-i18n-aria="player.prevEpoch">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="19 20 9 12 19 4 19 20"></polygon>
                <line x1="5" y1="19" x2="5" y2="5"></line>
              </svg>
            </button>
            <button type="button" id="btn-play-pause" class="btn-icon-control btn-play-pause touch-target" title="${i18n.t('player.playPause')}" aria-label="${i18n.t('player.playPause')}" data-i18n-title="player.playPause" data-i18n-aria="player.playPause">
              <svg id="play-pause-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            <button type="button" id="btn-step-next" class="btn-icon-control touch-target" title="${i18n.t('player.nextEpoch')}" aria-label="${i18n.t('player.nextEpoch')}" data-i18n-title="player.nextEpoch" data-i18n-aria="player.nextEpoch">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19"></line>
              </svg>
            </button>
          </div>

          <div class="speed-control-group">
            <span class="speed-meta-label" data-i18n="player.speed">${i18n.t('player.speed')}</span>
            <input 
              type="range" 
              id="speed-slider" 
              class="speed-slider" 
              min="0.5" 
              max="4.0" 
              step="0.5" 
              value="${store.getState().fps}"
              aria-label="${i18n.t('player.fps')}"
              data-i18n-aria="player.fps"
            />
            <span class="speed-text" id="speed-display-label">${store.getState().fps.toFixed(1)} fps</span>
          </div>
        </div>

        <div class="detectors-row" id="detectors-bar-container"></div>
      </div>
    `;
  }

  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderCurrentScene();
  }

  preloadImage(url) {
    if (!url) return Promise.resolve(null);
    const cached = this.imageCache.get(url);
    if (cached) {
      if (cached.status === 'loaded') return Promise.resolve(cached.img);
      if (cached.status === 'loading') return cached.promise;
      return Promise.resolve(null);
    }

    const img = new Image();
    const entry = { status: 'loading', img, promise: null };
    entry.promise = new Promise((resolve) => {
      img.onload = () => {
        entry.status = 'loaded';
        this.renderCurrentScene();
        resolve(img);
      };
      img.onerror = () => {
        entry.status = 'error';
        resolve(null);
      };
    });
    this.imageCache.set(url, entry);
    img.src = url;
    return entry.promise;
  }

  computeQueryMode(s) {
    if (s.mode === 'curtain') {
      return s.detector === 'rgb' ? 'rgb' : 'blink';
    }
    if (s.mode === 'rgb' && s.detector === 'all') {
      return 'blink';
    }
    return s.mode;
  }

  async loadData() {
    const s = store.getState();
    const seq = (this._loadSeq || 0) + 1;
    this._loadSeq = seq;

    const queryMode = this.computeQueryMode(s);

    try {
      // Siempre solicitar includeMask=true para poder alternar la máscara 3σ al instante (0 ms)
      const data = await api.getFrames(
        s.ra,
        s.dec,
        s.fov,
        queryMode,
        s.detector,
        s.stretch,
        true,
        s.source
      );
      if (seq !== this._loadSeq) return;

      const frames = data.frames || [];
      const total = data.total_frames || frames.length;
      const clampedIndex = total > 0 ? Math.min(s.currentFrameIndex, total - 1) : 0;

      // Precargar todos los cuadros/máscaras y esperar al cuadro visible ANTES de intercambiar framesData (evita pantalla negra)
      const waitList = [];
      frames.forEach((f, idx) => {
        const isCritical =
          idx === clampedIndex ||
          (s.mode === 'curtain' && (idx === 0 || idx === total - 1));
        if (f.image_url) {
          const p = this.preloadImage(f.image_url);
          if (isCritical) waitList.push(p);
        }
        if (f.mask_overlay_url) {
          const pm = this.preloadImage(f.mask_overlay_url);
          if (isCritical) waitList.push(pm);
        }
      });

      if (waitList.length > 0) {
        await Promise.all(waitList);
        if (seq !== this._loadSeq) return;
      }

      this.framesData = data;
      this.lastLoadedFov = (data.query && typeof data.query.fov_arcmin === 'number') ? data.query.fov_arcmin : s.fov;
      this.lastLoadedCoords = { ra: s.ra, dec: s.dec };

      store.setState({
        frames,
        totalFrames: total,
        currentFrameIndex: clampedIndex,
        wcs: data.wcs || null,
        trajectory: data.trajectory || [],
        dataSource: data.data_source || 'synthetic_fallback',
      });
      this.updateScrubber();
      this.renderCurrentScene();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      console.warn("Query update:", e);
    }
  }

  updateScrubber() {
    const s = store.getState();
    const scrubber = this.container.querySelector('#epoch-timeline-slider');
    const label = this.container.querySelector('#timeline-counter-label');
    const watermark = this.container.querySelector('#epoch-watermark-label');

    if (this.framesData && this.framesData.frames && this.framesData.frames.length > 0) {
      const total = this.framesData.frames.length;
      const current = Math.min(Math.max(0, s.currentFrameIndex), total - 1);
      scrubber.max = total - 1;
      scrubber.value = current;
      label.textContent = `${current + 1} / ${total}`;

      const f = this.framesData.frames[current];
      if (f && typeof f.mjd === 'number') {
        watermark.textContent = `${i18n.epochLabel(f)} | MJD ${f.mjd.toFixed(1)}`;
      }
    }
  }

  startAnimationLoop() {
    const loop = (timestamp) => {
      const s = store.getState();

      const shouldAnimate =
        s.isPlaying &&
        s.mode !== 'stack' &&
        s.mode !== 'curtain' &&
        this.framesData &&
        this.framesData.frames &&
        this.framesData.frames.length > 1;

      if (shouldAnimate) {
        const intervalMs = 1000 / Math.max(0.25, s.fps || 2);
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

  getImageBox(w, h, imgWidth = 0, imgHeight = 0) {
    const wcs = this.framesData && this.framesData.wcs;
    const iw = imgWidth > 0 ? imgWidth : (wcs && wcs.width > 1 ? wcs.width : 0);
    const ih = imgHeight > 0 ? imgHeight : (wcs && wcs.height > 1 ? wcs.height : 0);

    let box;
    if (iw > 0 && ih > 0) {
      const scale = Math.min(w / iw, h / ih);
      const boxW = iw * scale;
      const boxH = ih * scale;
      box = {
        x: (w - boxW) / 2,
        y: (h - boxH) / 2,
        w: boxW,
        h: boxH,
      };
    } else {
      box = { x: 0, y: 0, w, h };
    }

    // Si el slider de FOV se está ajustando en vivo antes de que llegue el nuevo FITS, escalar ópticamente el cuadro previo
    const s = store.getState();
    const sameCoords =
      this.lastLoadedCoords &&
      Math.abs(this.lastLoadedCoords.ra - s.ra) < 1e-4 &&
      Math.abs(this.lastLoadedCoords.dec - s.dec) < 1e-4;
    if (sameCoords && this.lastLoadedFov && s.fov > 0 && Math.abs(this.lastLoadedFov - s.fov) > 0.05) {
      const opticalRatio = Math.max(0.25, Math.min(4.0, this.lastLoadedFov / s.fov));
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const sw = box.w * opticalRatio;
      const sh = box.h * opticalRatio;
      box = {
        x: cx - sw / 2,
        y: cy - sh / 2,
        w: sw,
        h: sh,
      };
    }

    return box;
  }

  renderCurrentScene() {
    if (!this.ctx || !this.canvas) return;
    const s = store.getState();
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    if (!this.framesData || !this.framesData.frames || this.framesData.frames.length === 0) {
      if (this.lastValidFrameImg) {
        this.ctx.fillStyle = "#05070c";
        this.ctx.fillRect(0, 0, w, h);
        const box = this.getImageBox(w, h, this.lastValidFrameImg.naturalWidth, this.lastValidFrameImg.naturalHeight);
        this.ctx.drawImage(this.lastValidFrameImg, box.x, box.y, box.w, box.h);
        this.lastRenderBox = box;
        return;
      }
      this.ctx.fillStyle = "#07090e";
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.fillStyle = "#94a3b8";
      this.ctx.font = "14px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(i18n.t('player.loading'), w / 2, h / 2);
      return;
    }

    const frames = this.framesData.frames;
    const currentFrame = frames[s.currentFrameIndex] || frames[0];
    let box = { x: 0, y: 0, w, h };

    const entry = currentFrame.image_url ? this.imageCache.get(currentFrame.image_url) : null;

    if (s.mode === 'curtain') {
      const f0 = frames[0];
      const fLast = frames[frames.length - 1];
      const e0 = f0.image_url ? this.imageCache.get(f0.image_url) : null;
      const eLast = fLast.image_url ? this.imageCache.get(fLast.image_url) : null;

      if (e0 && e0.status === 'loaded' && eLast && eLast.status === 'loaded') {
        this.lastValidFrameImg = eLast.img;
        box = this.renderRealCurtain(w, h, f0, e0.img, fLast, eLast.img, s.splitPosition, s.includeMask);
      } else if (this.lastValidFrameImg) {
        box = this.renderRealFrame(w, h, currentFrame, this.lastValidFrameImg, false);
      } else if (f0.image_url && ((e0 && e0.status === 'loading') || (eLast && eLast.status === 'loading'))) {
        this.renderLoadingCanvas(w, h);
      } else {
        this.renderCurtainMode(w, h);
      }
    } else if (currentFrame.image_url && entry && entry.status === 'loaded') {
      this.lastValidFrameImg = entry.img;
      box = this.renderRealFrame(w, h, currentFrame, entry.img, s.includeMask);
    } else if (currentFrame.image_url && entry && entry.status === 'loading') {
      if (this.lastValidFrameImg) {
        box = this.renderRealFrame(w, h, currentFrame, this.lastValidFrameImg, false);
      } else {
        this.renderLoadingCanvas(w, h);
      }
    } else if (s.mode === 'diff') {
      this.renderDifferenceMode(w, h, currentFrame);
    } else if (s.mode === 'stack') {
      this.renderStackMode(w, h);
    } else {
      this.renderSingleFrame(w, h, currentFrame, 0, 0, w, h);
    }

    this.lastRenderBox = box;

    if (s.showTrajectory) {
      this.drawTrajectoryOverlay(w, h, box, currentFrame);
    }

    this.updateMotionHighlight(w, h, currentFrame, box);
  }

  renderLoadingCanvas(w, h) {
    this.ctx.fillStyle = "#05070c";
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = "#94a3b8";
    this.ctx.font = "14px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(i18n.t('player.loading'), w / 2, h / 2);
  }

  renderRealFrame(w, h, frame, img, includeMask) {
    this.ctx.fillStyle = "#05070c";
    this.ctx.fillRect(0, 0, w, h);

    const box = this.getImageBox(w, h, img.naturalWidth, img.naturalHeight);
    this.ctx.drawImage(img, box.x, box.y, box.w, box.h);

    if (includeMask && frame.mask_overlay_url) {
      const maskEntry = this.imageCache.get(frame.mask_overlay_url);
      if (maskEntry && maskEntry.status === 'loaded') {
        this.ctx.drawImage(maskEntry.img, box.x, box.y, box.w, box.h);
      }
    }
    return box;
  }

  renderRealCurtain(w, h, f0, img0, fLast, imgLast, splitPosition, includeMask) {
    this.ctx.fillStyle = "#05070c";
    this.ctx.fillRect(0, 0, w, h);

    const splitX = splitPosition * w;
    const box = this.getImageBox(w, h, img0.naturalWidth, img0.naturalHeight);

    // Left: initial epoch
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, splitX, h);
    this.ctx.clip();
    this.ctx.drawImage(img0, box.x, box.y, box.w, box.h);
    if (includeMask && f0.mask_overlay_url) {
      const m0 = this.imageCache.get(f0.mask_overlay_url);
      if (m0 && m0.status === 'loaded') {
        this.ctx.drawImage(m0.img, box.x, box.y, box.w, box.h);
      }
    }
    this.ctx.restore();

    // Right: final epoch
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(splitX, 0, w - splitX, h);
    this.ctx.clip();
    this.ctx.drawImage(imgLast, box.x, box.y, box.w, box.h);
    if (includeMask && fLast.mask_overlay_url) {
      const mLast = this.imageCache.get(fLast.mask_overlay_url);
      if (mLast && mLast.status === 'loaded') {
        this.ctx.drawImage(mLast.img, box.x, box.y, box.w, box.h);
      }
    }
    this.ctx.restore();

    const divider = this.container.querySelector('#curtain-divider');
    if (divider) {
      divider.style.left = `${splitX}px`;
      divider.style.display = 'block';
    }
    return box;
  }

  toCanvasCoords(pt, box) {
    const wcs = this.framesData && this.framesData.wcs;
    if (wcs && wcs.width > 1 && wcs.height > 1) {
      const nx = (pt.x + 0.5) / wcs.width;
      const ny = (pt.y + 0.5) / wcs.height;
      return {
        x: box.x + nx * box.w,
        y: box.y + ny * box.h,
      };
    }
    return {
      x: box.x + pt.x * box.w,
      y: box.y + pt.y * box.h,
    };
  }

  drawTrajectoryOverlay(w, h, box, currentFrame) {
    const trajectory = (this.framesData && this.framesData.trajectory) || [];
    if (trajectory.length < 2) return;

    const pts = trajectory.map((pt) => ({
      ...pt,
      ...this.toCanvasCoords(pt, box),
    }));

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(box.x, box.y, box.w, box.h);
    this.ctx.clip();

    // Path polyline
    this.ctx.strokeStyle = "rgba(0, 229, 255, 0.85)";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 3]);
    this.ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0) this.ctx.moveTo(p.x, p.y);
      else this.ctx.lineTo(p.x, p.y);
    });
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Direction arrowhead if noticeable motion on canvas
    const first = pts[0];
    const last = pts[pts.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const prev = pts[pts.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const headLen = 8;
      this.ctx.fillStyle = "#00E5FF";
      this.ctx.beginPath();
      this.ctx.moveTo(last.x, last.y);
      this.ctx.lineTo(
        last.x - headLen * Math.cos(angle - Math.PI / 6),
        last.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.lineTo(
        last.x - headLen * Math.cos(angle + Math.PI / 6),
        last.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Epoch waypoints
    pts.forEach((p, idx) => {
      const isCurrent = currentFrame && p.frame_index === currentFrame.frame_index;
      if (idx === 0) {
        this.ctx.fillStyle = "#FF6361";
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = "#00E5FF";
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      if (isCurrent) {
        this.ctx.strokeStyle = "#F59E0B";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    });

    if (dist > 14) {
      this.ctx.font = "11px monospace";
      this.ctx.fillStyle = "#FF6361";
      this.ctx.textAlign = "left";
      this.ctx.fillText("t0", first.x + 6, first.y - 4);
    }

    this.ctx.restore();
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
    const f1 = this.framesData.frames[this.framesData.frames.length - 1];

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

  updateMotionHighlight(w, h, currentFrame, box = { x: 0, y: 0, w, h }) {
    const boxEl = this.container.querySelector('#motion-target-box');
    const label = this.container.querySelector('#motion-target-label');
    const s = store.getState();

    if (!boxEl || !currentFrame) return;

    const showBox = s.mode === 'rgb' || s.mode === 'diff' || s.mode === 'blink';
    if (!showBox) {
      boxEl.style.display = 'none';
      return;
    }

    const trajectory = (this.framesData && this.framesData.trajectory) || [];
    const trajPt = trajectory.find((pt) => pt.frame_index === currentFrame.frame_index)
      || trajectory[s.currentFrameIndex];

    let coords = null;
    if (trajPt) {
      coords = this.toCanvasCoords(trajPt, box);
    } else if (currentFrame.target_coords) {
      coords = {
        x: box.x + currentFrame.target_coords.x * box.w,
        y: box.y + currentFrame.target_coords.y * box.h,
      };
    }

    if (!coords) {
      boxEl.style.display = 'none';
      return;
    }

    const size = 44;
    boxEl.style.display = 'block';
    boxEl.style.left = `${coords.x - size / 2}px`;
    boxEl.style.top = `${coords.y - size / 2}px`;
    boxEl.style.width = `${size}px`;
    boxEl.style.height = `${size}px`;

    const preset = s.activePresetId;
    const baseLabel = preset === 'barnards_star' ? i18n.t('player.labelBarnard') :
                      preset === 'wise_0855' ? i18n.t('player.labelWise') :
                      preset === 'rw_aurigae' ? i18n.t('player.labelRwAur') : i18n.t('player.labelDefault');

    if (trajPt && typeof trajPt.displacement_arcsec === 'number' && trajPt.displacement_arcsec > 0.05) {
      label.textContent = `${baseLabel} · Δ ${trajPt.displacement_arcsec.toFixed(1)}"`;
    } else {
      label.textContent = baseLabel;
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

  scheduleLoadData(delayMs = 0) {
    if (this._loadDebounceTimer) {
      clearTimeout(this._loadDebounceTimer);
      this._loadDebounceTimer = null;
    }
    if (delayMs > 0) {
      this._loadDebounceTimer = setTimeout(() => {
        this._loadDebounceTimer = null;
        this._loadScheduled = false;
        this.loadData();
      }, delayMs);
      return;
    }
    if (this._loadScheduled) return;
    this._loadScheduled = true;
    queueMicrotask(() => {
      this._loadScheduled = false;
      this.loadData();
    });
  }

  attachEvents() {
    const btnPlay = this.container.querySelector('#btn-play-pause');
    const btnPrev = this.container.querySelector('#btn-step-prev');
    const btnNext = this.container.querySelector('#btn-step-next');
    const scrubber = this.container.querySelector('#epoch-timeline-slider');
    const speedSlider = this.container.querySelector('#speed-slider');
    const speedLabel = this.container.querySelector('#speed-display-label');
    const modeBtns = this.container.querySelectorAll('.mode-tab-btn');
    const stretchSelect = this.container.querySelector('#stretch-select');
    const maskCheck = this.container.querySelector('#toggle-mask-check');
    const trajCheck = this.container.querySelector('#toggle-traj-check');
    const btnExportGif = this.container.querySelector('#btn-export-gif');

    this.updatePlayPauseButton(store.getState().isPlaying);

    btnPlay.addEventListener('click', () => {
      const isPlaying = !store.getState().isPlaying;
      store.setState({ isPlaying });
      this.updatePlayPauseButton(isPlaying);
    });

    btnPrev.addEventListener('click', () => {
      const s = store.getState();
      if (this.framesData && this.framesData.frames.length > 0) {
        const next = (s.currentFrameIndex - 1 + this.framesData.frames.length) % this.framesData.frames.length;
        store.setState({ currentFrameIndex: next, isPlaying: false });
        this.updatePlayPauseButton(false);
        this.updateScrubber();
      }
    });

    btnNext.addEventListener('click', () => {
      const s = store.getState();
      if (this.framesData && this.framesData.frames.length > 0) {
        const next = (s.currentFrameIndex + 1) % this.framesData.frames.length;
        store.setState({ currentFrameIndex: next, isPlaying: false });
        this.updatePlayPauseButton(false);
        this.updateScrubber();
      }
    });

    scrubber.addEventListener('input', (e) => {
      const idx = parseInt(e.target.value, 10);
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
        const mode = btn.dataset.mode;
        if (mode === 'rgb' && store.getState().detector !== 'rgb') {
          store.setState({ mode: 'rgb', detector: 'rgb' });
        } else {
          store.setState({ mode });
        }
      });
    });

    if (stretchSelect) {
      stretchSelect.addEventListener('change', (e) => {
        store.setState({ stretch: e.target.value });
      });
    }

    if (maskCheck) {
      maskCheck.addEventListener('change', (e) => {
        store.setState({ includeMask: e.target.checked });
      });
    }

    if (trajCheck) {
      trajCheck.addEventListener('change', (e) => {
        store.setState({ showTrajectory: e.target.checked });
      });
    }

    if (btnExportGif) {
      btnExportGif.addEventListener('click', () => {
        const s = store.getState();
        const url = api.getExportGifUrl({
          ra: s.ra,
          dec: s.dec,
          fov: s.fov,
          mode: this.computeQueryMode(s),
          detector: s.detector,
          stretch: s.stretch,
          fps: s.fps,
          source: s.source,
        });
        window.open(url, '_blank', 'noopener');
      });
    }

    const viewport = this.container.querySelector('#canvas-viewport');
    const onCurtainMove = (clientX) => {
      const rect = viewport.getBoundingClientRect();
      const pos = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / Math.max(1, rect.width)));
      store.setState({ splitPosition: pos });
    };

    const emitSpectrumSample = (clientX, clientY, force = false) => {
      const now = performance.now();
      if (!force && now - this.lastSampleDispatch < 90) return;
      this.lastSampleDispatch = now;
      const rect = this.canvas.getBoundingClientRect();
      const box = this.lastRenderBox || { x: 0, y: 0, w: rect.width, h: rect.height };
      const relX = (clientX - rect.left - box.x) / Math.max(1, box.w);
      const relY = (clientY - rect.top - box.y) / Math.max(1, box.h);
      const px = Math.max(0.0, Math.min(1.0, relX));
      const py = Math.max(0.0, Math.min(1.0, relY));
      store.setState({ samplePoint: { px, py } });
      window.dispatchEvent(new CustomEvent('grajx:sample-spectrum', { detail: { px, py } }));
    };

    viewport.addEventListener('pointerdown', (e) => {
      if (store.getState().mode === 'curtain') {
        this.curtainDragging = true;
        if (viewport.setPointerCapture) {
          try { viewport.setPointerCapture(e.pointerId); } catch {}
        }
        onCurtainMove(e.clientX);
      } else if (e.target === this.canvas) {
        this.isSamplingSpectrum = true;
        emitSpectrumSample(e.clientX, e.clientY, true);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.curtainDragging) {
        onCurtainMove(e.clientX);
      } else if (this.isSamplingSpectrum) {
        emitSpectrumSample(e.clientX, e.clientY, false);
      }
    });

    const stopPointers = () => {
      this.curtainDragging = false;
      this.isSamplingSpectrum = false;
    };
    window.addEventListener('pointerup', stopPointers);
    window.addEventListener('pointercancel', stopPointers);

    // Al cambiar de idioma: re-traducir textos estáticos y dinámicos sin recrear el canvas
    window.addEventListener('grajx:locale-changed', () => {
      i18n.applyToDOM();
      this.updateScrubber();
      this.renderCurrentScene();
    });

    store.subscribe('ra', () => this.scheduleLoadData(60));
    store.subscribe('dec', () => this.scheduleLoadData(60));
    store.subscribe('fov', () => {
      this.renderCurrentScene();
      this.scheduleLoadData(80);
    });
    store.subscribe('detector', () => this.scheduleLoadData(0));
    store.subscribe('stretch', (st) => {
      if (stretchSelect && stretchSelect.value !== st) stretchSelect.value = st;
      this.scheduleLoadData(0);
    });
    store.subscribe('includeMask', (val) => {
      if (maskCheck && maskCheck.checked !== val) maskCheck.checked = val;
      if (this.framesData && this.framesData.frames && this.framesData.frames.length > 0) {
        this.renderCurrentScene();
      } else {
        this.scheduleLoadData(0);
      }
    });
    store.subscribe('showTrajectory', (val) => {
      if (trajCheck && trajCheck.checked !== val) trajCheck.checked = val;
      this.renderCurrentScene();
    });
    store.subscribe('source', () => this.scheduleLoadData(0));
    store.subscribe('splitPosition', () => this.renderCurrentScene());
    store.subscribe('currentFrameIndex', () => {
      this.updateScrubber();
      this.renderCurrentScene();
    });
    store.subscribe('fps', (val) => {
      if (speedSlider && parseFloat(speedSlider.value) !== val) speedSlider.value = val;
      if (speedLabel) speedLabel.textContent = `${val.toFixed(1)} fps`;
    });
    store.subscribe('isPlaying', (p) => this.updatePlayPauseButton(p));
    store.subscribe('mode', (m) => {
      modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
      const divider = this.container.querySelector('#curtain-divider');
      if (divider) divider.style.display = m === 'curtain' ? 'block' : 'none';
      this.scheduleLoadData(0);
    });
  }
}