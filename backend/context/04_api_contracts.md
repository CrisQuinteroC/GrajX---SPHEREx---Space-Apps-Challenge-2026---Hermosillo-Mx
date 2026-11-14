# 04 — Contratos de API REST (FastAPI) y Esquemas

## 1. Convenciones Generales

- **Base URL local:** `http://localhost:8000`
- **Prefijo:** `/api`
- **CORS:** Habilitar orígenes del frontend (`http://localhost:5173`, `http://localhost:3000`, `*` en hackathon).
- **Formato de imágenes:** Devolver frames como URL estática cacheada (`/api/assets/<cache_key>/<frame_id>.png`) o data URI base64 (`data:image/png;base64,...`). Preferir URLs estáticas/cacheadas para payloads JSON ligeros y rápidos, con opción de servir bytes directos.

---

## 2. Endpoints

### `GET /api/health`
Verifica que la API esté viva y reporta estado de caché y conectividad IRSA.
```json
{
  "status": "ok",
  "python_version": "3.14.10",
  "presets_ready": ["barnards_star", "epsilon_indi_b", "wise_0855", "rw_aurigae", "r_draconis"],
  "irsa_reachable": true
}
```

---

### `GET /api/presets`
Retorna los **5 objetos de prueba obligatorios** del reto para botones de acceso rápido en el frontend.

| `id` | `name` | `ra_deg` | `dec_deg` | `ra_hms` | `dec_dms` | `default_fov_arcmin` | `phenomenon` |
|---|---|---|---|---|---|---|---|
| `barnards_star` | `Barnard's Star` | `269.45208` | `4.69336` | `17h 57m 48.50s` | `+04° 41' 36.1"` | `6.0` | Movimiento propio más rápido ($10.3''/\text{año}$) + paralaje |
| `epsilon_indi_b` | `Epsilon Indi B` | `331.04390` | `-56.78194` | `22h 04m 10.5s` | `-56° 46' 55"` | `6.0` | Binario de enanas marrones T1+T6 ($4.7''/\text{año}$) |
| `wise_0855` | `WISE 0855` | `133.79513` | `-7.24515` | `08h 55m 10.831s` | `-07° 14' 42.53"` | `6.0` | Enana marrón fría (~250 K), visible solo en IR ($8.1''/\text{año}$) |
| `rw_aurigae` | `RW Aurigae` | `76.95608` | `30.40133` | `05h 07m 49.46s` | `+30° 24' 04.8"` | `6.0` | Estrella joven T Tauri con oscurecimiento abrupto por polvo |
| `r_draconis` | `R Draconis` | `248.16763` | `66.75497` | `16h 32m 40.23s` | `+66° 45' 17.9"` | `6.0` | Gigante roja Mira con pulsación periódica de gran amplitud |

---

### `GET /api/estimate`
Estima cantidad de épocas y tiempo de transferencia aproximado antes de descargar un FOV grande.
- **Query Params:** `ra` (str/float), `dec` (str/float, opcional si `ra` incluye ambos), `fov` (float, arcmin, default `6.0`).
- **Respuesta:**
  ```json
  {
    "ra_deg": 133.79513,
    "dec_deg": -7.24515,
    "fov_arcmin": 15.0,
    "estimated_frames": 24,
    "estimated_size_mb": 4.8,
    "estimated_seconds": 3.5,
    "cached": false
  }
  ```

---

### `GET /api/frames`
Endpoint principal del visor multi-época.
- **Query Params:**
  - `ra` (`str`, requerido): Grados decimales, sexagesimal, o nombre de objeto si se soporta.
  - `dec` (`str`, opcional si `ra` trae el par completo): Grados decimales o sexagesimal.
  - `fov` (`float`, default `6.0`, rango `1.0`–`30.0` en arcmin).
  - `mode` (`enum`: `blink` | `stack` | `diff` | `rgb`, default `blink`).
  - `detector` (`enum`: `all` | `D1` | `D2` | `D3` | `D4` | `D5` | `D6`, default `all`).
  - `stretch` (`enum`: `asinh` | `zscale` | `percentile`, default `asinh`).
  - `include_mask` (`bool`, default `false`): Si `true`, incluye máscara de movimiento $3\sigma$ y *streaklets*.
  - `source` (`enum`: `auto` | `cache` | `live`, default `auto`).

- **Respuesta (`200 OK`):**
  ```json
  {
    "query": {
      "ra_deg": 133.79513,
      "dec_deg": -7.24515,
      "fov_arcmin": 6.0,
      "mode": "diff",
      "detector": "D5",
      "stretch": "asinh"
    },
    "data_source": "irsa_live",
    "wcs": {
      "width": 120,
      "height": 120,
      "pixel_scale_arcsec": 3.0,
      "projection": "TAN"
    },
    "frames": [
      {
        "index": 0,
        "planeid": "spherex_...",
        "image_url": "/api/assets/133.7951_-7.2452_6.0/frame_000_diff.png",
        "mask_overlay_url": null,
        "mjd": 60812.4512,
        "obs_utc": "2025-05-17T10:49:43Z",
        "detector": "D5",
        "band_name": "SPHEREx-D5-04",
        "wavelength_um": 4.12,
        "exposure_sec": 112.5,
        "flux_unit": "MJy/sr",
        "quality": {
          "status": "ok",
          "contamination_fraction": 0.008,
          "active_flags": []
        },
        "streaklets": []
      }
    ]
  }
  ```

---

### `GET /api/spectrum`
Extrae el espectro al vuelo ($0.75\text{–}5.0\,\mu\text{m}$) en la coordenada solicitada.
- **Query Params:**
  - `ra` (`str`, requerido), `dec` (`str`, opcional)
  - `fov` (`float`, default `6.0`)
  - `target_ra` (`float`, opcional; si se omite usa `ra` central; permite hacer clic en cualquier píxel del canvas)
  - `target_dec` (`float`, opcional)
  - `aperture_arcsec` (`float`, default `12.0`)
- **Respuesta (`200 OK`):**
  ```json
  {
    "target_ra_deg": 133.79513,
    "target_dec_deg": -7.24515,
    "aperture_arcsec": 12.0,
    "flux_unit": "MJy/sr",
    "points": [
      {
        "wavelength_um": 0.82,
        "flux": 0.041,
        "flux_err": 0.009,
        "detector": "D1",
        "mjd": 60812.45,
        "flagged": false
      }
    ]
  }
  ```

---

### `GET /api/export/gif`
Genera y descarga un GIF animado del parche con estampado de época/banda.
- **Query Params:** Mismos que `/api/frames` + `fps` (`float`, default `4.0`, rango `0.5`–`15.0`).
- **Respuesta:** `200 OK` con `Content-Type: image/gif` y `Content-Disposition: attachment; filename="spherex_<ra>_<dec>.gif"`.

---

## 3. Manejo de Errores Estándar

| Código HTTP | Cuándo usarlo | Formato |
|---|---|---|
| `400 Bad Request` | Coordenadas inválidas o `fov` fuera de rango. | `{"detail": "Invalid sky coordinates: ..."}` |
| `404 Not Found` | El parche solicitado aún no tiene cobertura SPHEREx en IRSA. | `{"detail": "No SPHEREx exposures found at (ra, dec) within FOV."}` |
| `504 Gateway Timeout` | IRSA no respondió a tiempo y no existe caché local para esa coordenada. | `{"detail": "IRSA query timed out. Try a smaller FOV or retry."}` |

