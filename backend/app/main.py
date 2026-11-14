"""Aplicación FastAPI principal para el backend GrajX (SPHEREx Multi-Epoch & Multi-Band)."""

from __future__ import annotations

import io
import platform
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, Response
from PIL import Image

from .config import (
    ASSETS_DIR,
    DEFAULT_FOV_ARCMIN,
    MAX_FOV_ARCMIN,
    MIN_FOV_ARCMIN,
    ensure_directories,
)
from .debug_ui import DEBUG_HTML
from .fits_processor import (
    ReprojectedExposure,
    build_false_color_rgb_frames,
    build_target_wcs,
    decode_quality_flags,
    extract_spectrum,
    filter_exposures_by_detector,
    normalize_to_uint8,
    render_diff_divergent_rgb,
    reproject_sequence,
)
from .irsa_client import (
    discover_spherex_collections,
    estimate_transfer,
    format_icrs_sexagesimal,
    parse_coordinates,
    resolve_fits_cutouts,
)
from .models import (
    CoordinateParseResponse,
    DataSourceMode,
    DetectorFilter,
    EstimateResponse,
    FrameItem,
    FramesQueryEcho,
    FramesResponse,
    HealthResponse,
    PresetTarget,
    QualityInfo,
    SpectrumResponse,
    StreakletSegment,
    StretchMethod,
    ViewMode,
    WCSInfo,
)
from .motion_detector import (
    compute_detector_aware_difference_cube,
    create_animated_gif,
    detect_moving_objects_mask,
    detect_streaklets,
    render_mask_overlay_png,
    stack_images,
)
from .presets import PRESET_TARGETS, ensure_all_presets, find_matching_preset, list_presets

_PRESETS_READY: list[str] = []


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Inicializa directorios de caché y pre-genera cutouts de los 5 presets si faltan."""
    ensure_directories()
    ready = ensure_all_presets()
    _PRESETS_READY.clear()
    _PRESETS_READY.extend(ready)
    yield


app = FastAPI(
    title="GrajX — SPHEREx Multi-Epoch & Multi-Band API",
    description=(
        "Backend científico en FastAPI + Astropy para visualizar series temporales multi-banda "
        "(0.75–5.0 µm) de la misión SPHEREx de la NASA con reproyección WCS, modo blink/stack/diff/rgb, "
        "máscara de movimiento 3σ y espectros al vuelo."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_fov(fov: float) -> float:
    if not (MIN_FOV_ARCMIN <= fov <= MAX_FOV_ARCMIN):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid fov: {fov}. Must be between {MIN_FOV_ARCMIN} and {MAX_FOV_ARCMIN} arcmin.",
        )
    return float(fov)


def _parse_coords_or_400(ra: str, dec: str | None) -> tuple[float, float]:
    try:
        return parse_coordinates(ra, dec)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _resolve_reprojected_or_http(
    ra_deg: float,
    dec_deg: float,
    fov_arcmin: float,
    source: DataSourceMode,
) -> tuple[list[ReprojectedExposure], Any, tuple[int, int], float, str, str]:
    try:
        paths, data_source, cache_key = resolve_fits_cutouts(
            ra_deg=ra_deg,
            dec_deg=dec_deg,
            fov_arcmin=fov_arcmin,
            source=source,
        )
    except (FileNotFoundError, LookupError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    target_wcs, shape_out, eff_scale = build_target_wcs(ra_deg, dec_deg, fov_arcmin)
    reprojected = reproject_sequence(paths, target_wcs, shape_out, cache_key=cache_key)
    if not reprojected:
        raise HTTPException(
            status_code=404,
            detail=f"No SPHEREx exposures found at ({ra_deg:.4f}, {dec_deg:.4f}) within {fov_arcmin}' FOV.",
        )
    return reprojected, target_wcs, shape_out, eff_scale, data_source, cache_key


def _save_png_array(arr: np.ndarray, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if arr.ndim == 2:
        img = Image.fromarray(arr, mode="L")
    else:
        img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    out_path.write_bytes(buf.getvalue())


def _build_rendered_sequence(
    reprojected: list[ReprojectedExposure],
    mode: ViewMode,
    detector: DetectorFilter,
    stretch: StretchMethod,
    include_mask: bool,
) -> tuple[list[np.ndarray], list[ReprojectedExposure], list[np.ndarray | None], list[list[StreakletSegment]]]:
    """
    Genera los arrays uint8 (2D o RGB), metadatos asociados, máscaras 3σ y streaklets
    para la combinación solicitada de modo, detector y estiramiento.
    """
    if mode == ViewMode.rgb:
        rgb_pairs = build_false_color_rgb_frames(reprojected, stretch=stretch)
        rendered_arrays = [pair[0] for pair in rgb_pairs]
        metas = [pair[1] for pair in rgb_pairs]

        masks_out: list[np.ndarray | None] = [None] * len(metas)
        streaklets_out: list[list[StreakletSegment]] = [[] for _ in metas]
        if include_mask and metas:
            cube = np.stack([m.image for m in metas], axis=0)
            diff_cube = compute_detector_aware_difference_cube(cube, [m.detector for m in metas])
            masks_3d = detect_moving_objects_mask(diff_cube)
            for idx, meta in enumerate(metas):
                masks_out[idx] = masks_3d[idx]
                streaklets_out[idx] = detect_streaklets(meta.image)
        return rendered_arrays, metas, masks_out, streaklets_out

    selected = filter_exposures_by_detector(reprojected, detector.value)
    if not selected:
        raise HTTPException(
            status_code=404,
            detail=f"No SPHEREx exposures available for detector {detector.value}.",
        )

    cube = np.stack([e.image for e in selected], axis=0)
    variances = np.stack([e.variance for e in selected], axis=0)

    if mode == ViewMode.stack:
        stacked_img = stack_images(cube, variances=variances, method="median")
        # Para stack, combinar flags donde la mayoría de exposiciones estuvieron afectadas
        flag_stack = np.stack([e.flags for e in selected], axis=0)
        majority_thresh = max(1, len(selected) // 2 + 1)
        combined_flags = np.zeros_like(selected[0].flags)
        for bit_idx in range(6):
            bit_count = np.sum((flag_stack & np.uint16(1 << bit_idx)) != 0, axis=0)
            combined_flags = np.where(bit_count >= majority_thresh, combined_flags | np.uint16(1 << bit_idx), combined_flags)

        ref = selected[0]
        stack_meta = ReprojectedExposure(
            planeid=f"stack_{detector.value}_{len(selected)}f",
            image=stacked_img,
            variance=np.nanmedian(variances, axis=0),
            flags=combined_flags,
            mjd=float(np.mean([e.mjd for e in selected])),
            obs_utc=f"{selected[0].obs_utc[:10]}..{selected[-1].obs_utc[:10]}",
            detector=detector.value if detector != DetectorFilter.all else "D1-D6",
            band_name=f"Median-Stack-{detector.value}",
            wavelength_um=float(round(np.mean([e.wavelength_um for e in selected]), 3)),
            exposure_sec=float(sum(e.exposure_sec for e in selected)),
            flux_unit=ref.flux_unit,
            flag_definitions=ref.flag_definitions,
        )
        rendered_u8 = normalize_to_uint8(stacked_img, stretch=stretch, flip_north_up=True)
        streaklets = [detect_streaklets(stacked_img)] if include_mask else [[]]
        return [rendered_u8], [stack_meta], [None], streaklets

    diff_cube = compute_detector_aware_difference_cube(cube, [e.detector for e in selected])
    masks_3d = detect_moving_objects_mask(diff_cube) if include_mask else None

    rendered_arrays = []
    masks_out = []
    streaklets_out = []

    if mode == ViewMode.diff:
        abs_vals = np.abs(np.nan_to_num(diff_cube, nan=0.0))
        global_vlim = float(np.percentile(abs_vals, 99.2)) if abs_vals.size else 1.0
        global_vlim = max(global_vlim, 1e-4)
        for idx, exp in enumerate(selected):
            rendered_arrays.append(render_diff_divergent_rgb(diff_cube[idx], vlim=global_vlim, flip_north_up=True))
            masks_out.append(masks_3d[idx] if masks_3d is not None else None)
            streaklets_out.append(detect_streaklets(exp.image) if include_mask else [])
    else:  # ViewMode.blink
        for idx, exp in enumerate(selected):
            rendered_arrays.append(normalize_to_uint8(exp.image, stretch=stretch, flip_north_up=True))
            masks_out.append(masks_3d[idx] if masks_3d is not None else None)
            streaklets_out.append(detect_streaklets(exp.image) if include_mask else [])

    return rendered_arrays, selected, masks_out, streaklets_out


@app.get("/", include_in_schema=False)
def root_redirect() -> RedirectResponse:
    """Redirige la raíz directamente a la consola interactiva de debug."""
    return RedirectResponse(url="/debug")


@app.get("/debug", response_class=HTMLResponse, include_in_schema=False)
def debug_console() -> HTMLResponse:
    """Consola HTML interactiva para probar todos los endpoints sin depender de frontend."""
    return HTMLResponse(content=DEBUG_HTML)


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
def get_health() -> HealthResponse:
    """Verifica el estado de la API, presets en disco y conectividad con NASA/IPAC IRSA."""
    ensure_directories()
    ready = _PRESETS_READY if _PRESETS_READY else [
        pid for pid in PRESET_TARGETS if (ensure_all_presets() and True)
    ]
    collections, irsa_ok = discover_spherex_collections(force_refresh=False, timeout_sec=2.0)
    return HealthResponse(
        status="ok",
        python_version=platform.python_version(),
        presets_ready=ready,
        irsa_reachable=irsa_ok,
        active_collections=collections,
    )


@app.get("/api/presets", response_model=list[PresetTarget], tags=["Targets"])
def get_presets() -> list[PresetTarget]:
    """Retorna los 5 objetos astronómicos obligatorios del reto para accesos rápidos."""
    return list_presets()


@app.get("/api/coordinates/parse", response_model=CoordinateParseResponse, tags=["Coordinates"])
def parse_sky_coordinates(
    ra: str = Query(..., description="RA en grados decimales, sexagesimal, par completo o nombre"),
    dec: str | None = Query(None, description="Dec en grados decimales o sexagesimal (opcional si ra incluye ambos)"),
) -> CoordinateParseResponse:
    """Normaliza coordenadas de usuario a grados decimales ICRS y detecta si coincide con un preset."""
    ra_deg, dec_deg = _parse_coords_or_400(ra, dec)
    ra_hms, dec_dms = format_icrs_sexagesimal(ra_deg, dec_deg)
    matched = find_matching_preset(ra_deg, dec_deg, tolerance_arcmin=5.0)
    return CoordinateParseResponse(
        input_ra=ra,
        input_dec=dec,
        ra_deg=round(ra_deg, 6),
        dec_deg=round(dec_deg, 6),
        ra_hms=ra_hms,
        dec_dms=dec_dms,
        matched_preset=matched,
    )


@app.get("/api/estimate", response_model=EstimateResponse, tags=["IRSA"])
def get_transfer_estimate(
    ra: str = Query(..., description="RA en grados decimales, sexagesimal o nombre"),
    dec: str | None = Query(None, description="Dec en grados decimales o sexagesimal"),
    fov: float = Query(DEFAULT_FOV_ARCMIN, description="Campo de visión en arcmin (1.0–30.0)"),
) -> EstimateResponse:
    """Estima cuadros, tamaño en MB y tiempo aproximado antes de consultar un FOV grande."""
    fov_val = _validate_fov(fov)
    ra_deg, dec_deg = _parse_coords_or_400(ra, dec)
    return estimate_transfer(ra_deg, dec_deg, fov_arcmin=fov_val)


@app.get("/api/frames", response_model=FramesResponse, tags=["Viewer"])
def get_frames(
    ra: str = Query(..., description="RA en grados decimales, sexagesimal, par completo o nombre"),
    dec: str | None = Query(None, description="Dec en grados decimales o sexagesimal"),
    fov: float = Query(DEFAULT_FOV_ARCMIN, description="Campo de visión en arcmin (1.0–30.0)"),
    mode: ViewMode = Query(ViewMode.blink, description="Modo visual: blink, stack, diff, rgb"),
    detector: DetectorFilter = Query(DetectorFilter.all, description="Filtro de detector: all o D1..D6"),
    stretch: StretchMethod = Query(StretchMethod.asinh, description="Estiramiento: asinh, zscale, percentile"),
    include_mask: bool = Query(False, description="Generar máscara de movimiento 3σ y streaklets"),
    source: DataSourceMode = Query(DataSourceMode.auto, description="Origen de datos: auto, cache, live"),
) -> FramesResponse:
    """Endpoint principal del visor multi-época y multi-banda."""
    fov_val = _validate_fov(fov)
    ra_deg, dec_deg = _parse_coords_or_400(ra, dec)
    reprojected, target_wcs, shape_out, eff_scale, data_source, cache_key = _resolve_reprojected_or_http(
        ra_deg=ra_deg,
        dec_deg=dec_deg,
        fov_arcmin=fov_val,
        source=source,
    )

    rendered_arrays, metas, masks_list, streaklets_list = _build_rendered_sequence(
        reprojected=reprojected,
        mode=mode,
        detector=detector,
        stretch=stretch,
        include_mask=include_mask,
    )

    asset_dir = ASSETS_DIR / cache_key
    asset_dir.mkdir(parents=True, exist_ok=True)
    height, width = shape_out

    frame_items: list[FrameItem] = []
    for idx, (arr, meta, mask_2d, streaklets) in enumerate(
        zip(rendered_arrays, metas, masks_list, streaklets_list)
    ):
        fname = f"frame_{idx:03d}_{mode.value}_{detector.value}_{stretch.value}.png"
        _save_png_array(arr, asset_dir / fname)

        mask_url = None
        if include_mask and mask_2d is not None:
            mask_fname = f"mask_{idx:03d}_{mode.value}_{detector.value}.png"
            mask_bytes = render_mask_overlay_png(mask_2d, streaklets, flip_north_up=True)
            (asset_dir / mask_fname).write_bytes(mask_bytes)
            mask_url = f"/api/assets/{cache_key}/{mask_fname}"
        elif include_mask and streaklets:
            mask_fname = f"mask_{idx:03d}_{mode.value}_{detector.value}.png"
            empty_mask = np.zeros(shape_out, dtype=bool)
            mask_bytes = render_mask_overlay_png(empty_mask, streaklets, flip_north_up=True)
            (asset_dir / mask_fname).write_bytes(mask_bytes)
            mask_url = f"/api/assets/{cache_key}/{mask_fname}"

        quality: QualityInfo = decode_quality_flags(meta.flags, meta.image, meta.flag_definitions)
        frame_items.append(
            FrameItem(
                index=idx,
                planeid=meta.planeid,
                image_url=f"/api/assets/{cache_key}/{fname}",
                mask_overlay_url=mask_url,
                mjd=round(meta.mjd, 5),
                obs_utc=meta.obs_utc,
                detector=meta.detector,
                band_name=meta.band_name,
                wavelength_um=round(meta.wavelength_um, 4),
                exposure_sec=round(meta.exposure_sec, 2),
                flux_unit=meta.flux_unit,
                quality=quality,
                streaklets=streaklets,
            )
        )

    return FramesResponse(
        query=FramesQueryEcho(
            ra_deg=round(ra_deg, 6),
            dec_deg=round(dec_deg, 6),
            fov_arcmin=fov_val,
            mode=mode,
            detector=detector,
            stretch=stretch,
        ),
        data_source=data_source,
        wcs=WCSInfo(
            width=width,
            height=height,
            pixel_scale_arcsec=eff_scale,
            projection="TAN",
            crval1=float(target_wcs.wcs.crval[0]),
            crval2=float(target_wcs.wcs.crval[1]),
            crpix1=float(target_wcs.wcs.crpix[0]),
            crpix2=float(target_wcs.wcs.crpix[1]),
            cdelt1=float(target_wcs.wcs.cdelt[0]),
            cdelt2=float(target_wcs.wcs.cdelt[1]),
        ),
        frames=frame_items,
    )


@app.get("/api/spectrum", response_model=SpectrumResponse, tags=["Spectroscopy"])
def get_spectrum(
    ra: str = Query(..., description="RA central del parche"),
    dec: str | None = Query(None, description="Dec central del parche"),
    fov: float = Query(DEFAULT_FOV_ARCMIN, description="Campo de visión en arcmin (1.0–30.0)"),
    target_ra: float | None = Query(None, description="RA exacta del objeto/píxel clickeado (deg)"),
    target_dec: float | None = Query(None, description="Dec exacta del objeto/píxel clickeado (deg)"),
    aperture_arcsec: float = Query(12.0, description="Radio de apertura fotométrica en arcsec"),
    source: DataSourceMode = Query(DataSourceMode.auto, description="Origen de datos: auto, cache, live"),
) -> SpectrumResponse:
    """Extrae el espectro infrarrojo cercano (0.75–5.0 µm) al vuelo en la coordenada dada."""
    fov_val = _validate_fov(fov)
    if not (1.5 <= aperture_arcsec <= 120.0):
        raise HTTPException(
            status_code=400,
            detail="Invalid aperture_arcsec: must be between 1.5 and 120.0 arcsec.",
        )

    ra_deg, dec_deg = _parse_coords_or_400(ra, dec)
    t_ra = ra_deg if target_ra is None else float(target_ra)
    t_dec = dec_deg if target_dec is None else float(target_dec)
    if not (0.0 <= t_ra < 360.0 and -90.0 <= t_dec <= 90.0):
        raise HTTPException(status_code=400, detail="Invalid sky coordinates for target_ra/target_dec.")

    reprojected, target_wcs, _, eff_scale, _, _ = _resolve_reprojected_or_http(
        ra_deg=ra_deg,
        dec_deg=dec_deg,
        fov_arcmin=fov_val,
        source=source,
    )

    try:
        points = extract_spectrum(
            exposures=reprojected,
            target_wcs=target_wcs,
            target_ra_deg=t_ra,
            target_dec_deg=t_dec,
            aperture_arcsec=aperture_arcsec,
            pixel_scale_arcsec=eff_scale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SpectrumResponse(
        target_ra_deg=round(t_ra, 6),
        target_dec_deg=round(t_dec, 6),
        aperture_arcsec=float(aperture_arcsec),
        flux_unit=reprojected[0].flux_unit,
        points=points,
    )


@app.get("/api/export/gif", tags=["Export"])
def export_gif(
    ra: str = Query(..., description="RA en grados decimales, sexagesimal o nombre"),
    dec: str | None = Query(None, description="Dec en grados decimales o sexagesimal"),
    fov: float = Query(DEFAULT_FOV_ARCMIN, description="Campo de visión en arcmin (1.0–30.0)"),
    mode: ViewMode = Query(ViewMode.blink, description="Modo visual: blink, stack, diff, rgb"),
    detector: DetectorFilter = Query(DetectorFilter.all, description="Filtro de detector: all o D1..D6"),
    stretch: StretchMethod = Query(StretchMethod.asinh, description="Estiramiento: asinh, zscale, percentile"),
    fps: float = Query(4.0, description="Cuadros por segundo del GIF (0.5–15.0)"),
    source: DataSourceMode = Query(DataSourceMode.auto, description="Origen de datos: auto, cache, live"),
) -> Response:
    """Genera y descarga un GIF animado del parche con sello temporal MJD y detector."""
    fov_val = _validate_fov(fov)
    if not (0.5 <= fps <= 15.0):
        raise HTTPException(status_code=400, detail="Invalid fps: must be between 0.5 and 15.0.")

    ra_deg, dec_deg = _parse_coords_or_400(ra, dec)
    reprojected, _, _, _, _, _ = _resolve_reprojected_or_http(
        ra_deg=ra_deg,
        dec_deg=dec_deg,
        fov_arcmin=fov_val,
        source=source,
    )
    rendered_arrays, metas, _, _ = _build_rendered_sequence(
        reprojected=reprojected,
        mode=mode,
        detector=detector,
        stretch=stretch,
        include_mask=False,
    )

    meta_dicts = [
        {
            "obs_utc": m.obs_utc,
            "mjd": m.mjd,
            "detector": m.detector,
            "wavelength_um": m.wavelength_um,
            "mode": mode.value,
        }
        for m in metas
    ]
    gif_bytes = create_animated_gif(rendered_arrays, meta_dicts, fps=fps)
    filename = f"spherex_{ra_deg:.4f}_{dec_deg:.4f}_{mode.value}.gif"
    return Response(
        content=gif_bytes,
        media_type="image/gif",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/assets/{cache_key}/{filename}", tags=["Assets"])
def get_asset(cache_key: str, filename: str) -> FileResponse:
    """Sirve imágenes PNG cacheadas (frames y máscaras 3σ) generadas por /api/frames."""
    target_path = (ASSETS_DIR / cache_key / filename).resolve()
    assets_root = ASSETS_DIR.resolve()
    if not target_path.is_relative_to(assets_root) or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Requested image asset was not found.")
    return FileResponse(path=target_path, media_type="image/png")

