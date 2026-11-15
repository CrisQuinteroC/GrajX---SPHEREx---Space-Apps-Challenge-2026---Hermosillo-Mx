"""Consola HTML interactiva de debug para probar todos los endpoints del backend CepheusLive."""

from __future__ import annotations

DEBUG_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CepheusLive SPHEREx API — Consola de Debug Backend</title>
  <style>
    :root {
      --bg: #070b14;
      --panel: #0f172a;
      --panel-alt: #162036;
      --border: #26334d;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --accent-2: #818cf8;
      --ok: #22c55e;
      --warn: #f59e0b;
      --bad: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      padding: 14px 22px;
      background: linear-gradient(90deg, #0b1222, #111c36);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    header h1 {
      margin: 0;
      font-size: 1.15rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.16);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .nav-links a {
      color: var(--accent);
      text-decoration: none;
      margin-left: 14px;
      font-size: 0.88rem;
    }
    .nav-links a:hover { text-decoration: underline; }
    .container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 18px;
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 18px;
    }
    @media (max-width: 980px) {
      .container { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 14px;
    }
    .card h2 {
      margin: 0 0 10px 0;
      font-size: 0.92rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
    }
    .preset-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    button, select, input {
      font: inherit;
      color: var(--text);
      background: var(--panel-alt);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 7px 10px;
    }
    button {
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      font-size: 0.84rem;
    }
    button:hover { border-color: var(--accent); background: #1c2b48; }
    button.primary {
      background: #0284c7;
      border-color: #38bdf8;
      font-weight: 600;
    }
    button.primary:hover { background: #0369a1; }
    button.preset-btn.active {
      background: rgba(56, 189, 248, 0.22);
      border-color: var(--accent);
      color: #fff;
    }
    .field { margin-bottom: 10px; }
    .field label {
      display: block;
      font-size: 0.78rem;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .field input[type="text"], .field select { width: 100%; }
    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .viewer-grid {
      display: grid;
      grid-template-columns: minmax(320px, 460px) 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 1180px) {
      .viewer-grid { grid-template-columns: 1fr; }
    }
    .canvas-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      background: #02050b;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      cursor: crosshair;
    }
    .canvas-wrap img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }
    #crosshair {
      position: absolute;
      width: 18px;
      height: 18px;
      margin-left: -9px;
      margin-top: -9px;
      border: 2px solid #facc15;
      border-radius: 50%;
      pointer-events: none;
      display: none;
      box-shadow: 0 0 8px rgba(250, 204, 21, 0.8);
    }
    .player-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .meta-table td {
      padding: 4px 6px;
      border-bottom: 1px solid rgba(38, 51, 77, 0.6);
    }
    .meta-table td:first-child { color: var(--muted); width: 42%; }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 600;
    }
    .pill-ok { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .pill-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .pill-bad { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    pre {
      background: #04070e;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      overflow: auto;
      font-size: 0.78rem;
      max-height: 260px;
      color: #cbd5e1;
      margin: 6px 0 0 0;
    }
    #spectrumCanvas {
      width: 100%;
      height: 220px;
      background: #04070e;
      border: 1px solid var(--border);
      border-radius: 6px;
      display: block;
    }
    .status-bar {
      font-size: 0.8rem;
      color: var(--muted);
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <header>
    <h1>
      CepheusLive — SPHEREx Multi-Epoch API Debug
      <span class="badge">Backend Sandbox</span>
    </h1>
    <div class="nav-links">
      <a href="/docs" target="_blank">Swagger /docs</a>
      <a href="/redoc" target="_blank">ReDoc</a>
      <a href="/api/health" target="_blank">/api/health</a>
      <a href="/api/presets" target="_blank">/api/presets</a>
    </div>
  </header>

  <div class="container">
    <!-- Columna izquierda: Controles -->
    <div>
      <div class="card">
        <h2>1. Objetos Benchmark (1 Clic)</h2>
        <div id="presetButtons" class="preset-grid"></div>
        <div id="presetDesc" class="status-bar" style="margin-top:8px;"></div>
      </div>

      <div class="card">
        <h2>2. Parámetros de Consulta</h2>
        <div class="row-2">
          <div class="field">
            <label for="raInput">RA (deg, hms, o nombre)</label>
            <input id="raInput" type="text" value="133.79513" />
          </div>
          <div class="field">
            <label for="decInput">Dec (deg, dms, opcional)</label>
            <input id="decInput" type="text" value="-7.24515" />
          </div>
        </div>

        <div class="field">
          <label>FOV: <strong id="fovVal">6.0</strong> arcmin</label>
          <input id="fovInput" type="range" min="1" max="30" step="0.5" value="6.0" style="width:100%;" />
        </div>

        <div class="row-2">
          <div class="field">
            <label for="modeSelect">Modo</label>
            <select id="modeSelect">
              <option value="rgb" selected>rgb (Falso Color D56/D34/D12)</option>
              <option value="blink">blink (Secuencia)</option>
              <option value="diff">diff (Resta I_t - I_ref)</option>
              <option value="stack">stack (Mediana)</option>
            </select>
          </div>
          <div class="field">
            <label for="detectorSelect">Detector</label>
            <select id="detectorSelect">
              <option value="all">all (Cronológico)</option>
              <option value="D1">D1 (0.75–1.10 µm)</option>
              <option value="D2">D2 (1.10–1.62 µm)</option>
              <option value="D3">D3 (1.62–2.42 µm)</option>
              <option value="D4">D4 (2.42–3.20 µm)</option>
              <option value="D5">D5 (3.20–4.15 µm)</option>
              <option value="D6">D6 (4.15–5.00 µm)</option>
            </select>
          </div>
        </div>

        <div class="row-2">
          <div class="field">
            <label for="stretchSelect">Estiramiento</label>
            <select id="stretchSelect">
              <option value="asinh">asinh</option>
              <option value="zscale">zscale</option>
              <option value="percentile">percentile</option>
            </select>
          </div>
          <div class="field">
            <label for="sourceSelect">Fuente (source)</label>
            <select id="sourceSelect">
              <option value="auto">auto</option>
              <option value="cache">cache</option>
              <option value="live">live (IRSA real)</option>
            </select>
          </div>
        </div>

        <div class="field" style="display:flex; align-items:center; gap:8px;">
          <input id="maskCheck" type="checkbox" checked />
          <label for="maskCheck" style="margin:0;">Incluir máscara 3σ y streaklets (<code>include_mask=true</code>)</label>
        </div>
        <div class="field" style="display:flex; align-items:center; gap:8px;">
          <input id="trajectoryCheck" type="checkbox" checked />
          <label for="trajectoryCheck" style="margin:0;">Mostrar trayectoria del astro con el tiempo</label>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
          <button class="primary" id="loadFramesBtn">Cargar Secuencia</button>
          <button id="parseCoordsBtn">Parse Coords</button>
          <button id="estimateBtn">Estimar Transferencia</button>
          <button id="exportGifBtn">Descargar GIF</button>
          <button id="healthBtn">Health</button>
        </div>
        <div id="apiStatus" class="status-bar">Listo.</div>
      </div>

      <div class="card">
        <h2>3. Comando cURL Equivalente</h2>
        <pre id="curlPreview"></pre>
      </div>
    </div>

    <!-- Columna derecha: Visor + Espectro + JSON -->
    <div>
      <div class="card">
        <h2>Visor Interactivo Multi-Época (Clic en imagen -> Espectro)</h2>
        <div class="viewer-grid">
          <div>
            <div class="canvas-wrap" id="canvasWrap" title="Haz clic sobre cualquier objeto para extraer su espectro NIR (0.75–5.0 µm)">
              <img id="baseImg" alt="SPHEREx frame" />
              <img id="maskImg" alt="3-sigma mask overlay" />
              <svg id="trajectorySvg" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;"></svg>
              <div id="crosshair"></div>
            </div>
            <div class="player-controls">
              <button id="playBtn">Pausa</button>
              <button id="prevBtn">&lt; Prev</button>
              <button id="nextBtn">Next &gt;</button>
              <input id="frameSlider" type="range" min="0" max="0" value="0" style="flex:1;" />
              <label style="font-size:0.78rem; color:var(--muted);">
                FPS <input id="fpsInput" type="number" min="0.5" max="15" step="0.5" value="3.0" style="width:58px;" />
              </label>
            </div>
          </div>

          <div>
            <table class="meta-table">
              <tr><td>Frame</td><td id="metaIdx">-</td></tr>
              <tr><td>Data Source</td><td id="metaSource">-</td></tr>
              <tr><td>Fecha UTC / MJD</td><td id="metaTime">-</td></tr>
              <tr><td>Detector / Banda</td><td id="metaBand">-</td></tr>
              <tr><td>Longitud de onda</td><td id="metaWave">-</td></tr>
              <tr><td>WCS (px / scale)</td><td id="metaWcs">-</td></tr>
              <tr><td>Calidad (FLAGS)</td><td id="metaQuality">-</td></tr>
              <tr><td>Streaklets</td><td id="metaStreaklets">-</td></tr>
              <tr><td>Trayectoria</td><td id="metaTrajectory">-</td></tr>
            </table>
            <div style="margin-top:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:0.8rem; color:var(--accent); font-weight:600;">Espectro Al Vuelo (0.75–5.0 µm)</span>
                <span id="specTargetLbl" style="font-size:0.75rem; color:var(--muted);">Centro del campo</span>
              </div>
              <canvas id="spectrumCanvas" width="540" height="220"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Respuesta JSON Cruda</h2>
        <pre id="jsonOut">Selecciona un preset o presiona "Cargar Secuencia".</pre>
      </div>
    </div>
  </div>

  <script>
    const state = {
      presets: [],
      framesData: null,
      frameIndex: 0,
      playing: true,
      timer: null,
    };

    const $ = (id) => document.getElementById(id);

    function buildFramesQuery() {
      const params = new URLSearchParams({
        ra: $("raInput").value.trim(),
        fov: $("fovInput").value,
        mode: $("modeSelect").value,
        detector: $("detectorSelect").value,
        stretch: $("stretchSelect").value,
        include_mask: $("maskCheck").checked ? "true" : "false",
        source: $("sourceSelect").value,
      });
      const dec = $("decInput").value.trim();
      if (dec) params.set("dec", dec);
      return params;
    }

    function updateCurlPreview(endpoint, params) {
      const origin = window.location.origin;
      const qs = params ? `?${params.toString()}` : "";
      $("curlPreview").textContent = `curl -s "${origin}${endpoint}${qs}" | jq .`;
    }

    async function callJson(endpoint, params) {
      const qs = params ? `?${params.toString()}` : "";
      const url = `${endpoint}${qs}`;
      updateCurlPreview(endpoint, params);
      const t0 = performance.now();
      $("apiStatus").textContent = `Consultando ${url} ...`;
      const res = await fetch(url);
      const elapsed = Math.round(performance.now() - t0);
      const payload = await res.json();
      $("jsonOut").textContent = JSON.stringify(payload, null, 2);
      if (!res.ok) {
        $("apiStatus").textContent = `Error HTTP ${res.status} (${elapsed} ms): ${payload.detail || "Error"}`;
        throw new Error(payload.detail || `HTTP ${res.status}`);
      }
      $("apiStatus").textContent = `HTTP ${res.status} OK en ${elapsed} ms — ${url}`;
      return payload;
    }

    function renderFrame(idx) {
      const data = state.framesData;
      if (!data || !data.frames.length) return;
      state.frameIndex = ((idx % data.frames.length) + data.frames.length) % data.frames.length;
      const f = data.frames[state.frameIndex];
      $("baseImg").src = f.image_url;
      if (f.mask_overlay_url && $("maskCheck").checked) {
        $("maskImg").src = f.mask_overlay_url;
        $("maskImg").style.display = "block";
      } else {
        $("maskImg").style.display = "none";
      }
      $("frameSlider").max = Math.max(0, data.frames.length - 1);
      $("frameSlider").value = state.frameIndex;

      $("metaIdx").textContent = `${state.frameIndex + 1} / ${data.frames.length} (${f.planeid})`;
      $("metaSource").textContent = data.data_source;
      $("metaTime").textContent = `${f.obs_utc} | MJD ${f.mjd.toFixed(2)}`;
      $("metaBand").textContent = `${f.detector} / ${f.band_name}`;
      $("metaWave").textContent = `${f.wavelength_um.toFixed(3)} µm`;
      $("metaWcs").textContent = `${data.wcs.width}x${data.wcs.height} px @ ${data.wcs.pixel_scale_arcsec}"/px (${data.wcs.projection})`;

      const q = f.quality;
      const flagsTxt = q.active_flags.length ? q.active_flags.join(", ") : "ninguna";
      $("metaQuality").innerHTML = `<span class="pill pill-${q.status}">${q.status.toUpperCase()}</span> ${(q.contamination_fraction * 100).toFixed(2)}% (${flagsTxt})`;
      $("metaStreaklets").textContent = `${f.streaklets.length} detectados`;
      renderTrajectoryOverlay(data, state.frameIndex);
    }

    function renderTrajectoryOverlay(data, activeIdx) {
      const svg = $("trajectorySvg");
      const traj = (data && data.trajectory) ? data.trajectory : [];
      if (traj.length < 2) {
        svg.innerHTML = "";
        $("metaTrajectory").textContent = "Estacionario (< 1 px)";
        return;
      }
      const last = traj[traj.length - 1];
      $("metaTrajectory").textContent = `Δ ${last.displacement_arcsec.toFixed(2)}" (${traj.length} épocas)`;
      if (!$("trajectoryCheck").checked) {
        svg.innerHTML = "";
        return;
      }

      const w = data.wcs.width;
      const h = data.wcs.height;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

      const pts = traj.map(p => `${(p.x + 0.5).toFixed(2)},${(p.y + 0.5).toFixed(2)}`).join(" ");
      const pPrev = traj[traj.length - 2];
      const pEnd = traj[traj.length - 1];
      const dx = pEnd.x - pPrev.x;
      const dy = pEnd.y - pPrev.y;
      const segLen = Math.hypot(dx, dy) || 1;
      const ux = dx / segLen, uy = dy / segLen;
      const aLen = Math.max(2.6, Math.min(w, h) * 0.025);
      const wing = aLen * 0.55;
      const ex = pEnd.x + 0.5, ey = pEnd.y + 0.5;
      const ax1 = (ex - ux * aLen - uy * wing).toFixed(2);
      const ay1 = (ey - uy * aLen + ux * wing).toFixed(2);
      const ax2 = (ex - ux * aLen + uy * wing).toFixed(2);
      const ay2 = (ey - uy * aLen - ux * wing).toFixed(2);

      let html = `<polyline points="${pts}" fill="none" stroke="#facc15" stroke-width="1.3" stroke-dasharray="2.4 1.4" stroke-opacity="0.92" />`;
      html += `<polygon points="${ex.toFixed(2)},${ey.toFixed(2)} ${ax1},${ay1} ${ax2},${ay2}" fill="#facc15" />`;

      traj.forEach((p, idx) => {
        const cx = (p.x + 0.5).toFixed(2);
        const cy = (p.y + 0.5).toFixed(2);
        const isCur = idx === activeIdx;
        if (isCur) {
          html += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="none" stroke="#38bdf8" stroke-width="1.1" />`;
          html += `<circle cx="${cx}" cy="${cy}" r="1.4" fill="#ffffff" />`;
        } else {
          const fill = idx === 0 ? "#38bdf8" : "#facc15";
          html += `<circle cx="${cx}" cy="${cy}" r="1.15" fill="${fill}" fill-opacity="0.9" />`;
        }
      });
      svg.innerHTML = html;
    }

    function restartTimer() {
      if (state.timer) clearInterval(state.timer);
      if (!state.playing || !state.framesData || state.framesData.frames.length <= 1) return;
      const fps = Math.max(0.5, Math.min(15, parseFloat($("fpsInput").value) || 3.0));
      state.timer = setInterval(() => renderFrame(state.frameIndex + 1), 1000 / fps);
    }

    async function loadFrames() {
      const params = buildFramesQuery();
      const data = await callJson("/api/frames", params);
      state.framesData = data;
      renderFrame(0);
      restartTimer();
      await loadSpectrum(data.query.ra_deg, data.query.dec_deg);
    }

    async function loadSpectrum(targetRa, targetDec) {
      const params = new URLSearchParams({
        ra: $("raInput").value.trim(),
        fov: $("fovInput").value,
        source: $("sourceSelect").value,
      });
      if ($("decInput").value.trim()) params.set("dec", $("decInput").value.trim());
      if (targetRa !== undefined && targetDec !== undefined) {
        params.set("target_ra", targetRa.toFixed(6));
        params.set("target_dec", targetDec.toFixed(6));
      }
      const res = await fetch(`/api/spectrum?${params.toString()}`);
      if (!res.ok) return;
      const spec = await res.json();
      $("specTargetLbl").textContent = `RA ${spec.target_ra_deg.toFixed(5)}°, Dec ${spec.target_dec_deg.toFixed(5)}° (${spec.points.length} pts)`;
      drawSpectrum(spec);
    }

    function drawSpectrum(spec) {
      const canvas = $("spectrumCanvas");
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const pts = spec.points || [];
      if (!pts.length) return;

      const padL = 48, padR = 16, padT = 16, padB = 28;
      const pw = W - padL - padR, ph = H - padT - padB;
      const minLam = 0.7, maxLam = 5.1;
      const fluxes = pts.map(p => p.flux);
      const minF = Math.min(0, ...fluxes) * 1.1;
      const maxF = Math.max(0.1, ...fluxes.map((f, i) => f + pts[i].flux_err)) * 1.12;

      const xOf = (lam) => padL + ((lam - minLam) / (maxLam - minLam)) * pw;
      const yOf = (flx) => padT + ph - ((flx - minF) / Math.max(maxF - minF, 1e-6)) * ph;

      // Ejes y grid
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let lam = 1; lam <= 5; lam++) {
        const x = xOf(lam);
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); ctx.stroke();
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px sans-serif";
        ctx.fillText(`${lam}.0µm`, x - 14, H - 8);
      }
      const yZero = yOf(0);
      ctx.strokeStyle = "#334155";
      ctx.beginPath(); ctx.moveTo(padL, yZero); ctx.lineTo(W - padR, yZero); ctx.stroke();

      const detColors = {
        D1: "#60a5fa", D2: "#38bdf8", D3: "#34d399",
        D4: "#a3e635", D5: "#fbbf24", D6: "#f87171"
      };

      // Línea promedio por longitud de onda
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const x = xOf(p.wavelength_um), y = yOf(p.flux);
        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Puntos y barras de error
      pts.forEach((p) => {
        const x = xOf(p.wavelength_um), y = yOf(p.flux);
        const yTop = yOf(p.flux + p.flux_err), yBot = yOf(p.flux - p.flux_err);
        ctx.strokeStyle = p.flagged ? "#ef4444" : (detColors[p.detector] || "#38bdf8");
        ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); ctx.stroke();
        ctx.fillStyle = p.flagged ? "#ef4444" : (detColors[p.detector] || "#38bdf8");
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      });

      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px sans-serif";
      ctx.fillText(maxF.toFixed(2), 4, padT + 10);
      ctx.fillText(minF.toFixed(2), 4, padT + ph);
    }

    $("canvasWrap").addEventListener("click", (ev) => {
      if (!state.framesData) return;
      const rect = $("canvasWrap").getBoundingClientRect();
      const relX = (ev.clientX - rect.left) / rect.width;
      const relY = (ev.clientY - rect.top) / rect.height;

      const wcs = state.framesData.wcs;
      const px = relX * wcs.width;
      const py = relY * wcs.height;

      $("crosshair").style.left = `${relX * 100}%`;
      $("crosshair").style.top = `${relY * 100}%`;
      $("crosshair").style.display = "block";

      // Imagen tiene Norte arriba (y invertido respecto a FITS origin=lower)
      const fitsX0 = px;
      const fitsY0 = (wcs.height - 1) - py;
      const dx = (fitsX0 + 1) - wcs.crpix1;
      const dy = (fitsY0 + 1) - wcs.crpix2;
      const targetDec = wcs.crval2 + dy * wcs.cdelt2;
      const cosDec = Math.max(Math.cos((wcs.crval2 * Math.PI) / 180.0), 0.05);
      const targetRa = (((wcs.crval1 + (dx * wcs.cdelt1) / cosDec) % 360.0) + 360.0) % 360.0;
      loadSpectrum(targetRa, targetDec);
    });

    $("fovInput").addEventListener("input", () => {
      $("fovVal").textContent = parseFloat($("fovInput").value).toFixed(1);
    });
    $("trajectoryCheck").addEventListener("change", () => {
      if (state.framesData) renderTrajectoryOverlay(state.framesData, state.frameIndex);
    });
    $("fpsInput").addEventListener("change", restartTimer);
    $("frameSlider").addEventListener("input", (e) => {
      state.playing = false;
      $("playBtn").textContent = "Play";
      restartTimer();
      renderFrame(parseInt(e.target.value, 10));
    });
    $("playBtn").addEventListener("click", () => {
      state.playing = !state.playing;
      $("playBtn").textContent = state.playing ? "Pausa" : "Play";
      restartTimer();
    });
    $("prevBtn").addEventListener("click", () => {
      state.playing = false; $("playBtn").textContent = "Play"; restartTimer();
      renderFrame(state.frameIndex - 1);
    });
    $("nextBtn").addEventListener("click", () => {
      state.playing = false; $("playBtn").textContent = "Play"; restartTimer();
      renderFrame(state.frameIndex + 1);
    });

    $("loadFramesBtn").addEventListener("click", () => loadFrames().catch(() => {}));
    $("parseCoordsBtn").addEventListener("click", () => {
      const params = new URLSearchParams({ ra: $("raInput").value.trim() });
      if ($("decInput").value.trim()) params.set("dec", $("decInput").value.trim());
      callJson("/api/coordinates/parse", params).catch(() => {});
    });
    $("estimateBtn").addEventListener("click", () => {
      const params = new URLSearchParams({
        ra: $("raInput").value.trim(),
        fov: $("fovInput").value,
      });
      if ($("decInput").value.trim()) params.set("dec", $("decInput").value.trim());
      callJson("/api/estimate", params).catch(() => {});
    });
    $("healthBtn").addEventListener("click", () => callJson("/api/health").catch(() => {}));
    $("exportGifBtn").addEventListener("click", () => {
      const params = buildFramesQuery();
      params.set("fps", $("fpsInput").value || "4.0");
      updateCurlPreview("/api/export/gif", params);
      window.open(`/api/export/gif?${params.toString()}`, "_blank");
    });

    async function init() {
      const presets = await fetch("/api/presets").then(r => r.json());
      state.presets = presets;
      const box = $("presetButtons");
      presets.forEach((p, idx) => {
        const btn = document.createElement("button");
        btn.className = "preset-btn";
        btn.textContent = p.name;
        btn.onclick = () => {
          document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          $("raInput").value = p.ra_hms;
          $("decInput").value = p.dec_dms;
          $("fovInput").value = p.default_fov_arcmin;
          $("fovVal").textContent = p.default_fov_arcmin.toFixed(1);
          $("modeSelect").value = p.recommended_mode;
          $("detectorSelect").value = p.recommended_detector;
          $("presetDesc").textContent = `${p.astrophysical_type} — ${p.phenomenon}`;
          loadFrames().catch(() => {});
        };
        box.appendChild(btn);
        if (idx === 2) { // Iniciar en WISE 0855
          setTimeout(() => btn.click(), 50);
        }
      });
    }

    init();
  </script>
</body>
</html>
"""

