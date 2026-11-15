"""Pipeline de lectura MEF FITS, reproyección WCS obligatoria, detectores D1–D6 y espectro."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
import threading

import astropy.units as u
import matplotlib
import numpy as np
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.time import Time
from astropy.visualization import (
    AsinhStretch,
    ImageNormalize,
    LinearStretch,
    PercentileInterval,
    ZScaleInterval,
)
from astropy.wcs import WCS
from reproject import reproject_interp

from .config import DEFAULT_PIXEL_SCALE_ARCSEC, DETECTOR_BANDS, FLAG_BIT_DEFINITIONS
from .models import QualityInfo, QualityStatus, SpectrumPoint, StretchMethod

_REPROJECT_CACHE: OrderedDict[tuple[str, int, int, tuple[str, ...]], list["ReprojectedExposure"]] = OrderedDict()
_REPROJECT_LOCK = threading.Lock()
_MAX_CACHE_ENTRIES = 12


@dataclass
class RawExposure:
    path: Path
    planeid: str
    image: np.ndarray
    variance: np.ndarray
    flags: np.ndarray
    wcs: WCS
    mjd: float
    obs_utc: str
    detector: str
    band_name: str
    wavelength_um: float
    exposure_sec: float
    flux_unit: str
    flag_definitions: dict[int, str] = field(default_factory=dict)


@dataclass
class ReprojectedExposure:
    planeid: str
    image: np.ndarray
    variance: np.ndarray
    flags: np.ndarray
    mjd: float
    obs_utc: str
    detector: str
    band_name: str
    wavelength_um: float
    exposure_sec: float
    flux_unit: str
    flag_definitions: dict[int, str] = field(default_factory=dict)


def _infer_detector_and_wavelength(header: fits.Header, path: Path) -> tuple[str, float]:
    """Determina detector (D1–D6) y longitud de onda efectiva (µm) desde la cabecera FITS."""
    det = str(header.get("DETECTOR", "")).strip().upper()
    band = str(header.get("BANDNAME", header.get("FILTER", ""))).strip().upper()
    if det not in DETECTOR_BANDS:
        for candidate in DETECTOR_BANDS:
            if candidate in band or candidate in path.name.upper():
                det = candidate
                break

    lam = None
    for key in ("WAVELENG", "WAVELENGTH", "EFFWAVE", "LAM_EFF", "WAVE_EFF"):
        val = header.get(key)
        if val is not None:
            try:
                lam = float(val)
                break
            except (TypeError, ValueError):
                pass

    if lam is None and "ENERGY_L" in header and "ENERGY_U" in header:
        try:
            lam = 0.5 * (float(header["ENERGY_L"]) + float(header["ENERGY_U"]))
        except (TypeError, ValueError):
            lam = None

    if det not in DETECTOR_BANDS:
        if lam is not None:
            for d_name, (lo, hi) in DETECTOR_BANDS.items():
                if lo <= lam <= hi + 0.05:
                    det = d_name
                    break
        if det not in DETECTOR_BANDS:
            det = "D1"

    if lam is None:
        lo, hi = DETECTOR_BANDS[det]
        lam = round(0.5 * (lo + hi), 3)

    return det, float(lam)


def _extract_flag_definitions(header: fits.Header) -> dict[int, str]:
    """Lee definiciones de bits desde cabeceras BIT* si existen, o usa mapa estándar."""
    defs = dict(FLAG_BIT_DEFINITIONS)
    for bit_idx in range(16):
        key = f"BIT{bit_idx}"
        if key in header:
            defs[bit_idx] = str(header[key]).strip().lower().replace(" ", "_")
    return defs


def read_spherex_mef(path: Path) -> RawExposure:
    """Lee un archivo Multi-Extension FITS (MEF) de SPHEREx con fallback por nombre/índice."""
    with fits.open(path) as hdul:
        primary_hdr = hdul[0].header

        # Localizar HDU IMAGE
        image_hdu = None
        for name in ("IMAGE", "SCI", "FLUX"):
            if name in hdul and hdul[name].data is not None:
                image_hdu = hdul[name]
                break
        if image_hdu is None:
            for hdu in hdul:
                if getattr(hdu, "data", None) is not None and np.ndim(hdu.data) >= 2:
                    image_hdu = hdu
                    break
        if image_hdu is None:
            raise ValueError(f"No 2D image HDU found in FITS file: {path}")

        img_data = np.asarray(image_hdu.data, dtype=np.float64)
        if img_data.ndim > 2:
            img_data = img_data[0]
        hdr = image_hdu.header

        # Construir WCS espacial 2D
        src_wcs = WCS(hdr, naxis=2)

        # Localizar HDU VARIANCE / ERR
        variance_data: np.ndarray | None = None
        if "VARIANCE" in hdul and hdul["VARIANCE"].data is not None:
            variance_data = np.asarray(hdul["VARIANCE"].data, dtype=np.float64)
        elif "ERR" in hdul and hdul["ERR"].data is not None:
            err = np.asarray(hdul["ERR"].data, dtype=np.float64)
            variance_data = err ** 2
        if variance_data is None:
            valid = img_data[np.isfinite(img_data)]
            mad = np.median(np.abs(valid - np.median(valid))) if valid.size else 0.05
            sigma = max(1.4826 * mad, 1e-4)
            variance_data = np.full_like(img_data, sigma ** 2, dtype=np.float64)
        elif variance_data.ndim > 2:
            variance_data = variance_data[0]

        # Localizar HDU FLAGS
        flag_defs = dict(FLAG_BIT_DEFINITIONS)
        if "FLAGS" in hdul and hdul["FLAGS"].data is not None:
            flags_hdu = hdul["FLAGS"]
            flags_data = np.asarray(flags_hdu.data, dtype=np.uint16)
            if flags_data.ndim > 2:
                flags_data = flags_data[0]
            flag_defs = _extract_flag_definitions(flags_hdu.header)
        else:
            flags_data = np.zeros(img_data.shape, dtype=np.uint16)

        detector, wavelength_um = _infer_detector_and_wavelength(hdr, path)
        mjd = float(hdr.get("MJD-OBS", primary_hdr.get("MJD-OBS", 60810.0)))
        obs_utc = str(hdr.get("DATE-OBS", primary_hdr.get("DATE-OBS", ""))).strip()
        if not obs_utc:
            obs_utc = Time(mjd, format="mjd", scale="utc").isot + "Z"
        elif not obs_utc.endswith("Z"):
            obs_utc = obs_utc + "Z"

        planeid = str(hdr.get("PLANEID", primary_hdr.get("PLANEID", path.stem))).strip()
        band_name = str(hdr.get("BANDNAME", f"SPHEREx-{detector}")).strip()
        exposure_sec = float(hdr.get("EXPTIME", primary_hdr.get("EXPTIME", 112.5)))
        flux_unit = str(hdr.get("BUNIT", primary_hdr.get("BUNIT", "MJy/sr"))).strip()

    return RawExposure(
        path=path,
        planeid=planeid,
        image=img_data,
        variance=variance_data,
        flags=flags_data,
        wcs=src_wcs,
        mjd=mjd,
        obs_utc=obs_utc,
        detector=detector,
        band_name=band_name,
        wavelength_um=wavelength_um,
        exposure_sec=exposure_sec,
        flux_unit=flux_unit,
        flag_definitions=flag_defs,
    )


def build_target_wcs(
    ra_deg: float,
    dec_deg: float,
    fov_arcmin: float,
    pixel_scale_arcsec: float = DEFAULT_PIXEL_SCALE_ARCSEC,
) -> tuple[WCS, tuple[int, int], float]:
    """
    Construye la rejilla WCS tangencial común (Norte arriba, Este izquierda)
    para alinear todas las épocas antes de apilar, restar o medir espectros.
    """
    raw_npix = int(round((fov_arcmin * 60.0) / pixel_scale_arcsec))
    if raw_npix > 160:
        # Escala controlada para FOVs grandes (10'-30') manteniendo respuesta web ágil
        n_pix = 160
        effective_scale_arcsec = (fov_arcmin * 60.0) / n_pix
    else:
        n_pix = max(32, raw_npix)
        effective_scale_arcsec = pixel_scale_arcsec

    scale_deg = effective_scale_arcsec / 3600.0
    w = WCS(naxis=2)
    w.wcs.crpix = [n_pix / 2.0 + 0.5, n_pix / 2.0 + 0.5]
    w.wcs.crval = [float(ra_deg), float(dec_deg)]
    w.wcs.cdelt = [-scale_deg, scale_deg]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.radesys = "ICRS"
    w.wcs.equinox = 2000.0
    return w, (n_pix, n_pix), float(round(effective_scale_arcsec, 4))


def reproject_exposure(
    raw_exp: RawExposure,
    target_wcs: WCS,
    shape_out: tuple[int, int],
) -> ReprojectedExposure:
    """Reproyecta IMAGE, VARIANCE y FLAGS (nearest-neighbor) al WCS objetivo común."""
    rep_image, footprint = reproject_interp(
        (raw_exp.image, raw_exp.wcs),
        target_wcs,
        shape_out=shape_out,
    )
    rep_var, _ = reproject_interp(
        (raw_exp.variance, raw_exp.wcs),
        target_wcs,
        shape_out=shape_out,
    )
    rep_flags_float, _ = reproject_interp(
        (raw_exp.flags.astype(np.float64), raw_exp.wcs),
        target_wcs,
        shape_out=shape_out,
        order="nearest-neighbor",
    )

    finite_flags = np.isfinite(rep_flags_float)
    rep_flags = np.full(shape_out, np.uint16(1 << 5), dtype=np.uint16)
    rep_flags[finite_flags] = np.rint(rep_flags_float[finite_flags]).astype(np.uint16)
    # Marcar píxeles fuera de huella como missing_data (bit 5)
    out_of_footprint = (~np.isfinite(rep_image)) | (footprint <= 0.0)
    rep_flags[out_of_footprint] |= np.uint16(1 << 5)

    return ReprojectedExposure(
        planeid=raw_exp.planeid,
        image=rep_image.astype(np.float64),
        variance=np.where(np.isfinite(rep_var) & (rep_var > 0), rep_var, np.nan),
        flags=rep_flags,
        mjd=raw_exp.mjd,
        obs_utc=raw_exp.obs_utc,
        detector=raw_exp.detector,
        band_name=raw_exp.band_name,
        wavelength_um=raw_exp.wavelength_um,
        exposure_sec=raw_exp.exposure_sec,
        flux_unit=raw_exp.flux_unit,
        flag_definitions=raw_exp.flag_definitions,
    )


def reproject_sequence(
    paths: list[Path],
    target_wcs: WCS,
    shape_out: tuple[int, int],
    cache_key: str = "",
) -> list[ReprojectedExposure]:
    """Lee y reproyecta todos los FITS ordenados cronológicamente por MJD (con caché LRU)."""
    mem_key = (cache_key, shape_out[0], shape_out[1], tuple(p.name for p in paths))
    if cache_key:
        with _REPROJECT_LOCK:
            if mem_key in _REPROJECT_CACHE:
                _REPROJECT_CACHE.move_to_end(mem_key)
                return _REPROJECT_CACHE[mem_key]

    reprojected: list[ReprojectedExposure] = []
    for path in paths:
        raw_exp = read_spherex_mef(path)
        reprojected.append(reproject_exposure(raw_exp, target_wcs, shape_out))
    reprojected.sort(key=lambda e: (e.mjd, e.wavelength_um))

    if cache_key:
        with _REPROJECT_LOCK:
            _REPROJECT_CACHE[mem_key] = reprojected
            while len(_REPROJECT_CACHE) > _MAX_CACHE_ENTRIES:
                _REPROJECT_CACHE.popitem(last=False)

    return reprojected


def decode_quality_flags(
    flags_2d: np.ndarray,
    image_2d: np.ndarray,
    flag_definitions: dict[int, str] | None = None,
) -> QualityInfo:
    """Decodifica el bitmask FLAGS y calcula fracción de contaminación y semáforo."""
    defs = flag_definitions or FLAG_BIT_DEFINITIONS
    h, w = flags_2d.shape
    total_px = max(h * w, 1)

    # Máscara de bits activos (excluyendo esquinas fuera de huella si es menor al 25%)
    active_flags: list[str] = []
    combined_mask = np.zeros_like(flags_2d, dtype=bool)

    for bit_idx, flag_name in sorted(defs.items()):
        bit_mask = (flags_2d & np.uint16(1 << bit_idx)) != 0
        if np.any(bit_mask):
            # Evitar reportar missing_data solo por un borde mínimo de reproyección
            frac_bit = float(np.sum(bit_mask)) / total_px
            if flag_name == "missing_data" and frac_bit < 0.03 and np.isfinite(image_2d).mean() > 0.95:
                continue
            active_flags.append(flag_name)
            combined_mask |= bit_mask

    contamination = float(np.sum(combined_mask)) / total_px

    # Verificar apertura central sobre el objeto objetivo (radio 10% del ancho)
    cy, cx = h // 2, w // 2
    r_center = max(3, min(h, w) // 10)
    yy, xx = np.ogrid[:h, :w]
    center_mask = (yy - cy) ** 2 + (xx - cx) ** 2 <= r_center ** 2
    center_flags = flags_2d[center_mask]
    center_cosmic_or_sat = bool(np.any((center_flags & np.uint16((1 << 0) | (1 << 1))) != 0))

    if contamination > 0.15 or center_cosmic_or_sat:
        status = QualityStatus.bad
    elif contamination >= 0.02 or "persistence" in active_flags or "stray_light" in active_flags:
        status = QualityStatus.warning
    else:
        status = QualityStatus.ok

    return QualityInfo(
        status=status,
        contamination_fraction=round(contamination, 4),
        active_flags=active_flags,
    )


def normalize_to_uint8(
    data_2d: np.ndarray,
    stretch: StretchMethod = StretchMethod.asinh,
    flip_north_up: bool = True,
) -> np.ndarray:
    """
    Aplica estiramiento no lineal astronómico manejando NaN/Inf y convierte a uint8 (0..255).
    Invierte el eje vertical (origin='lower') para mantener Norte arriba en PNG/GIF.
    """
    finite_mask = np.isfinite(data_2d)
    fill_val = float(np.nanmedian(data_2d)) if np.any(finite_mask) else 0.0
    clean = np.nan_to_num(data_2d, nan=fill_val, posinf=fill_val, neginf=fill_val)

    if np.all(clean == clean.flat[0]):
        out = np.zeros(clean.shape, dtype=np.uint8)
        return np.flipud(out) if flip_north_up else out

    if stretch == StretchMethod.percentile:
        vmin, vmax = np.percentile(clean, [5.0, 95.0])
        if vmax <= vmin:
            vmin, vmax = float(np.min(clean)), float(np.max(clean))
        norm = np.clip((clean - vmin) / max(vmax - vmin, 1e-12), 0.0, 1.0)
    elif stretch == StretchMethod.zscale:
        interval = ZScaleInterval()
        vmin, vmax = interval.get_limits(clean)
        if vmax <= vmin:
            vmin, vmax = np.percentile(clean, [1.0, 99.5])
        norm = ImageNormalize(clean, vmin=vmin, vmax=vmax, stretch=LinearStretch(), clip=True)(clean)
    else:  # StretchMethod.asinh
        try:
            vmin, vmax = ZScaleInterval().get_limits(clean)
            if vmax <= vmin:
                raise ValueError("Degenerate ZScale interval")
        except Exception:
            vmin, vmax = PercentileInterval(99.5).get_limits(clean)
        if vmax <= vmin:
            vmin, vmax = float(np.min(clean)), float(np.max(clean)) + 1e-6
        norm = ImageNormalize(clean, vmin=vmin, vmax=vmax, stretch=AsinhStretch(a=0.1), clip=True)(clean)

    uint8_img = np.clip(np.asarray(norm) * 255.0, 0.0, 255.0).astype(np.uint8)
    return np.flipud(uint8_img) if flip_north_up else uint8_img


_DETECTOR_PALETTES: dict[str, tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]] = {
    "D1": ((3, 7, 22), (37, 150, 255), (230, 248, 255)),      # Azul eléctrico (0.75-1.11 um)
    "D2": ((3, 14, 22), (20, 184, 166), (225, 255, 250)),     # Cian turquesa (1.11-1.64 um)
    "D3": ((3, 18, 12), (34, 197, 94), (236, 253, 245)),      # Verde esmeralda (1.64-2.42 um)
    "D4": ((20, 12, 3), (245, 158, 11), (254, 249, 215)),     # Ámbar dorado (2.42-3.82 um)
    "D5": ((24, 8, 4), (249, 115, 22), (255, 240, 220)),      # Naranja térmico (3.82-4.42 um)
    "D6": ((22, 4, 14), (236, 72, 153), (255, 232, 245)),     # Magenta infrarrojo (4.42-5.00 um)
    "DEFAULT": ((6, 9, 22), (139, 92, 246), (254, 243, 199)), # Gradiente IR cósmico general
}


def colorize_detector_uint8(gray_u8: np.ndarray, detector: str) -> np.ndarray:
    """Convierte una imagen 2D uint8 a falso color RGB específico de cada detector SPHEREx."""
    key = detector.strip().upper() if detector else "DEFAULT"
    low, mid, high = _DETECTOR_PALETTES.get(key, _DETECTOR_PALETTES["DEFAULT"])

    raw_f = gray_u8.astype(np.float32)
    sky_floor = float(np.percentile(raw_f, 52.0)) if raw_f.size else 0.0
    span = max(255.0 - sky_floor, 16.0)
    t = np.clip((raw_f - sky_floor) / span, 0.0, 1.0)
    t = np.power(t, 0.92)
    rgb = np.zeros((*gray_u8.shape, 3), dtype=np.float32)

    low_mask = t < 0.52
    u_low = t / 0.52
    u_high = (t - 0.52) / 0.48

    for c_idx in range(3):
        c_low_seg = low[c_idx] + (mid[c_idx] - low[c_idx]) * u_low
        c_high_seg = mid[c_idx] + (high[c_idx] - mid[c_idx]) * u_high
        rgb[..., c_idx] = np.where(low_mask, c_low_seg, c_high_seg)

    return np.clip(rgb, 0.0, 255.0).astype(np.uint8)


def render_diff_divergent_rgb(
    diff_2d: np.ndarray,
    vlim: float | None = None,
    flip_north_up: bool = True,
) -> np.ndarray:
    """
    Renderiza un mapa de diferencias centrado en 0 usando paleta divergente RdBu_r:
    azul = negativo (salió/disminuyó brillo), rojo = positivo (entró/aumentó brillo).
    """
    clean = np.nan_to_num(diff_2d, nan=0.0, posinf=0.0, neginf=0.0)
    if vlim is None or vlim <= 0:
        abs_vals = np.abs(clean)
        vlim = float(np.percentile(abs_vals, 99.2)) if abs_vals.size else 1.0
        if vlim <= 1e-9:
            vlim = max(float(np.max(abs_vals)), 1e-6)

    scaled = np.clip((clean + vlim) / (2.0 * vlim), 0.0, 1.0)
    cmap = matplotlib.colormaps["RdBu_r"]
    rgba = cmap(scaled)
    rgb_uint8 = np.clip(rgba[..., :3] * 255.0, 0.0, 255.0).astype(np.uint8)
    return np.flipud(rgb_uint8) if flip_north_up else rgb_uint8


def weighted_coadd(exposures: list[ReprojectedExposure]) -> ReprojectedExposure:
    """Combina múltiples exposiciones mediante media ponderada por 1/VARIANCE."""
    if len(exposures) == 1:
        return exposures[0]

    stack_img = np.stack([e.image for e in exposures], axis=0)
    stack_var = np.stack([e.variance for e in exposures], axis=0)

    weights = np.where(np.isfinite(stack_img) & np.isfinite(stack_var) & (stack_var > 0), 1.0 / stack_var, 0.0)
    w_sum = np.sum(weights, axis=0)
    coadd_img = np.where(w_sum > 0, np.sum(np.nan_to_num(stack_img) * weights, axis=0) / np.maximum(w_sum, 1e-12), np.nan)
    coadd_var = np.where(w_sum > 0, 1.0 / np.maximum(w_sum, 1e-12), np.nan)

    combined_flags = np.bitwise_or.reduce([e.flags for e in exposures])
    # Limpiar missing_data donde al menos una exposición tuvo cobertura válida
    combined_flags = np.where(w_sum > 0, combined_flags & ~np.uint16(1 << 5), combined_flags | np.uint16(1 << 5))

    ref = exposures[0]
    mean_mjd = float(np.mean([e.mjd for e in exposures]))
    mean_lam = float(np.mean([e.wavelength_um for e in exposures]))
    obs_utc = Time(mean_mjd, format="mjd", scale="utc").isot + "Z"

    return ReprojectedExposure(
        planeid=f"coadd_{ref.detector}_{len(exposures)}f",
        image=coadd_img,
        variance=coadd_var,
        flags=combined_flags,
        mjd=mean_mjd,
        obs_utc=obs_utc,
        detector=ref.detector,
        band_name=f"Coadd-{ref.detector}",
        wavelength_um=round(mean_lam, 3),
        exposure_sec=float(sum(e.exposure_sec for e in exposures)),
        flux_unit=ref.flux_unit,
        flag_definitions=ref.flag_definitions,
    )


def filter_exposures_by_detector(
    exposures: list[ReprojectedExposure],
    detector: str,
) -> list[ReprojectedExposure]:
    """
    Filtra exposiciones para el detector solicitado (all o D1–D6).
    Si hay múltiples bandas dentro del mismo detector y época, las coadiciona por época.
    """
    if detector == "all":
        return sorted(exposures, key=lambda e: (e.mjd, e.wavelength_um))

    filtered = [e for e in exposures if e.detector == detector]
    if not filtered:
        return []

    # Agrupar por época (exposiciones separadas por < 1 día)
    filtered.sort(key=lambda e: e.mjd)
    epoch_groups: list[list[ReprojectedExposure]] = []
    for exp in filtered:
        if not epoch_groups or abs(exp.mjd - epoch_groups[-1][0].mjd) > 1.0:
            epoch_groups.append([exp])
        else:
            epoch_groups[-1].append(exp)

    return [weighted_coadd(group) for group in epoch_groups]


def build_false_color_rgb_frames(
    exposures: list[ReprojectedExposure],
    stretch: StretchMethod = StretchMethod.asinh,
) -> list[tuple[np.ndarray, ReprojectedExposure]]:
    """
    Construye frames en falso color RGB por época usando los 6 detectores de SPHEREx:
    R = coadd(D5, D6) [3.2–5.0 µm], G = coadd(D3, D4) [1.6–3.2 µm], B = coadd(D1, D2) [0.75–1.6 µm].
    """
    ordered = sorted(exposures, key=lambda e: e.mjd)
    epoch_groups: list[list[ReprojectedExposure]] = []
    for exp in ordered:
        if not epoch_groups or abs(exp.mjd - epoch_groups[-1][0].mjd) > 1.0:
            epoch_groups.append([exp])
        else:
            epoch_groups[-1].append(exp)

    rgb_frames: list[tuple[np.ndarray, ReprojectedExposure]] = []
    for group in epoch_groups:
        r_exps = [e for e in group if e.detector in ("D5", "D6")] or group
        g_exps = [e for e in group if e.detector in ("D3", "D4")] or group
        b_exps = [e for e in group if e.detector in ("D1", "D2")] or group

        r_coadd = weighted_coadd(r_exps)
        g_coadd = weighted_coadd(g_exps)
        b_coadd = weighted_coadd(b_exps)

        r_u8 = normalize_to_uint8(r_coadd.image, stretch=stretch, flip_north_up=True)
        g_u8 = normalize_to_uint8(g_coadd.image, stretch=stretch, flip_north_up=True)
        b_u8 = normalize_to_uint8(b_coadd.image, stretch=stretch, flip_north_up=True)

        def _dark_sky_channel(u8: np.ndarray) -> np.ndarray:
            arr_f = u8.astype(np.float32)
            floor = float(np.percentile(arr_f, 52.0)) if arr_f.size else 0.0
            norm_ch = np.clip((arr_f - floor) / max(255.0 - floor, 16.0), 0.0, 1.0)
            return np.power(norm_ch, 0.92)

        r_base = _dark_sky_channel(r_u8)
        g_base = _dark_sky_channel(g_u8)
        b_base = _dark_sky_channel(b_u8)

        def _bg_sub(arr: np.ndarray) -> np.ndarray:
            clean = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)
            med = float(np.median(clean)) if clean.size else 0.0
            return np.flipud(np.maximum(0.0, clean - med))

        r_sig = _bg_sub(r_coadd.image)
        g_sig = _bg_sub(g_coadd.image)
        b_sig = _bg_sub(b_coadd.image)

        lum = np.maximum(np.maximum(r_base, g_base), b_base)
        sig_sum = r_sig + g_sig + b_sig + 1e-6
        w_r = np.clip((r_sig / sig_sum) * 2.3, 0.05, 1.4)
        w_g = np.clip((g_sig / sig_sum) * 2.3, 0.05, 1.4)
        w_b = np.clip((b_sig / sig_sum) * 2.3, 0.05, 1.4)

        r_f = 0.02 + 0.40 * r_base + 0.58 * lum * w_r
        g_f = 0.025 + 0.40 * g_base + 0.58 * lum * w_g
        b_f = 0.045 + 0.40 * b_base + 0.58 * lum * w_b
        rgb = np.clip(np.stack([r_f, g_f, b_f], axis=-1) * 255.0, 0.0, 255.0).astype(np.uint8)

        meta = weighted_coadd(group)
        meta.detector = "RGB(D56/D34/D12)"
        meta.band_name = "SPHEREx-RGB-FalseColor"
        rgb_frames.append((rgb, meta))

    return rgb_frames


def extract_spectrum(
    exposures: list[ReprojectedExposure],
    target_wcs: WCS,
    target_ra_deg: float,
    target_dec_deg: float,
    aperture_arcsec: float = 12.0,
    pixel_scale_arcsec: float = DEFAULT_PIXEL_SCALE_ARCSEC,
) -> list[SpectrumPoint]:
    """
    Extrae el espectro NIR (0.75–5.0 µm) realizando fotometría de apertura circular
    con sustracción de fondo local (annulus) sobre todas las exposiciones reproyectadas.
    """
    coord = SkyCoord(ra=target_ra_deg * u.deg, dec=target_dec_deg * u.deg, frame="icrs")
    cx, cy = target_wcs.world_to_pixel(coord)
    cx_f, cy_f = float(cx), float(cy)

    h, w = exposures[0].image.shape if exposures else (0, 0)
    if not (0 <= cx_f < w and 0 <= cy_f < h):
        raise ValueError(
            f"Target coordinate ({target_ra_deg:.5f}, {target_dec_deg:.5f}) falls outside the current FOV."
        )

    r_ap = max(1.5, aperture_arcsec / pixel_scale_arcsec)
    r_in = max(r_ap + 2.0, r_ap * 1.6)
    r_out = max(r_in + 3.0, r_ap * 2.8)

    yy, xx = np.ogrid[:h, :w]
    dist2 = (xx - cx_f) ** 2 + (yy - cy_f) ** 2
    ap_mask = dist2 <= r_ap ** 2
    ann_mask = (dist2 >= r_in ** 2) & (dist2 <= r_out ** 2)

    points: list[SpectrumPoint] = []
    for exp in exposures:
        ap_vals = exp.image[ap_mask]
        valid_ap = ap_vals[np.isfinite(ap_vals)]
        if valid_ap.size == 0:
            continue

        ann_vals = exp.image[ann_mask]
        valid_ann = ann_vals[np.isfinite(ann_vals)]
        bg_med = float(np.median(valid_ann)) if valid_ann.size > 0 else float(np.nanmedian(exp.image))
        bg_mad = (
            float(np.median(np.abs(valid_ann - bg_med))) * 1.4826
            if valid_ann.size > 3
            else 0.05
        )

        net_flux = float(np.mean(valid_ap - bg_med))
        ap_var = exp.variance[ap_mask]
        valid_var = ap_var[np.isfinite(ap_var)]
        if valid_var.size > 0:
            flux_err = float(np.sqrt(np.sum(valid_var)) / max(valid_var.size, 1))
        else:
            flux_err = float(bg_mad / np.sqrt(max(valid_ap.size, 1)))

        # Verificar FLAGS críticos dentro de la apertura (ignorando missing_data si hubo datos válidos)
        ap_flags = exp.flags[ap_mask]
        flagged = bool(np.any((ap_flags & np.uint16(0b011111)) != 0))

        points.append(
            SpectrumPoint(
                wavelength_um=round(exp.wavelength_um, 4),
                flux=round(net_flux, 5),
                flux_err=round(max(flux_err, 1e-5), 5),
                detector=exp.detector,
                mjd=round(exp.mjd, 4),
                flagged=flagged,
            )
        )

    points.sort(key=lambda p: (p.wavelength_um, p.mjd))
    return points

