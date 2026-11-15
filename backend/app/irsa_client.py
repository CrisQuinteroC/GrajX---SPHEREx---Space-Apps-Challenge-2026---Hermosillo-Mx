"""Cliente NASA/IPAC IRSA (TAP/SIAv2), normalización ICRS y gestión de caché local."""

from __future__ import annotations

import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import astropy.units as u
import httpx
import numpy as np
import pyvo
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.utils.data import conf as astropy_data_conf
from astroquery.ipac.irsa import Irsa

from .config import (
    CACHE_DIR,
    COLLECTION_TTL_SEC,
    DEFAULT_FOV_ARCMIN,
    DOWNLOAD_WORKERS,
    IRSA_BASE_URL,
    IRSA_TAP_URL,
    IRSA_TIMEOUT_SEC,
    MAX_TAP_RESULTS,
    ensure_directories,
)
from .models import DataSourceMode, EstimateResponse
from .presets import (
    ensure_preset_cached,
    find_matching_preset,
    generate_spherex_mef_sequence,
    get_preset_by_name_or_id,
)

logger = logging.getLogger(__name__)

_CACHE_LOCKS_GUARD = threading.Lock()
_CACHE_LOCKS: dict[str, threading.Lock] = {}


def _get_cache_lock(key: str) -> threading.Lock:
    with _CACHE_LOCKS_GUARD:
        if key not in _CACHE_LOCKS:
            _CACHE_LOCKS[key] = threading.Lock()
        return _CACHE_LOCKS[key]

_COLLECTION_CACHE: dict[str, Any] = {
    "timestamp": 0.0,
    "collections": ["spherex_dr1", "spherex"],
    "reachable": False,
}

_FLOAT_RE = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$")


def _normalize_sexagesimal_symbols(token: str) -> str:
    """Convierte símbolos unicode (° ' \") a notación Astropy (d m s)."""
    cleaned = token.strip()
    cleaned = cleaned.replace("°", "d").replace("′", "m").replace("'", "m")
    cleaned = cleaned.replace("″", "s").replace('"', "s")
    cleaned = re.sub(r"\s+", "", cleaned)
    return cleaned


def _split_combined_coords(raw: str) -> tuple[str, str] | None:
    """Separa una cadena con RA y Dec combinadas (coma o espacios)."""
    text = raw.strip()
    if "," in text:
        parts = [p.strip() for p in text.split(",", maxsplit=1)]
        if len(parts) == 2 and parts[0] and parts[1]:
            return parts[0], parts[1]

    # Buscar separación entre parte RA y signo o segunda coordenada
    # Ej: "08h55m10.831s -7d14m42.53s" o "17:57:48.50 +04:41:36.1" o "133.79513 -7.24515"
    tokens = text.split()
    if len(tokens) == 2:
        return tokens[0], tokens[1]
    if len(tokens) == 6:
        # Ej: "08 55 10.831 -07 14 42.53"
        return " ".join(tokens[:3]), " ".join(tokens[3:])

    # Soportar "08h 55m 10.831s -07d 14m 42.53s" (buscando el split donde aparece d/+/− después de s)
    match = re.match(r"^(.+?[sS])\s+([+-]?\d.+)$", text)
    if match:
        return match.group(1).strip(), match.group(2).strip()

    return None


def parse_coordinates(ra: str | float, dec: str | float | None = None) -> tuple[float, float]:
    """
    Normaliza cualquier formato de entrada (decimal, sexagesimal con h/d/m/s o :, o nombre preset)
    a grados decimales ICRS (ra_deg in [0, 360), dec_deg in [-90, 90]).
    """
    if isinstance(ra, (int, float)) and isinstance(dec, (int, float)):
        ra_val = float(ra)
        dec_val = float(dec)
        if not (np.isfinite(ra_val) and np.isfinite(dec_val)):
            raise ValueError("Invalid sky coordinates: NaN or Inf values are not allowed.")
        if not (0.0 <= ra_val < 360.0):
            raise ValueError(f"Invalid sky coordinates: RA ({ra_val}) must be in [0, 360) degrees.")
        if not (-90.0 <= dec_val <= 90.0):
            raise ValueError(f"Invalid sky coordinates: Dec ({dec_val}) must be in [-90, 90] degrees.")
        return ra_val, dec_val

    ra_raw = str(ra).strip()
    dec_raw = str(dec).strip() if dec is not None and str(dec).strip() != "" else None

    if not ra_raw:
        raise ValueError("Invalid sky coordinates: 'ra' parameter cannot be empty.")

    # 1. Verificar si es nombre/ID de uno de los 5 objetos benchmark
    if dec_raw is None:
        preset = get_preset_by_name_or_id(ra_raw)
        if preset is not None:
            return preset.ra_deg, preset.dec_deg

        combined = _split_combined_coords(ra_raw)
        if combined is not None:
            ra_raw, dec_raw = combined
        else:
            # Intentar resolución por nombre vía Sesame/SIMBAD con timeout corto
            try:
                old_timeout = astropy_data_conf.remote_timeout
                astropy_data_conf.remote_timeout = 3.0
                try:
                    coord = SkyCoord.from_name(ra_raw, frame="icrs")
                    return float(coord.ra.deg) % 360.0, float(coord.dec.deg)
                finally:
                    astropy_data_conf.remote_timeout = old_timeout
            except Exception as exc:
                raise ValueError(
                    f"Invalid sky coordinates: unable to parse '{ra_raw}' as coordinates or object name."
                ) from exc

    assert dec_raw is not None

    # 2. Ambos son números decimales directos
    if _FLOAT_RE.match(ra_raw) and _FLOAT_RE.match(dec_raw):
        ra_val = float(ra_raw)
        dec_val = float(dec_raw)
        if not (0.0 <= ra_val < 360.0):
            raise ValueError(f"Invalid sky coordinates: RA ({ra_val}) must be in [0, 360) degrees.")
        if not (-90.0 <= dec_val <= 90.0):
            raise ValueError(f"Invalid sky coordinates: Dec ({dec_val}) must be in [-90, 90] degrees.")
        coord = SkyCoord(ra=ra_val * u.deg, dec=dec_val * u.deg, frame="icrs")
        return float(coord.ra.deg) % 360.0, float(coord.dec.deg)

    # 3. Formato sexagesimal (h/d/m/s o HH:MM:SS +DD:MM:SS)
    ra_norm = _normalize_sexagesimal_symbols(ra_raw)
    dec_norm = _normalize_sexagesimal_symbols(dec_raw)
    try:
        # Si RA incluye 'd' explícito, usar grados; de lo contrario hourangle (convención astronómica estándar)
        ra_unit = u.deg if ("d" in ra_norm.lower() and "h" not in ra_norm.lower()) else u.hourangle
        coord = SkyCoord(ra_norm, dec_norm, unit=(ra_unit, u.deg), frame="icrs")
        ra_deg = float(coord.ra.deg) % 360.0
        dec_deg = float(coord.dec.deg)
        if not (-90.0 <= dec_deg <= 90.0):
            raise ValueError(f"Declination out of range: {dec_deg}")
        return ra_deg, dec_deg
    except Exception as exc:
        raise ValueError(
            f"Invalid sky coordinates: could not parse RA='{ra_raw}', Dec='{dec_raw}'."
        ) from exc


def format_icrs_sexagesimal(ra_deg: float, dec_deg: float) -> tuple[str, str]:
    """Formatea coordenadas ICRS decimales a cadenas legibles hms / dms."""
    coord = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs")
    ra_hms = coord.ra.to_string(unit=u.hourangle, sep=("h ", "m ", "s"), precision=3, pad=True)
    dec_dms = coord.dec.to_string(
        unit=u.deg, sep=("° ", "' ", "\""), precision=2, alwayssign=True, pad=True
    )
    return ra_hms, dec_dms


def _rank_spherex_collection(name: str) -> tuple[int, str]:
    """Prioriza liberaciones recientes (dr > qr > spherex general)."""
    low = name.lower()
    if "dr" in low:
        return (0, low)
    if "qr" in low:
        return (1, low)
    return (2, low)


def discover_spherex_collections(
    force_refresh: bool = False,
    timeout_sec: float = 3.5,
) -> tuple[list[str], bool]:
    """
    Descubre dinámicamente colecciones SPHEREx disponibles en IRSA SIAv2.
    Mantiene caché en memoria durante COLLECTION_TTL_SEC.
    """
    now = time.time()
    if not force_refresh and (now - _COLLECTION_CACHE["timestamp"]) < COLLECTION_TTL_SEC:
        return list(_COLLECTION_CACHE["collections"]), bool(_COLLECTION_CACHE["reachable"])

    def _fetch() -> list[str]:
        old_timeout = getattr(Irsa, "TIMEOUT", 60)
        Irsa.TIMEOUT = timeout_sec
        try:
            table = Irsa.list_collections(servicetype="SIA", filter="spherex")
            cols = [str(row["collection"]) for row in table] if table is not None else []
            return sorted(set(cols), key=_rank_spherex_collection)
        finally:
            Irsa.TIMEOUT = old_timeout

    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            fut = pool.submit(_fetch)
            cols = fut.result(timeout=timeout_sec + 0.5)
        if cols:
            _COLLECTION_CACHE["collections"] = cols
            _COLLECTION_CACHE["reachable"] = True
            _COLLECTION_CACHE["timestamp"] = now
            return cols, True
    except Exception as exc:
        logger.debug("IRSA collection discovery unavailable: %s", exc)

    _COLLECTION_CACHE["reachable"] = False
    _COLLECTION_CACHE["timestamp"] = now
    return list(_COLLECTION_CACHE["collections"]), False


def build_cache_key(ra_deg: float, dec_deg: float, fov_arcmin: float, collection: str = "spherex") -> str:
    """Genera clave determinista y segura para URLs y directorios de caché."""
    safe_coll = re.sub(r"[^a-zA-Z0-9_-]", "_", collection)
    return f"{ra_deg:.4f}_{dec_deg:.4f}_{fov_arcmin:.1f}_{safe_coll}"


def query_spherex_cutouts(
    ra_deg: float,
    dec_deg: float,
    fov_deg: float,
    max_results: int = MAX_TAP_RESULTS,
) -> list[dict[str, Any]]:
    """
    Consulta exposiciones SPHEREx en NASA/IPAC IRSA mediante TAP/ADQL y fallback SIAv2.
    Retorna lista ordenada cronológicamente de metadatos con `cutout_uri`.
    """
    # Validación numérica estricta antes de construir ADQL
    ra_f = float(ra_deg)
    dec_f = float(dec_deg)
    fov_f = float(fov_deg)
    if not (0.0 <= ra_f < 360.0 and -90.0 <= dec_f <= 90.0 and 0.0 < fov_f <= 1.0):
        raise ValueError("Invalid numeric bounds for IRSA TAP query.")

    query = f"""
    SELECT TOP {int(max_results)}
        '{IRSA_BASE_URL}/' || a.uri || '?center={ra_f:.6f},{dec_f:.6f}d&size={fov_f:.5f}' AS cutout_uri,
        p.planeid,
        p.time_bounds_lower,
        p.time_bounds_upper,
        p.energy_bandpassname,
        p.energy_bounds_lower,
        p.energy_bounds_upper
    FROM spherex.artifact a
    JOIN spherex.plane p ON a.planeid = p.planeid
    WHERE 1 = CONTAINS(POINT('ICRS', {ra_f:.6f}, {dec_f:.6f}), p.poly)
    ORDER BY p.time_bounds_lower ASC
    """

    try:
        def _run_tap() -> Any:
            service = pyvo.dal.TAPService(IRSA_TAP_URL)
            return service.search(query).to_table()

        with ThreadPoolExecutor(max_workers=1) as pool:
            table = pool.submit(_run_tap).result(timeout=IRSA_TIMEOUT_SEC)
        rows: list[dict[str, Any]] = []
        for row in table:
            rows.append(
                {
                    "cutout_uri": str(row["cutout_uri"]),
                    "planeid": str(row["planeid"]),
                    "mjd": float(row["time_bounds_lower"]),
                    "band_name": str(row["energy_bandpassname"]),
                }
            )
        return rows
    except Exception as tap_exc:
        logger.info("IRSA TAP query fallback to SIAv2: %s", tap_exc)

    # Fallback SIAv2 usando colecciones descubiertas dinámicamente
    collections, reachable = discover_spherex_collections()
    if not reachable:
        raise TimeoutError("IRSA query timed out or service is unreachable.")

    coord = SkyCoord(ra=ra_f * u.deg, dec=dec_f * u.deg, frame="icrs")
    for coll in collections:
        try:
            sia_table = Irsa.query_sia(pos=(coord, (fov_f / 2.0) * u.deg), collection=coll)
            if sia_table is not None and len(sia_table) > 0:
                rows = []
                for idx, row in enumerate(sia_table[:max_results]):
                    access_url = str(row.get("access_url", "")) if hasattr(row, "get") else str(row["access_url"])
                    if not access_url:
                        continue
                    sep = "&" if "?" in access_url else "?"
                    cutout_uri = f"{access_url}{sep}center={ra_f:.6f},{dec_f:.6f}d&size={fov_f:.5f}"
                    rows.append(
                        {
                            "cutout_uri": cutout_uri,
                            "planeid": str(row["obs_publisher_did"]) if "obs_publisher_did" in sia_table.colnames else f"spherex_sia_{idx}",
                            "mjd": float(row["t_min"]) if "t_min" in sia_table.colnames else 60810.0 + idx,
                            "band_name": str(row["obs_bandpass"]) if "obs_bandpass" in sia_table.colnames else "SPHEREx",
                        }
                    )
                if rows:
                    rows.sort(key=lambda r: r["mjd"])
                    return rows
        except Exception as sia_exc:
            logger.debug("SIA query failed for collection %s: %s", coll, sia_exc)

    raise TimeoutError("IRSA query timed out. Try a smaller FOV or retry.")


def _download_single_cutout(client: httpx.Client, item: dict[str, Any], out_path: Path) -> Path | None:
    """Descarga un cutout FITS y verifica que sea un archivo FITS válido."""
    try:
        resp = client.get(item["cutout_uri"], follow_redirects=True)
        resp.raise_for_status()
        out_path.write_bytes(resp.content)
        with fits.open(out_path) as hdul:
            if len(hdul) == 0:
                out_path.unlink(missing_ok=True)
                return None
        return out_path
    except Exception as exc:
        logger.debug("Failed downloading cutout %s: %s", item.get("cutout_uri"), exc)
        out_path.unlink(missing_ok=True)
        return None


def _download_cutouts_concurrently(rows: list[dict[str, Any]], dest_dir: Path) -> list[Path]:
    """Descarga cutouts en paralelo sin saturar el servidor IRSA."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    downloaded: list[tuple[int, Path]] = []
    with httpx.Client(timeout=IRSA_TIMEOUT_SEC) as client:
        with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as executor:
            futures = {}
            for idx, item in enumerate(rows):
                target = dest_dir / f"irsa_{idx:03d}.fits"
                futures[executor.submit(_download_single_cutout, client, item, target)] = idx
            for fut in as_completed(futures):
                idx = futures[fut]
                res = fut.result()
                if res is not None:
                    downloaded.append((idx, res))
    downloaded.sort(key=lambda pair: pair[0])
    return [p for _, p in downloaded]


def estimate_transfer(
    ra_deg: float,
    dec_deg: float,
    fov_arcmin: float = DEFAULT_FOV_ARCMIN,
) -> EstimateResponse:
    """Estima cantidad de cuadros, peso en MB y tiempo de transferencia para un FOV."""
    ensure_directories()
    collections, _ = discover_spherex_collections(force_refresh=False)
    active_coll = collections[0] if collections else "spherex"
    key = build_cache_key(ra_deg, dec_deg, fov_arcmin, active_coll)

    matched = find_matching_preset(ra_deg, dec_deg, tolerance_arcmin=3.0)
    is_preset_default = matched is not None and abs(fov_arcmin - matched.default_fov_arcmin) < 0.25
    local_dir = CACHE_DIR / key
    is_cached = is_preset_default or (local_dir.exists() and any(local_dir.glob("*.fits")))

    scale_factor = (fov_arcmin / 6.0) ** 2
    estimated_frames = 24
    estimated_size_mb = round(max(0.8, 3.6 * scale_factor), 2)
    estimated_seconds = 0.25 if is_cached else round(max(0.8, 1.4 + 2.1 * scale_factor), 2)

    return EstimateResponse(
        ra_deg=round(ra_deg, 6),
        dec_deg=round(dec_deg, 6),
        fov_arcmin=float(fov_arcmin),
        estimated_frames=estimated_frames,
        estimated_size_mb=estimated_size_mb,
        estimated_seconds=estimated_seconds,
        cached=bool(is_cached),
    )


def resolve_fits_cutouts(
    ra_deg: float,
    dec_deg: float,
    fov_arcmin: float = DEFAULT_FOV_ARCMIN,
    source: DataSourceMode = DataSourceMode.auto,
) -> tuple[list[Path], str, str]:
    """
    Resuelve la lista de cutouts FITS para (ra_deg, dec_deg, fov_arcmin).
    Retorna (rutas_fits, data_source, cache_key).
    """
    ensure_directories()
    collections, _ = discover_spherex_collections(force_refresh=False)
    active_coll = collections[0] if collections else "spherex"
    cache_key = build_cache_key(ra_deg, dec_deg, fov_arcmin, active_coll)
    cache_subdir = CACHE_DIR / cache_key

    matched_preset = find_matching_preset(ra_deg, dec_deg, tolerance_arcmin=3.0)
    matches_default_fov = (
        matched_preset is not None and abs(fov_arcmin - matched_preset.default_fov_arcmin) < 0.25
    )

    with _get_cache_lock(cache_key):
        if source == DataSourceMode.cache:
            if matches_default_fov and matched_preset is not None:
                return ensure_preset_cached(matched_preset.id), "preset_cache", cache_key
            cached_files = sorted(cache_subdir.glob("*.fits"))
            if len(cached_files) >= 24:
                return cached_files, "local_cache", cache_key
            if matched_preset is not None:
                paths = generate_spherex_mef_sequence(
                    target_id=matched_preset.id,
                    ra_deg=matched_preset.ra_deg,
                    dec_deg=matched_preset.dec_deg,
                    fov_arcmin=fov_arcmin,
                    output_dir=cache_subdir,
                )
                return paths, "preset_cache", cache_key
            raise FileNotFoundError(
                f"No cached SPHEREx exposures found at ({ra_deg:.4f}, {dec_deg:.4f}) within {fov_arcmin}' FOV."
            )

        if source == DataSourceMode.live:
            rows = query_spherex_cutouts(ra_deg, dec_deg, fov_arcmin / 60.0)
            if not rows:
                raise LookupError(
                    f"No SPHEREx exposures found at ({ra_deg:.4f}, {dec_deg:.4f}) within {fov_arcmin}' FOV."
                )
            paths = _download_cutouts_concurrently(rows, cache_subdir)
            if not paths:
                raise TimeoutError("IRSA query timed out while downloading FITS cutouts.")
            return paths, "irsa_live", cache_key

        # source == DataSourceMode.auto
        if matches_default_fov and matched_preset is not None:
            return ensure_preset_cached(matched_preset.id), "preset_cache", cache_key

        cached_files = sorted(cache_subdir.glob("*.fits"))
        if len(cached_files) >= 24:
            return cached_files, "local_cache", cache_key

        # Intentar consulta IRSA en vivo solo si IRSA está alcanzable
        try:
            _, reachable = discover_spherex_collections(force_refresh=False)
            if reachable:
                rows = query_spherex_cutouts(ra_deg, dec_deg, fov_arcmin / 60.0)
                if rows:
                    paths = _download_cutouts_concurrently(rows, cache_subdir)
                    if paths:
                        return paths, "irsa_live", cache_key
        except Exception as exc:
            logger.info("Falling back to local SPHEREx cutout generation: %s", exc)

        # Fallback determinista para demo sin conexión / fuera de footprint DR1
        target_id = matched_preset.id if matched_preset is not None else f"sky_{ra_deg:.3f}_{dec_deg:.3f}"
        target_ra = matched_preset.ra_deg if matched_preset is not None else ra_deg
        target_dec = matched_preset.dec_deg if matched_preset is not None else dec_deg
        paths = generate_spherex_mef_sequence(
            target_id=target_id,
            ra_deg=target_ra,
            dec_deg=target_dec,
            fov_arcmin=fov_arcmin,
            output_dir=cache_subdir,
        )
        return paths, "synthetic_fallback", cache_key
