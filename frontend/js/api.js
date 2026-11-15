/**
 * GrajX — API Client
 * Conexión directa con la API REST en Python (FastAPI).
 * Provee preparación completa para ingesta de datos reales FITS / Cutouts de IRSA
 * y mecanismo de respaldo local para los 5 objetos de prueba.
 */

export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.abortController = null;
    this.spectrumAbortController = null;
  }

  async getPresets() {
    try {
      const res = await fetch(`${this.baseUrl}/api/presets`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return await res.json();
    } catch {
      // Fallback local en caso de desconexión momentánea
    }
    return this.getLocalPresets();
  }

  async getFrames(ra, dec, fov, mode, detector, stretch = 'asinh', includeMask = true, source = 'auto') {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const params = new URLSearchParams({
        ra: String(ra),
        dec: String(dec),
        fov: String(fov),
        mode: String(mode),
        detector: String(detector),
        stretch: String(stretch),
        include_mask: includeMask ? 'true' : 'false',
        source: String(source),
      });
      const url = `${this.baseUrl}/api/frames?${params.toString()}`;
      const res = await fetch(url, { signal: this.abortController.signal });
      if (res.ok) return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }

    return this.generateSyntheticFrames(ra, dec, fov, mode, detector);
  }

  async getSpectrum(ra, dec, pixelX = 0.5, pixelY = 0.5, fov = 6.0, source = 'auto') {
    if (this.spectrumAbortController) {
      this.spectrumAbortController.abort();
    }
    this.spectrumAbortController = new AbortController();

    try {
      const params = new URLSearchParams({
        ra: String(ra),
        dec: String(dec),
        fov: String(fov),
        px: String(pixelX),
        py: String(pixelY),
        source: String(source),
      });
      const url = `${this.baseUrl}/api/spectrum?${params.toString()}`;
      const res = await fetch(url, { signal: this.spectrumAbortController.signal });
      if (res.ok) return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }
    return this.generateSyntheticSpectrum(ra, dec);
  }

  async parseCoordinates(raInput, decInput = null) {
    try {
      const params = new URLSearchParams({ ra: String(raInput).trim() });
      if (decInput !== null && String(decInput).trim() !== '') {
        params.set('dec', String(decInput).trim());
      }
      const res = await fetch(`${this.baseUrl}/api/coordinates/parse?${params.toString()}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return await res.json();
    } catch {
      // Offline fallback handled by caller
    }
    return null;
  }

  async getEstimate(ra, dec, fov) {
    try {
      const params = new URLSearchParams({
        ra: String(ra),
        dec: String(dec),
        fov: String(fov),
      });
      const res = await fetch(`${this.baseUrl}/api/estimate?${params.toString()}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return await res.json();
    } catch {
      // Optional telemetry
    }
    return null;
  }

  getExportGifUrl({ ra, dec, fov = 6.0, mode = 'rgb', detector = 'all', stretch = 'asinh', fps = 3.0, source = 'auto' }) {
    const queryMode = mode === 'curtain' ? 'rgb' : mode;
    const params = new URLSearchParams({
      ra: String(ra),
      dec: String(dec),
      fov: String(fov),
      mode: String(queryMode),
      detector: String(detector),
      stretch: String(stretch),
      fps: String(fps),
      source: String(source),
    });
    return `${this.baseUrl}/api/export/gif?${params.toString()}`;
  }

  async getHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return await res.json();
    } catch {
      // Offline
    }
    return null;
  }

  getLocalPresets() {
    return [
      {
        id: "barnards_star",
        name: "Barnard's Star (GJ 699)",
        friendly_title: "Alto Movimiento Propio",
        category: "moving_star",
        description: "Estrella enana roja a 5.96 a.l. Posee el mayor movimiento propio conocido (10.3 arcsec/año).",
        ra: 269.45208,
        dec: 4.69336,
        recommended_fov: 6.0,
        recommended_mode: "rgb",
        recommended_detector: "all",
        fun_fact: "",
        motion_rate: "10.3 arcsec/año"
      },
      {
        id: "epsilon_indi_b",
        name: "Epsilon Indi B (Ba/Bb)",
        friendly_title: "Sistema Binario de Enanas Marrones",
        category: "brown_dwarf",
        description: "Par binario subestelar frío (T1 + T6) en órbita mutua con alto movimiento propio (4.7 arcsec/año).",
        ra: 331.04390,
        dec: -56.78194,
        recommended_fov: 6.0,
        recommended_mode: "rgb",
        recommended_detector: "D4",
        fun_fact: "",
        motion_rate: "4.7 arcsec/año"
      },
      {
        id: "wise_0855",
        name: "WISE 0855−0714",
        friendly_title: "Enana Marrón Ultra Fría",
        category: "cold_brown_dwarf",
        description: "Objeto tipo Y (~250 K). Emisión detectable predominantemente en detectores de onda larga (D5 y D6).",
        ra: 133.79513,
        dec: -7.24515,
        recommended_fov: 6.0,
        recommended_mode: "rgb",
        recommended_detector: "D5",
        fun_fact: "",
        motion_rate: "8.1 arcsec/año"
      },
      {
        id: "rw_aurigae",
        name: "RW Aurigae",
        friendly_title: "Estrella Variable T Tauri",
        category: "variable_star",
        description: "Estrella joven con oscurecimientos episódicos causados por polvo circumestelar.",
        ra: 76.95608,
        dec: 30.40133,
        recommended_fov: 6.0,
        recommended_mode: "rgb",
        recommended_detector: "all",
        fun_fact: "",
        motion_rate: "Variabilidad fotométrica"
      },
      {
        id: "r_draconis",
        name: "R Draconis",
        friendly_title: "Estrella Gigante Pulsante",
        category: "pulsating_giant",
        description: "Estrella gigante roja variable tipo Mira con ciclos periódicos de pulsación y variaciones térmicas.",
        ra: 248.16763,
        dec: 66.75497,
        recommended_fov: 6.0,
        recommended_mode: "rgb",
        recommended_detector: "D3",
        fun_fact: "",
        motion_rate: "Pulsación periódica"
      }
    ];
  }

  generateSyntheticFrames(ra, dec, fov, mode, detector) {
    const dates = [
      { epoch: "Epoch 1 (June 2025)", mjd: 60841.5, date: "2025-06-15" },
      { epoch: "Epoch 2 (December 2025)", mjd: 61025.2, date: "2025-12-15" },
      { epoch: "Epoch 3 (June 2026)", mjd: 61206.8, date: "2026-06-15" },
      { epoch: "Epoch 4 (December 2026)", mjd: 61390.1, date: "2026-12-15" }
    ];

    const isBarnard = Math.abs(ra - 269.45208) < 0.1;
    const isWise0855 = Math.abs(ra - 133.79513) < 0.1;
    const isRwAur = Math.abs(ra - 76.95608) < 0.1;
    const isRDra = Math.abs(ra - 248.16763) < 0.1;
    const isEpsIndi = Math.abs(ra - 331.04390) < 0.1;

    const frames = dates.map((d, index) => {
      let targetX = 0.5;
      let targetY = 0.5;
      let brightness = 1.0;
      let companionX = null;
      let companionY = null;

      if (isBarnard) {
        targetX = 0.48 + index * 0.015;
        targetY = 0.54 - index * 0.028;
      } else if (isWise0855) {
        targetX = 0.46 + index * 0.022;
        targetY = 0.52 - index * 0.012;
        if (detector === 'D1' || detector === 'D2') brightness = 0.04;
        else if (detector === 'D3') brightness = 0.3;
        else brightness = 1.0;
      } else if (isEpsIndi) {
        targetX = 0.48 + index * 0.012;
        targetY = 0.50 + index * 0.015;
        companionX = targetX + 0.04 * Math.cos(index * 1.5);
        companionY = targetY + 0.04 * Math.sin(index * 1.5);
      } else if (isRwAur) {
        const fluxMultipliers = [1.0, 0.25, 0.85, 0.3];
        brightness = fluxMultipliers[index];
      } else if (isRDra) {
        const pulseMultipliers = [0.35, 1.0, 0.4, 0.95];
        brightness = pulseMultipliers[index];
      }

      return {
        frame_index: index,
        epoch_label: d.epoch,
        observation_date_utc: `${d.date}T12:00:00Z`,
        mjd: d.mjd,
        detector: detector,
        target_coords: { x: targetX, y: targetY, brightness, companionX, companionY },
        quality: {
          status: index === 2 && isBarnard ? "warning" : "excellent",
          score_percent: index === 2 && isBarnard ? 88 : 99,
          flags: index === 2 && isBarnard ? ["diffuse_zodiacal_light"] : [],
          message: index === 2 && isBarnard 
            ? "Zodiacal scattering corrected.": "Nominal calibration, no artifacts."
        }
      };
    });

    return {
      target: { ra, dec, fov },
      total_frames: frames.length,
      mode,
      detector,
      frames
    };
  }

  generateSyntheticSpectrum(ra, dec) {
    const isWise0855 = Math.abs(ra - 133.79513) < 0.1;
    const isRDra = Math.abs(ra - 248.16763) < 0.1;

    const points = [];
    const minWl = 0.75;
    const maxWl = 5.0;
    const steps = 60;

    for (let i = 0; i <= steps; i++) {
      const wl = minWl + (i / steps) * (maxWl - minWl);
      let flux = 1.0;

      if (isWise0855) {
        flux = Math.pow(wl / 4.5, 3) * Math.exp(-0.4 * wl);
        if (Math.abs(wl - 3.05) < 0.25) flux *= 0.35;
        if (Math.abs(wl - 4.67) < 0.18) flux *= 0.55;
      } else if (isRDra) {
        flux = Math.sin(wl * 1.5) * 0.3 + 1.2;
        if (Math.abs(wl - 3.05) < 0.2) flux *= 0.6;
        if (Math.abs(wl - 4.67) < 0.2) flux *= 0.45;
      } else {
        flux = 2.0 / Math.pow(wl, 1.2) + 0.2 * Math.sin(wl * 3);
      }

      points.push({
        wavelength_um: parseFloat(wl.toFixed(2)),
        flux: Math.max(0.05, parseFloat(flux.toFixed(3))),
        detector: wl < 1.1 ? "D1" : wl < 1.6 ? "D2" : wl < 2.4 ? "D3" : wl < 3.8 ? "D4" : wl < 4.4 ? "D5" : "D6"
      });
    }

    const detectedMolecules = [];
    if (isWise0855) {
      detectedMolecules.push({ id: "water_ice", name: "Water ice (H₂O)", wavelength: "3.05 µm", confidence: "98%" });
      detectedMolecules.push({ id: "methane", name: "Methane (CH₄)", wavelength: "3.30 µm", confidence: "94%" });
      detectedMolecules.push({ id: "co", name: "Carbon monoxide (CO)", wavelength: "4.67 µm", confidence: "87%" });
    } else {
      detectedMolecules.push({ id: "water_vapor", name: "Water vapor (H₂O)", wavelength: "3.05 µm", confidence: "91%" });
      detectedMolecules.push({ id: "co2", name: "Carbon dioxide (CO₂)", wavelength: "4.26 µm", confidence: "82%" });
    }

    return {
      points,
      molecules: detectedMolecules,
      // El texto final lo traduce el cliente según interpretation_id
      interpretation_id: isWise0855 ? "cold_body" : "continuous",
      interpretation: ""
    };
  }
}

export const api = new ApiClient();
