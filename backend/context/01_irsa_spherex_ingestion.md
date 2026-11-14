# 01 — Ingesta de Datos SPHEREx desde NASA/IPAC IRSA

## 1. Normalización de Coordenadas (Entrada de Usuario -> ICRS)

El usuario puede ingresar coordenadas en múltiples formatos en la barra de búsqueda o en la URL:
- Grados decimales: `133.79513, -7.24515` o `ra=133.79513&dec=-7.24515`
- Sexagesimal con letras: `08h55m10.831s -7d14m42.53s`
- Sexagesimal con dos puntos: `17:57:48.50 +04:41:36.1`

### Regla de Implementación (`parse_coordinates`)
Convertir siempre a grados decimales en el marco **ICRS** usando `astropy.coordinates.SkyCoord`:
- Si `ra` y `dec` son numéricos flotantes válidos (`0 <= ra < 360`, `-90 <= dec <= 90`), construir `SkyCoord(ra=ra * u.deg, dec=dec * u.deg, frame="icrs")`.
- Si vienen como cadena sexagesimal o texto libre, usar `SkyCoord(ra_str, dec_str, unit=(u.hourangle, u.deg), frame="icrs")` (o `SkyCoord.from_name(query)` si el usuario ingresa el nombre de un objeto resuelto por Sesame/Simbad, con timeout controlado).
- Validar rangos antes de construir cualquier query ADQL/SIA para evitar inyección en cadenas SQL/ADQL.

---

## 2. Descubrimiento Dinámico de Colecciones SPHEREx

El enunciado advierte: *"¡Los nuevos datos de SPHEREx están llegando rápidamente! Asegúrese de diseñar una herramienta que sea fácil de actualizar con las últimas versiones de datos."*

**No hardcodear** una única versión de catálogo (ej. `spherex_qr3`) sin fallback dinámico:

```python
from astroquery.ipac.irsa import Irsa

def discover_spherex_collections() -> list[str]:
    table = Irsa.list_collections(servicetype="SIA", filter="spherex")
    # Retornar nombres ordenados priorizando releases más recientes (dr > qr > general)
    return [str(row["collection"]) for row in table]
```

También se puede inspeccionar `TAP_SCHEMA.tables` en `https://irsa.ipac.caltech.edu/TAP` para verificar los nombres de tablas vigentes (`spherex.plane`, `spherex.artifact`, etc.). Cachear el resultado de descubrimiento en memoria durante la vida del proceso (con TTL configurable, ej. 6 horas).

---

## 3. Consulta vía TAP / ADQL (Recomendada) vs. SIAv2

### Opción Principal: TAP / ADQL con `pyvo`
Permite filtrar, ordenar cronológicamente por `time_bounds_lower` y construir directamente las URLs de cutout:

```python
import pyvo

IRSA_TAP_URL = "https://irsa.ipac.caltech.edu/TAP"

def query_spherex_cutouts(ra_deg: float, dec_deg: float, fov_deg: float, max_results: int = 200):
    service = pyvo.dal.TAPService(IRSA_TAP_URL)
    query = f"""
    SELECT TOP {int(max_results)}
        'https://irsa.ipac.caltech.edu/' || a.uri || '?center={ra_deg},{dec_deg}d&size={fov_deg}' AS cutout_uri,
        p.planeid,
        p.time_bounds_lower,
        p.time_bounds_upper,
        p.energy_bandpassname,
        p.energy_bounds_lower,
        p.energy_bounds_upper
    FROM spherex.artifact a
    JOIN spherex.plane p ON a.planeid = p.planeid
    WHERE 1 = CONTAINS(POINT('ICRS', {ra_deg}, {dec_deg}), p.poly)
    ORDER BY p.time_bounds_lower ASC
    """
    return service.search(query).to_table()
```

### Opción Secundaria / Complementaria: `Irsa.query_sia`
Útil si el esquema TAP cambia o para descubrimiento rápido por colección:
```python
from astropy.coordinates import SkyCoord
import astropy.units as u
from astroquery.ipac.irsa import Irsa

coord = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs")
results = Irsa.query_sia(pos=(coord, (fov_deg / 2.0) * u.deg), collection=active_collection)
```

---

## 4. Cutouts Espaciales, Límites de FOV y Tiempos de Transferencia

- **Nunca descargar archivos MEF completos** en peticiones web (pueden pesar cientos de MB cada uno).
- Usar siempre el servicio de recorte de IRSA anexando `?center={ra},{dec}d&size={fov_deg}` a la URI del artefacto.
- **Rango de FOV recomendado:** `2'` (`0.0333°`) a `30'` (`0.5°`), con default `6'` (`0.1°`).
- **Estimación de tamaño y tiempo:** Exponer un helper `estimate_transfer(fov_arcmin, n_frames)` para que el frontend muestre al usuario el costo aproximado antes de pedir FOV grandes (`20'`–`30'`), cumpliendo la consideración del reto sobre transferencia vs. campo de visión.
- **Descarga concurrente controlada:** Usar `httpx.AsyncClient` o `ThreadPoolExecutor` con `max_workers=4..6` y timeout por archivo (ej. `15s`) para no saturar IRSA ni bloquear el event loop de FastAPI.

---

## 5. Estrategia de Caché en Disco y Fallback Offline (`data/`)

### Estructura de Almacenamiento Local
- `data/presets/<preset_id>/`: Cutouts FITS pre-descargados y manifiesto `metadata.json` para los **5 objetos obligatorios**:
  1. `barnards_star` (`269.45208`, `+4.69336`)
  2. `epsilon_indi_b` (`331.04390`, `-56.78194`)
  3. `wise_0855` (`133.79513`, `-7.24515`)
  4. `rw_aurigae` (`76.95608`, `+30.40133`)
  5. `r_draconis` (`248.16763`, `+66.75497`)
- `data/cache/`: Caché temporal de consultas IRSA en vivo (excluida de Git en `.gitignore`).

### Clave Determinista de Caché
Normalizar la clave para maximizar aciertos de caché sin mezclar parámetros distintos:
```text
key = f"{ra_deg:.4f}_{dec_deg:.4f}_{fov_arcmin:.1f}_{collection}"
```
- Flujo de resolución en `irsa_client.py`:
  1. Si la petición coincide con un preset (tolerancia angular pequeña y FOV estándar) y `prefer_cache=True` o IRSA falla/expira -> servir desde `data/presets/`.
  2. Si existe en `data/cache/<key>/` y no está expirado -> leer de disco.
  3. Si no -> consultar IRSA TAP/SIA, descargar cutouts FITS y guardar en `data/cache/<key>/`.

