# 03 — Modos de Visualización y Detección de Movimiento (`NEOSSAT_Tutorial` -> SPHEREx)

## 1. Modos de Visualización Multi-Época

Una vez que todos los frames del parche están **reproyectados al mismo WCS común**, el backend expone tres modos principales más una capa opcional de detección automática:

### A) Modo `blink` (Original Cronológico)
- Devuelve la secuencia de frames individuales ordenados por `MJD` ascendente.
- Ideal para observar desplazamiento continuo de **Barnard's Star**, **Epsilon Indi B** y **WISE 0855**, o el parpadeo de brillo de **RW Aurigae** y **R Draconis**.

### B) Modo `stack` (Suma / Mediana)
- Combina épocas mediante `np.nanmedian(cube, axis=0)` (o media ponderada / suma).
- **Uso científico:** Elimina rayos cósmicos transitorios y aumenta la relación señal-ruido ($\text{SNR} \propto \sqrt{N}$) para revelar objetos estacionarios muy tenues o verificar el fondo estelar de referencia.

### C) Modo `diff` (Resta Temporal: $I_t - I_{\text{ref}}$)
- Calcula una imagen de referencia (`ref = np.nanmedian(cube, axis=0)` o la primera época `cube[0]`).
- Calcula `diff_t = cube[t] - ref` para cada época `t`.
- Renderiza con **mapa de color divergente** (ej. `RdBu_r` o `coolwarm` centrado en `0`, con rango simétrico `[-vlim, +vlim]` usando percentiles robustos como `np.nanpercentile(np.abs(diff_cube), 99)`):
  - **Dipolo azul/rojo (negativo/positivo):** Firma inequívoca de un objeto en movimiento (como **Barnard's Star** o **WISE 0855**).
  - **Fuente puramente roja o puramente azul sin par:** Cambio de brillo en objeto fijo (variable/supernova como **RW Aurigae** o **R Draconis**).

---

## 2. Portado de Algoritmos de `NEOSSAT_Tutorial`

Del notebook `NEOSSAT_Tutorial/code/02_Pre Processing and Analysis.ipynb`, portar a `backend/app/motion_detector.py` las siguientes funciones adaptadas a cubos reproyectados con `NaN`:

### 2.1 Máscara de Objetos en Movimiento ($3\sigma$ + Morfología)
```python
import numpy as np
from scipy.ndimage import binary_opening
from skimage.morphology import remove_small_objects

def detect_moving_objects_mask(diff_cube: np.ndarray, sigma_mult: float = 3.0, min_size: int = 12) -> np.ndarray:
    """
    Detecta regiones con cambio estadísticamente significativo en el cubo de diferencias.
    Retorna máscara booleana 3D (T, H, W).
    """
    valid = diff_cube[np.isfinite(diff_cube)]
    if valid.size == 0:
        return np.zeros_like(diff_cube, dtype=bool)

    # Usar MAD (Median Absolute Deviation) como estimador robusto o std
    mad = np.median(np.abs(valid - np.median(valid)))
    robust_std = 1.4826 * mad if mad > 0 else np.std(valid)
    threshold = robust_std * sigma_mult

    masks = np.zeros_like(diff_cube, dtype=bool)
    footprint = np.ones((3, 3), dtype=bool)
    for t in range(diff_cube.shape[0]):
        raw = np.abs(np.nan_to_num(diff_cube[t], nan=0.0)) > threshold
        opened = binary_opening(raw, structure=footprint)
        masks[t] = remove_small_objects(opened, min_size=min_size)
    return masks
```
*(Nota: Ajustar `min_size` según la escala de píxeles de SPHEREx ~`6.2"/px`; en cutouts pequeños de `6'`, una estrella ocupa pocos píxeles, por lo que `min_size` entre `4` y `12` funciona mejor que `20`).*

### 2.2 Detección de Trazas Rápidas (*Streaklets*)
En `NEOSSAT_Tutorial` se usa `pylsd.lsd` tras suavizado Gaussiano (`sigma=1`). Dado que `.venv` corre **Python 3.14.10**, si `pylsd` no instala limpiamente, usar `skimage.transform.probabilistic_hough_line` + `skimage.filters.gaussian` + `skimage.feature.canny` (todos disponibles en `scikit-image`):
- Útil para detectar asteroides rápidos, cometas o satélites que dejan trazas lineales en una sola exposición.
- Devolver lista de segmentos `[(x1, y1, x2, y2), ...]` como overlay opcional en el JSON de metadatos del frame.

---

## 3. Exportación de Animación (`GIF` / secuencia)

Para el endpoint `GET /api/export/gif`:
- Usar `imageio.mimsave(buffer, frames_rgb_uint8, format="GIF", duration=1.0 / fps, loop=0)`.
- Opcionalmente estampar en la esquina superior izquierda (con `Pillow` `ImageDraw`) la fecha `MJD` / `ISO UTC` y el detector (`D1`–`D6`) para que el GIF descargado sea autoexplicativo al compartirse en ciencia ciudadana o redes.

