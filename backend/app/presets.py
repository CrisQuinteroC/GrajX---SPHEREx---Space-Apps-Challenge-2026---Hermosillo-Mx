"""Catálogo de los 5 objetos de prueba obligatorios y generador de cutouts MEF SPHEREx."""

from __future__ import annotations

import hashlib
from pathlib import Path

import astropy.units as u
import numpy as np
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.time import Time
from astropy.wcs import WCS

from .config import DEFAULT_PIXEL_SCALE_ARCSEC, DETECTOR_BANDS, PRESETS_DIR
from .models import DetectorFilter, PresetTarget, ViewMode

# Catálogo oficial de los 5 objetivos benchmark del reto
PRESET_TARGETS: dict[str, PresetTarget] = {
    "barnards_star": PresetTarget(
        id="barnards_star",
        name="Barnard's Star",
        astrophysical_type="Enana roja cercana (GJ 699, ~5.96 a.l.)",
        ra_deg=269.45208,
        dec_deg=4.69336,
        ra_hms="17h 57m 48.50s",
        dec_dms="+04° 41' 36.1\"",
        default_fov_arcmin=6.0,
        phenomenon="Movimiento propio más rápido conocido (10.3\"/año) + paralaje",
        recommended_mode=ViewMode.rgb,
        recommended_detector=DetectorFilter.all,
    ),
    "epsilon_indi_b": PresetTarget(
        id="epsilon_indi_b",
        name="Epsilon Indi B",
        astrophysical_type="Sistema binario de enanas marrones (T1 + T6, ~11.9 a.l.)",
        ra_deg=331.04390,
        dec_deg=-56.78194,
        ra_hms="22h 04m 10.5s",
        dec_dms="-56° 46' 55\"",
        default_fov_arcmin=6.0,
        phenomenon="Alto movimiento propio (4.7\"/año) + movimiento orbital del par binario",
        recommended_mode=ViewMode.rgb,
        recommended_detector=DetectorFilter.D4,
    ),
    "wise_0855": PresetTarget(
        id="wise_0855",
        name="WISE 0855",
        astrophysical_type="Enana marrón fría tipo Y (~7.27 a.l., ~250 K)",
        ra_deg=133.79513,
        dec_deg=-7.24515,
        ra_hms="08h 55m 10.831s",
        dec_dms="-07° 14' 42.53\"",
        default_fov_arcmin=6.0,
        phenomenon="Movimiento rápido (8.1\"/año) y emisión extrema solo en infrarrojo (3.5–5.0 µm)",
        recommended_mode=ViewMode.rgb,
        recommended_detector=DetectorFilter.D5,
    ),
    "rw_aurigae": PresetTarget(
        id="rw_aurigae",
        name="RW Aurigae",
        astrophysical_type="Estrella joven variable tipo T Tauri",
        ra_deg=76.95608,
        dec_deg=30.40133,
        ra_hms="05h 07m 49.46s",
        dec_dms="+30° 24' 04.8\"",
        default_fov_arcmin=6.0,
        phenomenon="Variabilidad fotométrica abrupta (oscurecimiento por polvo circumestelar)",
        recommended_mode=ViewMode.rgb,
        recommended_detector=DetectorFilter.all,
    ),
    "r_draconis": PresetTarget(
        id="r_draconis",
        name="R Draconis",
        astrophysical_type="Estrella gigante roja variable tipo Mira",
        ra_deg=248.16763,
        dec_deg=66.75497,
        ra_hms="16h 32m 40.23s",
        dec_dms="+66° 45' 17.9\"",
        default_fov_arcmin=6.0,
        phenomenon="Pulsación periódica de gran amplitud (~245 días, cambio de brillo + espectro)",
        recommended_mode=ViewMode.rgb,
        recommended_detector=DetectorFilter.all,
    ),
}

# Alias comunes para resolución por nombre en el buscador
PRESET_ALIASES: dict[str, str] = {
    "barnard": "barnards_star",
    "barnard's star": "barnards_star",
    "barnards star": "barnards_star",
    "barnards_star": "barnards_star",
    "gj 699": "barnards_star",
    "gj699": "barnards_star",
    "epsilon indi": "epsilon_indi_b",
    "epsilon indi b": "epsilon_indi_b",
    "eps indi b": "epsilon_indi_b",
    "epsilon_indi_b": "epsilon_indi_b",
    "wise 0855": "wise_0855",
    "wise0855": "wise_0855",
    "wise 0855-0714": "wise_0855",
    "wise_0855": "wise_0855",
    "rw aur": "rw_aurigae",
    "rw aurigae": "rw_aurigae",
    "rw_aurigae": "rw_aurigae",
    "r dra": "r_draconis",
    "r draconis": "r_draconis",
    "r_draconis": "r_draconis",
}


def list_presets() -> list[PresetTarget]:
    """Retorna la lista ordenada de los 5 objetivos benchmark."""
    return list(PRESET_TARGETS.values())


def get_preset_by_name_or_id(query: str) -> PresetTarget | None:
    """Resuelve un preset por su ID, nombre completo o alias común."""
    normalized = " ".join(query.strip().lower().split())
    if normalized in PRESET_TARGETS:
        return PRESET_TARGETS[normalized]
    preset_id = PRESET_ALIASES.get(normalized)
    if preset_id:
        return PRESET_TARGETS[preset_id]
    return None


def find_matching_preset(
    ra_deg: float,
    dec_deg: float,
    tolerance_arcmin: float = 5.0,
) -> PresetTarget | None:
    """Busca si la coordenada ICRS coincide con alguno de los 5 presets."""
    query_coord = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs")
    best_preset: PresetTarget | None = None
    best_sep = tolerance_arcmin * u.arcmin
    for preset in PRESET_TARGETS.values():
        p_coord = SkyCoord(ra=preset.ra_deg * u.deg, dec=preset.dec_deg * u.deg, frame="icrs")
        sep = query_coord.separation(p_coord)
        if sep <= best_sep:
            best_sep = sep
            best_preset = preset
    return best_preset


def _build_rotated_wcs(
    ra_deg: float,
    dec_deg: float,
    n_pix: int,
    pixel_scale_arcsec: float,
    roll_deg: float,
    dither_ra_arcsec: float,
    dither_dec_arcsec: float,
) -> WCS:
    """Construye un WCS tangencial rotado para simular distintas épocas orbitales de SPHEREx."""
    w = WCS(naxis=2)
    scale_deg = pixel_scale_arcsec / 3600.0
    cos_dec = max(np.cos(np.deg2rad(dec_deg)), 0.1)
    w.wcs.crpix = [n_pix / 2.0 + 0.5, n_pix / 2.0 + 0.5]
    w.wcs.crval = [
        (ra_deg + (dither_ra_arcsec / 3600.0) / cos_dec) % 360.0,
        np.clip(dec_deg + dither_dec_arcsec / 3600.0, -89.99, 89.99),
    ]
    w.wcs.cdelt = [-scale_deg, scale_deg]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    theta = np.deg2rad(roll_deg)
    c, s = np.cos(theta), np.sin(theta)
    w.wcs.pc = [[c, -s], [s, c]]
    w.wcs.radesys = "ICRS"
    w.wcs.equinox = 2000.0
    return w


def _add_gaussian_psf(
    image: np.ndarray,
    x0: float,
    y0: float,
    flux: float,
    sigma_px: float = 1.35,
) -> None:
    """Añade una fuente puntual Gaussiana 2D en coordenadas de píxel."""
    h, w = image.shape
    radius = int(np.ceil(sigma_px * 5.0))
    x_min = max(0, int(np.floor(x0)) - radius)
    x_max = min(w, int(np.ceil(x0)) + radius + 1)
    y_min = max(0, int(np.floor(y0)) - radius)
    y_max = min(h, int(np.ceil(y0)) + radius + 1)
    if x_min >= x_max or y_min >= y_max:
        return
    yy, xx = np.mgrid[y_min:y_max, x_min:x_max]
    psf = np.exp(-((xx - x0) ** 2 + (yy - y0) ** 2) / (2.0 * sigma_px ** 2))
    psf_norm = psf / (2.0 * np.pi * sigma_px ** 2)
    image[y_min:y_max, x_min:x_max] += flux * psf_norm * (2.0 * np.pi * sigma_px ** 2)


def _target_spectral_factor(target_id: str, wavelength_um: float, epoch_idx: int) -> float:
    """Calcula el factor espectral realista (0.75–5.0 µm) por objeto y época."""
    if target_id == "wise_0855":
        # Enana marrón ultrafría (~250 K): casi invisible < 1.8 µm, pico fuerte ~4.5 µm,
        # con bandas de absorción de H2O (2.7 µm) y CH4 (3.3 µm) y CO (4.7 µm)
        if wavelength_um < 1.6:
            return 0.015
        thermal = 1.8 * np.exp(-((wavelength_um - 4.45) ** 2) / (2.0 * 0.65 ** 2))
        h2o_abs = 1.0 - 0.55 * np.exp(-((wavelength_um - 2.75) ** 2) / (2.0 * 0.22 ** 2))
        ch4_abs = 1.0 - 0.45 * np.exp(-((wavelength_um - 3.35) ** 2) / (2.0 * 0.18 ** 2))
        return max(0.02, thermal * h2o_abs * ch4_abs)

    if target_id == "epsilon_indi_b":
        # Enana marrón T1+T6: brillante en 1.1–2.2 µm y 3.8–4.8 µm, absorción CH4/H2O
        cont = 0.8 + 0.5 * np.exp(-((wavelength_um - 1.65) ** 2) / (2.0 * 0.7 ** 2))
        cont += 0.65 * np.exp(-((wavelength_um - 4.2) ** 2) / (2.0 * 0.5 ** 2))
        abs_band = 1.0 - 0.5 * np.exp(-((wavelength_um - 3.25) ** 2) / (2.0 * 0.35 ** 2))
        return max(0.15, cont * abs_band)

    if target_id == "barnards_star":
        # Enana roja M4V: cuerpo negro ~3100 K decreciente en NIR con leve banda H2O ~1.9 µm
        bb = 2.6 * (1.2 / max(wavelength_um, 0.7)) ** 1.15
        h2o = 1.0 - 0.18 * np.exp(-((wavelength_um - 1.92) ** 2) / (2.0 * 0.18 ** 2))
        return max(0.25, bb * h2o)

    if target_id == "rw_aurigae":
        # T Tauri: exceso infrarrojo por disco de polvo + oscurecimiento abrupto en épocas 1 y 2
        epoch_dimming = [1.0, 0.24, 0.32, 1.12][epoch_idx % 4]
        disk_ir = 1.4 + 0.35 * (wavelength_um - 1.0)
        silicate = 1.0 + 0.25 * np.exp(-((wavelength_um - 2.2) ** 2) / (2.0 * 0.25 ** 2))
        return max(0.12, epoch_dimming * disk_ir * silicate)

    if target_id == "r_draconis":
        # Gigante roja Mira: pulsación de gran amplitud + bandas profundas de H2O y CO (2.3, 4.6 µm)
        epoch_pulse = [1.45, 0.42, 1.38, 0.65][epoch_idx % 4]
        sed = 1.6 * (1.8 / max(wavelength_um, 0.8)) ** 0.7
        h2o = 1.0 - 0.32 * np.exp(-((wavelength_um - 1.95) ** 2) / (2.0 * 0.22 ** 2))
        co = 1.0 - 0.35 * np.exp(-((wavelength_um - 4.65) ** 2) / (2.0 * 0.20 ** 2))
        return max(0.18, epoch_pulse * sed * h2o * co)

    # Objeto genérico
    return max(0.2, 1.1 * (1.5 / max(wavelength_um, 0.75)) ** 0.8)


def generate_spherex_mef_sequence(
    target_id: str,
    ra_deg: float,
    dec_deg: float,
    fov_arcmin: float,
    output_dir: Path,
    pixel_scale_arcsec: float = DEFAULT_PIXEL_SCALE_ARCSEC,
) -> list[Path]:
    """
    Genera una secuencia realista de cutouts Multi-Extension FITS (MEF) de SPHEREx
    para 4 épocas (cada 6 meses) y los 6 conjuntos de detectores (D1–D6).
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    seed_bytes = hashlib.sha256(f"{target_id}:{ra_deg:.4f}:{dec_deg:.4f}".encode()).digest()
    seed = int.from_bytes(seed_bytes[:4], "big")
    rng = np.random.default_rng(seed)

    # Tamaño del parche ligeramente mayor para que al reproyectar no falten esquinas tras rotación
    n_target = max(48, int(round((fov_arcmin * 60.0) / pixel_scale_arcsec)))
    n_src = int(np.ceil(n_target * 1.35))
    if n_src % 2 == 1:
        n_src += 1

    # Catálogo determinista de estrellas de fondo en (RA, Dec) fijas en el cielo
    cos_dec = max(np.cos(np.deg2rad(dec_deg)), 0.1)
    half_span_deg = (fov_arcmin / 60.0) * 0.78
    n_bg_stars = 26
    bg_ra = ra_deg + rng.uniform(-half_span_deg, half_span_deg, n_bg_stars) / cos_dec
    bg_dec = dec_deg + rng.uniform(-half_span_deg, half_span_deg, n_bg_stars)
    bg_flux_base = rng.uniform(0.35, 2.4, n_bg_stars)
    bg_color_slope = rng.uniform(-0.35, 0.15, n_bg_stars)

    # 4 épocas reales de mapeo semestral SPHEREx (May 2025 -> Nov 2026) con distinto roll angle
    epochs = [
        (60810.0, 0.0, 0.0, 0.0),
        (60992.5, 42.0, 4.5, -3.0),
        (61175.0, 178.0, -3.8, 5.2),
        (61357.5, 224.0, 2.1, 3.4),
    ]

    detectors = ["D1", "D2", "D3", "D4", "D5", "D6"]
    generated_paths: list[Path] = []
    frame_counter = 0

    for epoch_idx, (mjd_base, roll_deg, dither_ra, dither_dec) in enumerate(epochs):
        dt_years = (mjd_base - epochs[0][0]) / 365.25

        # Posición de la fuente objetivo en (RA, Dec) según física de cada objeto
        obj_ra = ra_deg
        obj_dec = dec_deg
        companion_ra = None
        companion_dec = None

        if target_id == "barnards_star":
            # 10.3"/año principalmente hacia el norte + oeste + paralaje anual
            pm_ra_arcsec = -0.8 * dt_years + 0.55 * np.sin(2.0 * np.pi * dt_years)
            pm_dec_arcsec = 10.3 * dt_years + 0.35 * np.cos(2.0 * np.pi * dt_years)
            obj_ra = ra_deg + (pm_ra_arcsec / 3600.0) / cos_dec
            obj_dec = dec_deg + pm_dec_arcsec / 3600.0
        elif target_id == "wise_0855":
            # 8.1"/año hacia el oeste
            pm_ra_arcsec = -8.05 * dt_years + 0.45 * np.sin(2.0 * np.pi * dt_years)
            pm_dec_arcsec = 0.9 * dt_years
            obj_ra = ra_deg + (pm_ra_arcsec / 3600.0) / cos_dec
            obj_dec = dec_deg + pm_dec_arcsec / 3600.0
        elif target_id == "epsilon_indi_b":
            # 4.7"/año + desplazamiento orbital del par binario Ba/Bb
            pm_ra_arcsec = 3.96 * dt_years
            pm_dec_arcsec = -2.55 * dt_years
            obj_ra = ra_deg + (pm_ra_arcsec / 3600.0) / cos_dec
            obj_dec = dec_deg + pm_dec_arcsec / 3600.0
            companion_ra = obj_ra + ((4.5 + 1.2 * np.cos(dt_years * 1.5)) / 3600.0) / cos_dec
            companion_dec = obj_dec + (2.8 + 1.0 * np.sin(dt_years * 1.5)) / 3600.0

        for det_idx, det_name in enumerate(detectors):
            lam_min, lam_max = DETECTOR_BANDS[det_name]
            # Variar ligeramente la banda LVF muestreada en cada época dentro del detector
            frac = (epoch_idx + 0.5) / len(epochs)
            wavelength_um = round(lam_min + (lam_max - lam_min) * frac, 3)
            mjd = mjd_base + det_idx * 0.015
            obs_utc = Time(mjd, format="mjd", scale="utc").isot + "Z"

            src_wcs = _build_rotated_wcs(
                ra_deg=ra_deg,
                dec_deg=dec_deg,
                n_pix=n_src,
                pixel_scale_arcsec=pixel_scale_arcsec,
                roll_deg=roll_deg + det_idx * 1.5,
                dither_ra_arcsec=dither_ra,
                dither_dec_arcsec=dither_dec,
            )

            # Fondo zodiacal realista dependiente de longitud de onda
            zodi_level = 0.12 + 0.08 * np.exp(-((wavelength_um - 2.8) ** 2) / 2.2)
            noise_sigma = 0.028 + 0.008 * det_idx
            img_data = rng.normal(zodi_level, noise_sigma, size=(n_src, n_src)).astype(np.float64)
            variance_data = np.full((n_src, n_src), noise_sigma ** 2, dtype=np.float32)
            flags_data = np.zeros((n_src, n_src), dtype=np.uint16)

            # Proyectar estrellas de fondo fijas en ICRS sobre el detector rotado
            bg_coords = SkyCoord(ra=bg_ra * u.deg, dec=bg_dec * u.deg, frame="icrs")
            bg_x, bg_y = src_wcs.world_to_pixel(bg_coords)
            for bx, by, bf, bslope in zip(bg_x, bg_y, bg_flux_base, bg_color_slope):
                flux_band = bf * max(0.25, (wavelength_um / 2.0) ** bslope)
                _add_gaussian_psf(img_data, float(bx), float(by), flux_band, sigma_px=1.3)

            # Proyectar estrella brillante cercana en Epsilon Indi (eps Ind A ~2' al NW)
            if target_id == "epsilon_indi_b":
                eps_a = SkyCoord(
                    ra=(ra_deg - (45.0 / 3600.0) / cos_dec) * u.deg,
                    dec=(dec_deg + 42.0 / 3600.0) * u.deg,
                    frame="icrs",
                )
                ax, ay = src_wcs.world_to_pixel(eps_a)
                _add_gaussian_psf(img_data, float(ax), float(ay), 6.5, sigma_px=1.7)

            # Proyectar fuente objetivo principal (y compañera binaria si aplica)
            obj_coord = SkyCoord(ra=obj_ra * u.deg, dec=obj_dec * u.deg, frame="icrs")
            ox, oy = src_wcs.world_to_pixel(obj_coord)
            target_flux = 3.2 * _target_spectral_factor(target_id, wavelength_um, epoch_idx)
            _add_gaussian_psf(img_data, float(ox), float(oy), target_flux, sigma_px=1.45)

            if companion_ra is not None and companion_dec is not None:
                comp_coord = SkyCoord(ra=companion_ra * u.deg, dec=companion_dec * u.deg, frame="icrs")
                cx, cy = src_wcs.world_to_pixel(comp_coord)
                _add_gaussian_psf(img_data, float(cx), float(cy), target_flux * 0.65, sigma_px=1.35)

            # Inyectar un rayo cósmico y bandera en una exposición puntual para validar stack y flags
            if epoch_idx == 1 and det_idx == 2:
                cr_y, cr_x = int(n_src * 0.36), int(n_src * 0.68)
                img_data[cr_y - 1 : cr_y + 2, cr_x - 1 : cr_x + 2] += 3.5
                flags_data[cr_y - 1 : cr_y + 2, cr_x - 1 : cr_x + 2] |= 1 << 0  # cosmic_ray
                flags_data[cr_y - 2 : cr_y + 3, cr_x - 2 : cr_x + 3] |= 1 << 4  # stray_light
            elif epoch_idx == 2 and det_idx == 4:
                # Leve persistencia en un parche del borde
                flags_data[4:12, 4:14] |= 1 << 3  # persistence

            # Construir archivo Multi-Extension FITS (MEF)
            primary_hdr = fits.Header()
            primary_hdr["MISSION"] = ("SPHEREx", "NASA SPHEREx All-Sky NIR Survey")
            primary_hdr["TELESCOP"] = ("SPHEREx", "Spacecraft observatory")
            primary_hdr["TARGET"] = (target_id, "Benchmark target identifier")
            primary_hdr["PLANEID"] = (f"spherex_{target_id}_e{epoch_idx}_{det_name}", "IRSA Plane ID")
            primary_hdu = fits.PrimaryHDU(header=primary_hdr)

            img_hdr = src_wcs.to_header()
            img_hdr["EXTNAME"] = "IMAGE"
            img_hdr["MJD-OBS"] = (round(mjd, 5), "Modified Julian Date of observation")
            img_hdr["DATE-OBS"] = (obs_utc, "UTC observation timestamp")
            img_hdr["DETECTOR"] = (det_name, "SPHEREx detector array D1-D6")
            img_hdr["BANDNAME"] = (f"SPHEREx-{det_name}-{epoch_idx + 1:02d}", "LVF spectral channel")
            img_hdr["WAVELENG"] = (wavelength_um, "Effective wavelength in microns")
            img_hdr["LVF_GRAD"] = (round((lam_max - lam_min) / n_src, 6), "LVF spectral gradient um/px")
            img_hdr["EXPTIME"] = (112.5, "Exposure duration in seconds")
            img_hdr["BUNIT"] = ("MJy/sr", "Surface brightness unit")
            img_hdr["PLANEID"] = (f"spherex_{target_id}_e{epoch_idx}_{det_name}", "Plane ID")
            img_hdr["ROLLANG"] = (roll_deg, "Spacecraft roll angle deg")

            image_hdu = fits.ImageHDU(data=img_data.astype(np.float32), header=img_hdr, name="IMAGE")

            flags_hdr = src_wcs.to_header()
            flags_hdr["EXTNAME"] = "FLAGS"
            flags_hdr["BIT0"] = ("cosmic_ray", "Cosmic ray jump")
            flags_hdr["BIT1"] = ("saturated", "Detector saturation")
            flags_hdr["BIT2"] = ("hot_dead_pixel", "Hot or dead pixel")
            flags_hdr["BIT3"] = ("persistence", "Detector persistence")
            flags_hdr["BIT4"] = ("stray_light", "Scattered or stray light")
            flags_hdr["BIT5"] = ("missing_data", "Missing or masked pixel")
            flags_hdu = fits.ImageHDU(data=flags_data, header=flags_hdr, name="FLAGS")

            var_hdr = src_wcs.to_header()
            var_hdr["EXTNAME"] = "VARIANCE"
            var_hdr["BUNIT"] = ("(MJy/sr)^2", "Pixel variance")
            var_hdu = fits.ImageHDU(data=variance_data, header=var_hdr, name="VARIANCE")

            hdul = fits.HDUList([primary_hdu, image_hdu, flags_hdu, var_hdu])
            out_path = output_dir / f"frame_{frame_counter:03d}_e{epoch_idx}_{det_name}.fits"
            hdul.writeto(out_path, overwrite=True)
            generated_paths.append(out_path)
            frame_counter += 1

    return generated_paths


def ensure_preset_cached(preset_id: str) -> list[Path]:
    """Garantiza que los FITS del preset especificado existan en data/presets/<preset_id>/."""
    preset = PRESET_TARGETS[preset_id]
    preset_dir = PRESETS_DIR / preset_id
    existing = sorted(preset_dir.glob("*.fits"))
    if len(existing) >= 24:
        return existing
    return generate_spherex_mef_sequence(
        target_id=preset.id,
        ra_deg=preset.ra_deg,
        dec_deg=preset.dec_deg,
        fov_arcmin=preset.default_fov_arcmin,
        output_dir=preset_dir,
    )


def ensure_all_presets() -> list[str]:
    """Asegura que los 5 objetos benchmark estén listos en disco para demo offline/rápida."""
    ready: list[str] = []
    for preset_id in PRESET_TARGETS:
        files = ensure_preset_cached(preset_id)
        if files:
            ready.append(preset_id)
    return ready

