# 02 — Procesamiento FITS (MEF), Reproyección WCS, Detectores D1–D6 y Espectro

## 1. Estructura de los Cutouts Multi-Extension FITS (MEF) de SPHEREx

Al abrir un cutout FITS con `astropy.io.fits.open(path)`, inspeccionar las extensiones por nombre (`hdu.name`) con fallback por índice, ya que el orden puede variar según el release:

| HDU típica | Contenido | Uso en el Backend |
|---|---|---|
| `PRIMARY` / `IMAGE` | Flujo calibrado 2D (`float32`/`float64`), unidades (ej. `MJy/sr` o `Jy`) y cabecera WCS (`CRVAL1`, `CRVAL2`, `CDELT`/`PC`, `CTYPE1/2`). | Imagen base, reproyección WCS, stacking, resta y fotometría de apertura. |
| `FLAGS` | Mapa entero 2D (bitmask) de calidad por píxel. | Detección de rayos cósmicos, píxeles calientes, saturación, persistencia y luz dispersa. |
| `VARIANCE` / `ERR` | Mapa de varianza o incertidumbre por píxel. | Ponderación inversa a la varianza ($1/\sigma^2$) al coadicionar detectores y barras de error del espectro. |
| `ZODI` / `WCS` espectral | Fondo zodiacal y mapeo de longitud de onda ($\lambda$) según posición $(x, y)$ en el filtro variable lineal (LVF). | Extracción de $\lambda_{\text{eff}}$ exacta en la coordenada del objeto para el espectro al vuelo. |

---

## 2. Reproyección WCS Obligatoria entre Épocas

> [!CAUTION]
> **Regla Crítica:** Las exposiciones de SPHEREx tomadas con 6 meses de diferencia tienen distintos ángulos de rotación (*roll angle*) y centros de píxel. **Nunca** sumar o restar arrays NumPy crudos directamente; esto genera falsos dipolos en todas las estrellas fijas.

### Pipeline de Alineación Espacial
1. Construir una **rejilla WCS objetivo común** (`target_wcs`, `shape_out`) centrada en `(ra_deg, dec_deg)` con proyección tangencial `TAN` (`RA---TAN`, `DEC--TAN`), escala de píxel uniforme (ej. escala nativa de SPHEREx ~`6.2 arcsec/px` o sobremuestreo controlado si el FOV es pequeño) y dimensiones derivadas de `fov_arcmin`.
2. Para cada frame FITS:
   ```python
   from astropy.wcs import WCS
   from reproject import reproject_interp

   src_wcs = WCS(image_hdu.header)
   reprojected_data, footprint = reproject_interp(
       (image_hdu.data.astype(np.float64), src_wcs),
       target_wcs,
       shape_out=shape_out,
   )
   ```
3. Si existe HDU `FLAGS`, reproyectar con `order="nearest-neighbor"` (o evaluar cobertura de bits) para no interpolar bitmasks enteros.
4. Si existe HDU `VARIANCE`, reproyectar para propagar incertidumbre en coadiciones y fotometría.

---

## 3. Estiramiento No Lineal de Contraste (8-bit PNG/WebP)

Las fuentes astronómicas combinan estrellas brillantes y enanas marrones muy tenues (como **WISE 0855**). El escalado lineal oculta los objetos débiles.

### Secuencia Recomendada (`normalize_to_uint8`)
1. Limpiar `NaN` e `Inf`:
   ```python
   clean = np.nan_to_num(data, nan=np.nanmedian(data) if np.isfinite(data).any() else 0.0)
   ```
2. Calcular límites robustos con `astropy.visualization`:
   - Primario: `ZScaleInterval()` o `PercentileInterval(99.0)` / percentiles `[1.0, 99.5]`.
   - Transformación no lineal: `AsinhStretch(a=0.1)` (resalta estructura tenue sin saturar el núcleo estelar).
   - Fallback simple (referencia de `NEOSSAT_Tutorial`): percentiles `[5, 95]`.
3. Convertir a `uint8` (`0..255`) y codificar en PNG/WebP con `Pillow` (invertir eje vertical `origin="lower"` si se desea norte arriba según convención astronómica consistente con el WCS objetivo).

---

## 4. Agrupación por Detectores (`D1`–`D6`), Coadición y Falso Color RGB

SPHEREx cuenta con **6 conjuntos de detectores** que cubren de $0.75\,\mu\text{m}$ a $5.0\,\mu\text{m}$ (~17 bandas espectrales por detector, 102 bandas en total):
- `D1`–`D2`: Infrarrojo cercano corto (~0.75–1.6 µm)
- `D3`–`D4`: Infrarrojo cercano medio (~1.6–3.2 µm)
- `D5`–`D6`: Infrarrojo cercano largo (~3.2–5.0 µm — **clave para WISE 0855 y firmas de $\text{H}_2\text{O}/\text{CO}_2/\text{CO}$**)

### Modos de Detector en Backend
- **`all` (Cronológico):** Todas las exposiciones ordenadas por `MJD`.
- **`D1` .. `D6`:** Filtrar exposiciones del detector seleccionado (o coadicionar por época dentro de ese detector para elevar el SNR).
- **Coadición ponderada por detector:** Cuando hay múltiples bandas dentro de un mismo detector y época, combinar usando mediana o media ponderada por $1/\text{VARIANCE}$.
- **Falso Color RGB (`rgb`):** Asignar canales:
  - `R` = Coadd de `D5`/`D6` (ondas largas, objetos muy fríos como enanas marrones tipo Y)
  - `G` = Coadd de `D3`/`D4` (ondas medias)
  - `B` = Coadd de `D1`/`D2` (ondas cortas)

---

## 5. Extracción de Espectros al Vuelo ($0.75\text{–}5.0\,\mu\text{m}$)

Al recibir una petición a `/api/spectrum` en `(ra, dec)` (o coordenadas de píxel `(x, y)` convertidas con `target_wcs.pixel_to_world`):
1. Iterar sobre todas las exposiciones del parche (cubriendo las 102 bandas / detectores `D1`–`D6`).
2. Realizar **fotometría de apertura circular** sencilla (radio configurable, ej. `aperture_arcsec=12.0`, con sustracción de fondo local mediante anillo *annulus* o mediana del parche).
3. Calcular el flujo neto $F_\nu$ (o intensidad superficial) y su incertidumbre $\sigma_F$ (desde `VARIANCE` o desviación estándar del fondo).
4. Obtener la longitud de onda efectiva $\lambda_{\text{eff}}$ ($\mu\text{m}$) desde la cabecera (`WAVELENGTH`, `ENERGY_BOUNDS`, o WCS espectral del detector LVF).
5. Adjuntar si el punto espectral tiene algún bit de `FLAGS` activo en la apertura para que el frontend marque puntos contaminados.

---

## 6. Decodificación de Banderas de Calidad (`FLAGS`)

Para cada frame, resumir los bits activos en el centro/apertura y en el total del recorte:
- Extraer las definiciones de bits desde la cabecera del HDU `FLAGS` si están documentadas (`BIT*` / `FLAG*` keywords) o usar una tabla de mapeo estándar para:
  - `cosmic_ray` / `jump`
  - `saturated`
  - `hot_dead_pixel`
  - `persistence`
  - `stray_light` / `scattered_light`
  - `missing_data` (`NaN` / fuera de huella)
- Calcular `contamination_fraction` (porcentaje de píxeles marcados en la apertura/recorte) y un **semáforo simple**:
  - `ok` (< 2% píxeles marcados en apertura)
  - `warning` (2%–15% o persistencia/stray light)
  - `bad` (> 15% o saturación/rayo cósmico sobre el objetivo)

