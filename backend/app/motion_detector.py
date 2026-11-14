"""Detección de movimiento (3σ + morfología), streaklets, apilado/resta y exportación GIF."""

from __future__ import annotations

import io
import math
from typing import Any

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import binary_dilation, binary_opening, gaussian_filter
from skimage.feature import canny
from skimage.filters import gaussian
from skimage.morphology import remove_small_objects
from skimage.transform import probabilistic_hough_line

from .models import StreakletSegment, TrajectoryPoint


def stack_images(
    cube: np.ndarray,
    variances: np.ndarray | None = None,
    method: str = "median",
) -> np.ndarray:
    """
    Combina un cubo multi-época (T, H, W) para eliminar rayos cósmicos y mejorar SNR.
    - 'median': mediana robusta ignorando NaN.
    - 'weighted': media ponderada inversa a la varianza (1/VARIANCE).
    """
    if cube.ndim != 3 or cube.shape[0] == 0:
        raise ValueError("Input cube must have shape (T, H, W) with T >= 1.")
    if cube.shape[0] == 1:
        return cube[0].copy()

    if method == "weighted" and variances is not None:
        valid = np.isfinite(cube) & np.isfinite(variances) & (variances > 0)
        weights = np.where(valid, 1.0 / variances, 0.0)
        w_sum = np.sum(weights, axis=0)
        return np.where(
            w_sum > 0,
            np.sum(np.nan_to_num(cube) * weights, axis=0) / np.maximum(w_sum, 1e-12),
            np.nanmedian(cube, axis=0),
        )

    # Suprimir advertencia de All-NaN slice usando máscara finita
    all_nan = ~np.any(np.isfinite(cube), axis=0)
    stacked = np.full(cube.shape[1:], np.nan, dtype=np.float64)
    valid_cols = ~all_nan
    if np.any(valid_cols):
        stacked[valid_cols] = np.nanmedian(cube[:, valid_cols], axis=0)
    return stacked


def compute_difference_cube(
    cube: np.ndarray,
    reference: str = "median",
) -> np.ndarray:
    """
    Calcula el cubo de diferencias temporales I_t - I_ref sobre un cubo ya reproyectado a WCS común.
    """
    if cube.ndim != 3 or cube.shape[0] == 0:
        raise ValueError("Input cube must have shape (T, H, W) with T >= 1.")

    if reference == "first":
        ref = cube[0]
    else:
        ref = stack_images(cube, method="median")

    return cube - ref[None, :, :]


def compute_detector_aware_difference_cube(
    cube: np.ndarray,
    detectors: list[str],
) -> np.ndarray:
    """
    Calcula diferencias temporales agrupando la referencia por detector cuando hay
    múltiples épocas por detector, evitando residuos cromáticos entre bandas D1–D6.
    """
    if len(detectors) != cube.shape[0]:
        return compute_difference_cube(cube, reference="median")

    diff = np.empty_like(cube, dtype=np.float64)
    global_ref = stack_images(cube, method="median")

    det_indices: dict[str, list[int]] = {}
    for idx, det in enumerate(detectors):
        det_indices.setdefault(det, []).append(idx)

    for det, idxs in det_indices.items():
        if len(idxs) >= 2:
            sub_cube = cube[idxs]
            sub_ref = stack_images(sub_cube, method="median")
            diff[idxs] = sub_cube - sub_ref[None, :, :]
        else:
            diff[idxs] = cube[idxs] - global_ref[None, :, :]

    return diff


def detect_moving_objects_mask(
    diff_cube: np.ndarray,
    sigma_mult: float = 3.0,
    min_size: int = 6,
) -> np.ndarray:
    """
    Detecta regiones con desplazamiento o variación estadística significativa (>= 3σ)
    en el cubo de diferencias usando MAD + apertura morfológica + limpieza de objetos pequeños.
    Retorna máscara booleana 3D (T, H, W).
    """
    valid = diff_cube[np.isfinite(diff_cube)]
    if valid.size == 0:
        return np.zeros_like(diff_cube, dtype=bool)

    med = float(np.median(valid))
    mad = float(np.median(np.abs(valid - med)))
    robust_std = 1.4826 * mad if mad > 0 else float(np.std(valid))
    if robust_std <= 1e-12:
        return np.zeros_like(diff_cube, dtype=bool)

    threshold = robust_std * sigma_mult
    masks = np.zeros_like(diff_cube, dtype=bool)
    footprint = np.ones((3, 3), dtype=bool)
    max_removed_size = max(1, int(min_size) - 1)

    for t in range(diff_cube.shape[0]):
        raw = np.abs(np.nan_to_num(diff_cube[t], nan=0.0)) > threshold
        opened = binary_opening(raw, structure=footprint)
        if np.any(opened):
            masks[t] = remove_small_objects(opened, max_size=max_removed_size)
        else:
            masks[t] = False

    return masks


def detect_streaklets(
    frame_2d: np.ndarray,
    sigma: float = 1.0,
    flip_north_up: bool = True,
) -> list[StreakletSegment]:
    """
    Detecta trazas lineales rápidas (asteroides, satélites, rayos cósmicos rasantes)
    usando suavizado Gaussiano + Canny + Hough probabilístico (compatible con Python 3.14).
    """
    finite = np.isfinite(frame_2d)
    if not np.any(finite):
        return []

    fill_val = float(np.nanmedian(frame_2d))
    clean = np.nan_to_num(frame_2d, nan=fill_val, posinf=fill_val, neginf=fill_val)
    if flip_north_up:
        clean = np.flipud(clean)

    # Normalización robusta [0, 1] antes de detectar bordes
    p_low, p_high = np.percentile(clean, [5.0, 99.5])
    if p_high <= p_low:
        return []
    scaled = np.clip((clean - p_low) / (p_high - p_low), 0.0, 1.0)

    smoothed = gaussian(scaled, sigma=sigma)
    edges = canny(smoothed, sigma=1.2, low_threshold=0.18, high_threshold=0.42)
    if not np.any(edges):
        return []

    min_len = max(10, min(clean.shape) // 8)
    lines = probabilistic_hough_line(
        edges,
        threshold=12,
        line_length=min_len,
        line_gap=3,
    )

    segments: list[StreakletSegment] = []
    for (x1, y1), (x2, y2) in lines[:16]:
        segments.append(StreakletSegment(x1=int(x1), y1=int(y1), x2=int(x2), y2=int(y2)))
    return segments


def _refine_centroid(img_2d: np.ndarray, x0: float, y0: float, radius: int = 3) -> tuple[float, float]:
    """Calcula el centroide ponderado por flujo positivo alrededor de (x0, y0)."""
    h, w = img_2d.shape
    cx, cy = int(round(x0)), int(round(y0))
    x_min, x_max = max(0, cx - radius), min(w, cx + radius + 1)
    y_min, y_max = max(0, cy - radius), min(h, cy + radius + 1)
    if x_min >= x_max or y_min >= y_max:
        return float(x0), float(y0)

    patch = np.nan_to_num(img_2d[y_min:y_max, x_min:x_max], nan=0.0)
    bg = float(np.percentile(patch, 20.0))
    weights = np.clip(patch - bg, 0.0, None)
    total = float(np.sum(weights))
    if total <= 1e-12:
        return float(x0), float(y0)

    yy, xx = np.mgrid[y_min:y_max, x_min:x_max]
    return float(np.sum(xx * weights) / total), float(np.sum(yy * weights) / total)


def extract_object_trajectory(
    exposures: list[Any],
    target_wcs: Any,
    pixel_scale_arcsec: float = 3.0,
    flip_north_up: bool = True,
    min_displacement_px: float = 1.0,
) -> list[TrajectoryPoint]:
    """
    Rastrea la trayectoria temporal (x, y, RA, Dec) del astro en movimiento a lo largo
    de la secuencia reproyectada. Retorna lista vacía si el objeto es estacionario.
    """
    if len(exposures) < 2:
        return []

    cube = np.stack([e.image for e in exposures], axis=0)
    t_count, h, w = cube.shape
    detectors = [e.detector for e in exposures]
    diff_cube = compute_detector_aware_difference_cube(cube, detectors)

    valid = diff_cube[np.isfinite(diff_cube)]
    if valid.size == 0:
        return []
    med = float(np.median(valid))
    mad = float(np.median(np.abs(valid - med)))
    robust_std = 1.4826 * mad if mad > 0 else float(np.std(valid))
    if robust_std <= 1e-12:
        return []

    pos_thresh = 2.2 * robust_std
    cy_center, cx_center = (h - 1) / 2.0, (w - 1) / 2.0
    max_center_dist = 0.45 * min(h, w)
    yy_grid, xx_grid = np.mgrid[0:h, 0:w]
    dist_from_center = np.hypot(xx_grid - cx_center, yy_grid - cy_center)
    central_weight = np.where(dist_from_center <= max_center_dist, 1.0 / (1.0 + 0.02 * dist_from_center), 0.0)

    smoothed_diffs: list[np.ndarray] = []
    anchor_detections: dict[int, tuple[float, float]] = {}

    for t in range(t_count):
        sm = gaussian_filter(np.nan_to_num(diff_cube[t], nan=0.0), sigma=0.9)
        smoothed_diffs.append(sm)
        scored = np.where(sm > pos_thresh, sm * central_weight, 0.0)
        best_flat = int(np.argmax(scored))
        best_val = float(scored.flat[best_flat])
        if best_val > 0.0:
            py, px = divmod(best_flat, w)
            anchor_detections[t] = _refine_centroid(cube[t], float(px), float(py), radius=3)

    if len(anchor_detections) < 2:
        return []

    t_first = min(anchor_detections.keys())
    t_last = max(anchor_detections.keys())
    x_first, y_first = anchor_detections[t_first]
    x_last, y_last = anchor_detections[t_last]

    total_disp_px = math.hypot(x_last - x_first, y_last - y_first)
    if total_disp_px < min_displacement_px:
        return []

    # Construir trayectoria suave para todos los frames (interpolando épocas intermedias y refinando en cube[t])
    mjds = [float(e.mjd) for e in exposures]
    mjd_span = max(mjds[t_last] - mjds[t_first], 1e-6)
    fits_positions: list[tuple[float, float]] = []

    for t in range(t_count):
        frac = (mjds[t] - mjds[t_first]) / mjd_span
        x_guess = x_first + frac * (x_last - x_first)
        y_guess = y_first + frac * (y_last - y_first)

        if t in anchor_detections and math.hypot(anchor_detections[t][0] - x_guess, anchor_detections[t][1] - y_guess) <= 6.0:
            x_ref, y_ref = anchor_detections[t]
        else:
            x_ref, y_ref = _refine_centroid(cube[t], x_guess, y_guess, radius=3)
            if math.hypot(x_ref - x_guess, y_ref - y_guess) > 4.0:
                x_ref, y_ref = x_guess, y_guess
        fits_positions.append((x_ref, y_ref))

    x0_fits, y0_fits = fits_positions[0]
    trajectory: list[TrajectoryPoint] = []
    for t, (xf, yf) in enumerate(fits_positions):
        sky = target_wcs.pixel_to_world(xf, yf)
        disp_arcsec = math.hypot(xf - x0_fits, yf - y0_fits) * pixel_scale_arcsec
        y_disp = (h - 1) - yf if flip_north_up else yf
        trajectory.append(
            TrajectoryPoint(
                frame_index=t,
                mjd=round(float(exposures[t].mjd), 5),
                obs_utc=str(exposures[t].obs_utc),
                x=round(xf, 3),
                y=round(y_disp, 3),
                ra_deg=round(float(sky.ra.deg), 6),
                dec_deg=round(float(sky.dec.deg), 6),
                displacement_arcsec=round(disp_arcsec, 2),
            )
        )

    return trajectory


def _draw_trajectory_on_pil(
    img: Image.Image,
    trajectory: list[TrajectoryPoint],
    scale: int = 1,
    current_index: int | None = None,
) -> None:
    """Dibuja la trayectoria temporal del astro sobre una imagen PIL RGBA/RGB."""
    if len(trajectory) < 2:
        return

    draw = ImageDraw.Draw(img, "RGBA")
    pts = [(pt.x * scale + 0.5 * scale, pt.y * scale + 0.5 * scale) for pt in trajectory]
    line_w = max(2, scale)
    draw.line(pts, fill=(250, 204, 21, 225), width=line_w)

    # Puntos por época y flecha de dirección al final
    r_dot = max(2, scale)
    for idx, (px, py) in enumerate(pts):
        is_current = current_index is not None and idx == current_index
        if is_current:
            r_cur = r_dot + max(2, scale)
            draw.ellipse([px - r_cur, py - r_cur, px + r_cur, py + r_cur], outline=(56, 189, 248, 255), width=max(2, scale))
            draw.ellipse([px - r_dot, py - r_dot, px + r_dot, py + r_dot], fill=(255, 255, 255, 255))
        else:
            color = (56, 189, 248, 230) if idx == 0 else (250, 204, 21, 230)
            draw.ellipse([px - r_dot, py - r_dot, px + r_dot, py + r_dot], fill=color)

    # Punta de flecha en el último segmento
    x1, y1 = pts[-2]
    x2, y2 = pts[-1]
    dx, dy = x2 - x1, y2 - y1
    seg_len = math.hypot(dx, dy)
    if seg_len > 1e-3:
        ux, uy = dx / seg_len, dy / seg_len
        arrow_len = max(5.0, 2.5 * scale)
        wing = arrow_len * 0.55
        p_left = (x2 - ux * arrow_len - uy * wing, y2 - uy * arrow_len + ux * wing)
        p_right = (x2 - ux * arrow_len + uy * wing, y2 - uy * arrow_len - ux * wing)
        draw.polygon([(x2, y2), p_left, p_right], fill=(250, 204, 21, 245))


def render_mask_overlay_png(
    mask_2d: np.ndarray,
    streaklets: list[StreakletSegment],
    flip_north_up: bool = True,
    trajectory: list[TrajectoryPoint] | None = None,
    current_index: int | None = None,
) -> bytes:
    """
    Genera un PNG RGBA transparente con la máscara 3σ (cian), trazas streaklets (ámbar)
    y opcionalmente la trayectoria temporal del astro para superponer sobre el frame base.
    """
    m = np.flipud(mask_2d) if flip_north_up else mask_2d
    h, w = m.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    if np.any(m):
        dilated = binary_dilation(m, iterations=1)
        outline = dilated & ~m
        rgba[m] = [0, 229, 255, 85]
        rgba[outline] = [0, 255, 200, 235]

    img = Image.fromarray(rgba, mode="RGBA")
    if streaklets:
        draw = ImageDraw.Draw(img)
        for seg in streaklets:
            draw.line(
                [(seg.x1, seg.y1), (seg.x2, seg.y2)],
                fill=(255, 196, 0, 240),
                width=2,
            )

    if trajectory and len(trajectory) >= 2:
        _draw_trajectory_on_pil(img, trajectory, scale=1, current_index=current_index)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _to_rgb_pil(frame: np.ndarray) -> Image.Image:
    """Convierte un array 2D uint8 (L) o 3D uint8 (RGB) a PIL Image RGB."""
    if frame.ndim == 2:
        return Image.fromarray(frame, mode="L").convert("RGB")
    return Image.fromarray(frame, mode="RGB")


def create_animated_gif(
    frames: list[np.ndarray],
    metadata_list: list[dict[str, Any]],
    fps: float = 4.0,
    trajectory: list[TrajectoryPoint] | None = None,
) -> bytes:
    """
    Genera un GIF animado en memoria con estampado de época (UTC/MJD), detector, λ
    y la trayectoria del astro en movimiento si está disponible.
    """
    if not frames:
        raise ValueError("Cannot create animated GIF from an empty frame list.")

    stamped_frames: list[np.ndarray] = []
    font = ImageFont.load_default()

    for idx, (frame_arr, meta) in enumerate(zip(frames, metadata_list)):
        pil_img = _to_rgb_pil(frame_arr)
        w, h = pil_img.size
        # Escalar de forma entera si la imagen es compacta para que el texto sea legible
        scale = max(1, 360 // max(w, 1))
        if scale > 1:
            pil_img = pil_img.resize((w * scale, h * scale), resample=Image.Resampling.NEAREST)

        if trajectory and len(trajectory) >= 2:
            _draw_trajectory_on_pil(pil_img, trajectory, scale=scale, current_index=idx)

        draw = ImageDraw.Draw(pil_img, "RGBA")
        obs_date = str(meta.get("obs_utc", ""))[:10]
        mjd = meta.get("mjd", 0.0)
        det = meta.get("detector", "")
        lam = meta.get("wavelength_um", 0.0)
        mode_lbl = str(meta.get("mode", "")).upper()

        label_line1 = f"SPHEREx {mode_lbl} | {det} ({lam:.2f} um)"
        label_line2 = f"{obs_date} | MJD {mjd:.1f}"

        draw.rectangle([6, 6, min(pil_img.width - 6, 268), 42], fill=(8, 12, 22, 195))
        draw.text((12, 10), label_line1, fill=(110, 235, 255, 255), font=font)
        draw.text((12, 25), label_line2, fill=(240, 245, 255, 255), font=font)

        stamped_frames.append(np.asarray(pil_img, dtype=np.uint8))

    buf = io.BytesIO()
    duration_ms = max(40.0, 1000.0 / max(float(fps), 0.25))
    imageio.mimsave(buf, stamped_frames, format="GIF", duration=duration_ms, loop=0)
    return buf.getvalue()

