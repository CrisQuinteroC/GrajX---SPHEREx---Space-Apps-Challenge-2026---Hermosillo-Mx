# Guía de Conexión Backend -> Frontend (GrajX SPHEREx API)

> **Propósito:** Documentar paso a paso cómo levantar el backend en **FastAPI**, probarlo en la consola de debug (`/debug`) o vía `curl`, y conectarlo desde **React / TypeScript** (`frontend/src/api/spherexApi.ts`).

---

## 1. Levantar el Backend y Consola de Debug

Desde la raíz del repositorio:

```bash
source .venv/bin/activate
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Una vez activo el servidor:
- **Consola interactiva de pruebas (Debug UI):** `http://localhost:8000/debug` (o `http://localhost:8000/`)
- **Documentación OpenAPI / Swagger:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

> [!TIP]
> Configura en el frontend una variable de entorno `VITE_API_BASE_URL=http://localhost:8000` (o usa proxy de Vite `/api -> http://localhost:8000`) para concatenar correctamente las rutas relativas `image_url` y `mask_overlay_url` devueltas por `/api/frames`.

---

## 2. Resumen de Endpoints REST

| Método y Ruta | Uso en Frontend | Parámetros Clave | Códigos HTTP |
|---|---|---|---|
| `GET /api/health` | Indicador de estado del backend e IRSA | — | `200` |
| `GET /api/presets` | Botones de 1 clic para los 5 objetos obligatorios | — | `200` |
| `GET /api/coordinates/parse` | Normalizar input de barra de búsqueda (`RA`/`Dec` decimal, sexagesimal o nombre) | `ra`, `dec?` | `200`, `400` |
| `GET /api/estimate` | Mostrar tamaño y tiempo estimado antes de pedir FOV grandes (`20'`–`30'`) | `ra`, `dec?`, `fov` | `200`, `400` |
| `GET /api/frames` | Obtener secuencia de imágenes PNG reproyectadas, metadatos, WCS y `FLAGS` | `ra`, `dec?`, `fov`, `mode`, `detector`, `stretch`, `include_mask`, `source` | `200`, `400`, `404`, `504` |
| `GET /api/spectrum` | Extraer espectro al vuelo ($0.75\text{–}5.0\,\mu\text{m}$) al hacer clic en un objeto | `ra`, `dec?`, `fov`, `target_ra?`, `target_dec?`, `aperture_arcsec` | `200`, `400`, `404`, `504` |
| `GET /api/export/gif` | Descargar animación GIF con sello `MJD` / detector | Mismos de `/api/frames` + `fps` (`0.5`–`15.0`) | `200`, `400`, `404`, `504` |
| `GET /api/assets/{cache_key}/{filename}` | Servir imágenes PNG individuales de `image_url` y `mask_overlay_url` | Path params | `200`, `404` |

---

## 3. Interfaces TypeScript y Cliente `spherexApi.ts`

Copia este bloque directamente en `frontend/src/api/spherexApi.ts`:

```typescript
export type ViewMode = "blink" | "stack" | "diff" | "rgb";
export type DetectorFilter = "all" | "D1" | "D2" | "D3" | "D4" | "D5" | "D6";
export type StretchMethod = "asinh" | "zscale" | "percentile";
export type DataSourceMode = "auto" | "cache" | "live";
export type QualityStatus = "ok" | "warning" | "bad";

export interface HealthResponse {
  status: string;
  python_version: string;
  presets_ready: string[];
  irsa_reachable: boolean;
  active_collections: string[];
}

export interface PresetTarget {
  id: string;
  name: string;
  astrophysical_type: string;
  ra_deg: number;
  dec_deg: number;
  ra_hms: string;
  dec_dms: string;
  default_fov_arcmin: number;
  phenomenon: string;
  recommended_mode: ViewMode;
  recommended_detector: DetectorFilter;
}

export interface CoordinateParseResponse {
  input_ra: string;
  input_dec: string | null;
  ra_deg: number;
  dec_deg: number;
  ra_hms: string;
  dec_dms: string;
  matched_preset: PresetTarget | null;
}

export interface EstimateResponse {
  ra_deg: number;
  dec_deg: number;
  fov_arcmin: number;
  estimated_frames: number;
  estimated_size_mb: number;
  estimated_seconds: number;
  cached: boolean;
}

export interface WCSInfo {
  width: number;
  height: number;
  pixel_scale_arcsec: number;
  projection: string;
  crval1: number;
  crval2: number;
  crpix1: number;
  crpix2: number;
  cdelt1: number;
  cdelt2: number;
}

export interface QualityInfo {
  status: QualityStatus;
  contamination_fraction: number;
  active_flags: string[];
}

export interface StreakletSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FrameItem {
  index: number;
  planeid: string;
  image_url: string;
  mask_overlay_url: string | null;
  mjd: number;
  obs_utc: string;
  detector: string;
  band_name: string;
  wavelength_um: number;
  exposure_sec: number;
  flux_unit: string;
  quality: QualityInfo;
  streaklets: StreakletSegment[];
}

export interface FramesResponse {
  query: {
    ra_deg: number;
    dec_deg: number;
    fov_arcmin: number;
    mode: ViewMode;
    detector: DetectorFilter;
    stretch: StretchMethod;
  };
  data_source: string;
  wcs: WCSInfo;
  frames: FrameItem[];
}

export interface SpectrumPoint {
  wavelength_um: number;
  flux: number;
  flux_err: number;
  detector: string;
  mjd: number;
  flagged: boolean;
}

export interface SpectrumResponse {
  target_ra_deg: number;
  target_dec_deg: number;
  aperture_arcsec: number;
  flux_unit: string;
  points: SpectrumPoint[];
}

export interface FramesParams {
  ra: string | number;
  dec?: string | number;
  fov?: number;
  mode?: ViewMode;
  detector?: DetectorFilter;
  stretch?: StretchMethod;
  include_mask?: boolean;
  source?: DataSourceMode;
}

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ??
  "http://localhost:8000";

export function resolveAssetUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) return relativePath;
  return `${API_BASE}${relativePath}`;
}

async function requestJson<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errBody.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const spherexApi = {
  getHealth: () => requestJson<HealthResponse>("/api/health"),
  getPresets: () => requestJson<PresetTarget[]>("/api/presets"),
  parseCoordinates: (ra: string, dec?: string) =>
    requestJson<CoordinateParseResponse>("/api/coordinates/parse", { ra, dec }),
  estimateTransfer: (ra: string | number, dec?: string | number, fov = 6.0) =>
    requestJson<EstimateResponse>("/api/estimate", { ra, dec, fov }),
  getFrames: (params: FramesParams) =>
    requestJson<FramesResponse>("/api/frames", {
      ra: params.ra,
      dec: params.dec,
      fov: params.fov ?? 6.0,
      mode: params.mode ?? "blink",
      detector: params.detector ?? "all",
      stretch: params.stretch ?? "asinh",
      include_mask: params.include_mask ?? false,
      source: params.source ?? "auto",
    }),
  getSpectrum: (params: {
    ra: string | number;
    dec?: string | number;
    fov?: number;
    target_ra?: number;
    target_dec?: number;
    aperture_arcsec?: number;
    source?: DataSourceMode;
  }) =>
    requestJson<SpectrumResponse>("/api/spectrum", {
      ra: params.ra,
      dec: params.dec,
      fov: params.fov ?? 6.0,
      target_ra: params.target_ra,
      target_dec: params.target_dec,
      aperture_arcsec: params.aperture_arcsec ?? 12.0,
      source: params.source ?? "auto",
    }),
  getExportGifUrl: (params: FramesParams & { fps?: number }) => {
    const url = new URL(`${API_BASE}/api/export/gif`);
    Object.entries({
      ra: params.ra,
      dec: params.dec,
      fov: params.fov ?? 6.0,
      mode: params.mode ?? "blink",
      detector: params.detector ?? "all",
      stretch: params.stretch ?? "asinh",
      fps: params.fps ?? 4.0,
      source: params.source ?? "auto",
    }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
    return url.toString();
  },
};
```

---

## 4. Convertir Clic en el Visor `(clickX, clickY)` -> `(target_ra, target_dec)` para Espectros

Todas las imágenes PNG servidas por `/api/frames` tienen **Norte arriba y Este a la izquierda** (`flip_north_up=True`). Al hacer clic sobre el elemento `<img>` o `<canvas>` del reproductor:

```typescript
export function canvasClickToSkyCoords(
  event: MouseEvent,
  element: HTMLElement,
  wcs: WCSInfo
): { targetRa: number; targetDec: number } {
  const rect = element.getBoundingClientRect();
  const relX = (event.clientX - rect.left) / rect.width;
  const relY = (event.clientY - rect.top) / rect.height;

  // Coordenadas en píxeles de la imagen PNG (0 arriba-izquierda)
  const px = relX * wcs.width;
  const py = relY * wcs.height;

  // Invertir eje Y hacia convención FITS origin="lower"
  const fitsX0 = px;
  const fitsY0 = (wcs.height - 1) - py;

  // Desplazamiento desde CRPIX (1-indexado en FITS)
  const dx = (fitsX0 + 1) - wcs.crpix1;
  const dy = (fitsY0 + 1) - wcs.crpix2;

  const targetDec = wcs.crval2 + dy * wcs.cdelt2;
  const cosDec = Math.max(Math.cos((wcs.crval2 * Math.PI) / 180.0), 0.05);
  const targetRa =
    (((wcs.crval1 + (dx * wcs.cdelt1) / cosDec) % 360.0) + 360.0) % 360.0;

  return { targetRa, targetDec };
}
```

Luego llama inmediatamente a:
```typescript
const { targetRa, targetDec } = canvasClickToSkyCoords(e.nativeEvent, containerRef.current, framesResp.wcs);
const spectrum = await spherexApi.getSpectrum({
  ra: framesResp.query.ra_deg,
  dec: framesResp.query.dec_deg,
  fov: framesResp.query.fov_arcmin,
  target_ra: targetRa,
  target_dec: targetDec,
});
```

---

## 5. Sincronización de URL (Compartible / `<iframe>` Embebible)

Para cumplir con la consideración del reto de URLs incrustables (`Backyard Worlds` / `Zooniverse`):

```text
https://tu-app.web/?ra=133.79513&dec=-7.24515&fov=6&mode=blink&detector=D5&fps=4&embed=1
```

- Al iniciar la app React, leer `new URLSearchParams(window.location.search)` y disparar `spherexApi.getFrames(...)`.
- Cada vez que el usuario cambie coordenadas, `fov`, `mode`, `detector` o `fps`, actualizar con `window.history.replaceState(...)`.
- Si `embed=1` o `embed=true`, ocultar barra de navegación y paneles laterales dejando solo el reproductor + selector básico.
- Para superponer **Gaia DR3** y **AllWISE** en Aladin Lite v3, sincroniza `aladin.gotoRaDec(framesResp.query.ra_deg, framesResp.query.dec_deg)` y `aladin.setFoV(framesResp.query.fov_arcmin / 60.0)`.

---

## 6. Comandos `curl` Rápidos para Pruebas de Backend

```bash
# 1. Health check y colecciones IRSA detectadas
curl -s "http://localhost:8000/api/health" | python -m json.tool

# 2. Listar los 5 objetos benchmark obligatorios
curl -s "http://localhost:8000/api/presets" | python -m json.tool

# 3. Normalizar coordenadas sexagesimales de WISE 0855
curl -s "http://localhost:8000/api/coordinates/parse?ra=08h55m10.831s&dec=-7d14m42.53s" | python -m json.tool

# 4. Estimar transferencia para FOV amplio (15 arcmin)
curl -s "http://localhost:8000/api/estimate?ra=133.79513&dec=-7.24515&fov=15" | python -m json.tool

# 5. Secuencia modo DIFF con máscara 3σ para Barnard's Star
curl -s "http://localhost:8000/api/frames?ra=barnards_star&mode=diff&include_mask=true" | python -m json.tool

# 6. Secuencia WISE 0855 en detector D5 (3.2–4.15 µm)
curl -s "http://localhost:8000/api/frames?ra=133.79513&dec=-7.24515&fov=6&mode=blink&detector=D5" | python -m json.tool

# 7. Espectro completo (0.75–5.0 µm) de WISE 0855
curl -s "http://localhost:8000/api/spectrum?ra=133.79513&dec=-7.24515&fov=6" | python -m json.tool

# 8. Descargar GIF animado de Barnard's Star
curl -s -L "http://localhost:8000/api/export/gif?ra=barnards_star&mode=diff&fps=3" -o barnards_diff.gif
```

