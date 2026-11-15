# Backend Context — CepheusLive (SPHEREx Multi-Epoch & Multi-Band Viewer)

> **Propósito:** Esta carpeta (`backend/context/`) reúne las especificaciones técnicas, contratos de API, pipelines astrofísicos y reglas de implementación para desarrollar el backend en **FastAPI + Astropy** del proyecto **CepheusLive** (NASA Space Apps Challenge 2026 — Hermosillo, Mx).
>
> Complementa a [`AGENTS.md`](../../AGENTS.md) y [`prompt.md`](../../prompt.md).

---

## 1. Índice de Documentos de Contexto

| Archivo | Contenido | Cuándo consultarlo |
|---|---|---|
| [`01_irsa_spherex_ingestion.md`](./01_irsa_spherex_ingestion.md) | Consultas dinámicas a NASA/IPAC IRSA (SIAv2 y TAP/ADQL), construcción de URLs de cutouts, normalización ICRS, caché en disco y presets offline. | Al implementar `irsa_client.py`, `presets.py` o scripts de descarga en `data/presets/`. |
| [`02_fits_mef_and_wcs_pipeline.md`](./02_fits_mef_and_wcs_pipeline.md) | Lectura de Multi-Extension FITS (MEF), decodificación de `FLAGS`, reproyección WCS obligatoria, estiramiento no lineal, coadición `D1–D6` y extracción de espectros. | Al implementar `fits_processor.py`. |
| [`03_motion_detection_and_modes.md`](./03_motion_detection_and_modes.md) | Modos `blink`, `stack` y `diff`, portado de algoritmos de `NEOSSAT_Tutorial` (máscara $3\sigma$, morfología, streaklets con `scikit-image` compatible con Python 3.14) y exportación GIF. | Al implementar `motion_detector.py` y generación de frames/animaciones. |
| [`04_api_contracts.md`](./04_api_contracts.md) | Endpoints REST FastAPI, parámetros de query, esquemas Pydantic JSON, códigos de error, CORS y soporte para URLs compartibles/embebibles. | Al implementar `main.py`, routers y pruebas de integración con el frontend. |

---

## 2. Estructura Objetivo del Backend

```text
backend/
├── context/                          # Esta carpeta de contexto técnico
├── requirements.txt                  # Dependencias Python del backend
├── app/
│   ├── __init__.py
│   ├── main.py                       # App FastAPI, CORS, montaje de rutas y caché estático
│   ├── config.py                     # Rutas de caché/presets, timeouts IRSA, límites de FOV
│   ├── models.py                     # Esquemas Pydantic (Request/Response)
│   ├── presets.py                    # Catálogo de los 5 objetos benchmark obligatorios
│   ├── irsa_client.py                # Cliente TAP/SIAv2 IRSA + descarga de cutouts + caché
│   ├── fits_processor.py             # MEF FITS, reproyección WCS, stretch, D1–D6, espectro
│   └── motion_detector.py            # Resta multi-época, máscara 3σ, streaklets, export GIF
└── tests/
    ├── test_coordinates.py           # Parsing sexagesimal/decimal -> ICRS
    ├── test_fits_pipeline.py         # Reproyección WCS, stretch, flags, espectro
    └── test_api.py                   # Tests de endpoints FastAPI (con fallback local)
```

---

## 3. Entorno Python (`.venv`)

El repositorio cuenta con un entorno virtual en `.venv/` con **Python 3.14.10** y librerías base ya instaladas (`astropy==8.0.2`, `numpy==2.5.4`, `pandas==3.1.1`, `matplotlib==3.11.2`, `pillow==13.0.0`, `requests==2.34.2`, `httpx==0.28.1`).

Para completar las dependencias del backend:

```bash
source .venv/bin/activate
pip install astroquery pyvo reproject scipy scikit-image imageio fastapi uvicorn pydantic
```

> [!NOTE]
> **Compatibilidad Python 3.14:** Evitar `pylsd` o paquetes sin wheels precompilados para Python 3.14 si fallan al compilar; usar `skimage.transform.probabilistic_hough_line` (parte de `scikit-image`) como alternativa nativa para detección de trazas lineales (*streaklets*).

---

## 4. Invariantes Críticas de Desarrollo Backend

1. **Fuente de datos real = IRSA (SPHEREx), nunca NEOSSat:** `NEOSSAT_Tutorial/` es solo referencia algorítmica.
2. **Normalizar siempre coordenadas a ICRS (grados decimales)** con `astropy.coordinates.SkyCoord` en la frontera de la API.
3. **Nunca operar matemáticamente entre épocas sin reproyectar WCS primero:** Las exposiciones de SPHEREx rotan de ángulo de posición entre épocas; usar `reproject.reproject_interp` a una rejilla común antes de sumar o restar.
4. **Cutouts, nunca MEFs completos en vivo:** Solicitar recortes espaciales (`?center={ra},{dec}d&size={fov}`) y cachear en `data/cache/`.
5. **Garantizar modo demo infalible:** Los 5 objetos benchmark deben tener cutouts pre-cacheados en `data/presets/` para responder incluso sin acceso a red o si IRSA presenta latencia alta durante el pitch.
6. **Preservar metadatos científicos:** Exponer `MJD`, unidades de flujo, longitud de onda efectiva ($\lambda_{\text{eff}}$), detector (`D1`–`D6`) y bitmask `FLAGS` en cada respuesta.

