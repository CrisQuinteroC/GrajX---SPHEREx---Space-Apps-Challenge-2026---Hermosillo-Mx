"""Detección de movimiento (3σ + morfología), streaklets, apilado/resta y exportación GIF."""

from __future__ import annotations

import io
from typing import Any

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import binary_dilation, binary_opening
from skimage.feature import canny
from skimage.filters import gaussian
from skimage.morphology import remove_small_objects
from skimage.transform import probabilistic_hough_line

from .models import StreakletSegment


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


def render_mask_overlay_png(
    mask_2d: np.ndarray,
    streaklets: list[StreakletSegment],
    flip_north_up: bool = True,
) -> bytes:
    """
    Genera un PNG RGBA transparente con la máscara 3σ (cian) y trazas streaklets (ámbar)
    para superponer sobre el frame base en el navegador.
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
) -> bytes:
    """
    Genera un GIF animado en memoria con estampado de época (UTC/MJD), detector y λ.
    """
    if not frames:
        raise ValueError("Cannot create animated GIF from an empty frame list.")

    stamped_frames: list[np.ndarray] = []
    font = ImageFont.load_default()

    for frame_arr, meta in zip(frames, metadata_list):
        pil_img = _to_rgb_pil(frame_arr)
        w, h = pil_img.size
        # Escalar de forma entera si la imagen es compacta para que el texto sea legible
        scale = max(1, 360 // max(w, 1))
        if scale > 1:
            pil_img = pil_img.resize((w * scale, h * scale), resample=Image.Resampling.NEAREST)

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

