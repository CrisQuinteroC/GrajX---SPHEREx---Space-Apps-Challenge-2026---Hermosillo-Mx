"""Pruebas del pipeline FITS MEF, reproyección WCS, detectores D1–D6, movimiento y espectro."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import numpy as np

from backend.app.fits_processor import (
    build_false_color_rgb_frames,
    build_target_wcs,
    decode_quality_flags,
    extract_spectrum,
    filter_exposures_by_detector,
    normalize_to_uint8,
    reproject_sequence,
)
from backend.app.models import StretchMethod
from backend.app.motion_detector import (
    compute_detector_aware_difference_cube,
    create_animated_gif,
    detect_moving_objects_mask,
    extract_object_trajectory,
    stack_images,
)
from backend.app.presets import PRESET_TARGETS, generate_spherex_mef_sequence


class TestFitsPipeline(unittest.TestCase):
    def test_wcs_reprojection_diff_and_motion_mask(self) -> None:
        barnard = PRESET_TARGETS["barnards_star"]
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = generate_spherex_mef_sequence(
                target_id=barnard.id,
                ra_deg=barnard.ra_deg,
                dec_deg=barnard.dec_deg,
                fov_arcmin=6.0,
                output_dir=Path(tmpdir),
            )
            self.assertEqual(len(paths), 24)

            target_wcs, shape_out, eff_scale = build_target_wcs(barnard.ra_deg, barnard.dec_deg, 6.0)
            self.assertEqual(shape_out, (120, 120))
            self.assertAlmostEqual(eff_scale, 3.0)

            reprojected = reproject_sequence(paths, target_wcs, shape_out)
            self.assertEqual(len(reprojected), 24)

            d1_frames = filter_exposures_by_detector(reprojected, "D1")
            self.assertEqual(len(d1_frames), 4)

            cube = np.stack([e.image for e in d1_frames], axis=0)
            diff_cube = compute_detector_aware_difference_cube(cube, [e.detector for e in d1_frames])
            mask_cube = detect_moving_objects_mask(diff_cube, sigma_mult=3.0, min_size=4)

            # Barnard's star se mueve 10.3"/año entre épocas -> debe detectarse cambio en época 0 vs 3
            self.assertTrue(np.any(mask_cube[0]) or np.any(mask_cube[-1]))

            # Trayectoria temporal de Barnard's Star (> 10" en 1.5 años)
            traj = extract_object_trajectory(d1_frames, target_wcs, pixel_scale_arcsec=eff_scale, flip_north_up=True)
            self.assertEqual(len(traj), 4)
            self.assertGreater(traj[-1].displacement_arcsec, 8.0)

            # Median stack debe eliminar rayos cósmicos transitorios
            stacked = stack_images(cube, method="median")
            self.assertEqual(stacked.shape, shape_out)
            self.assertTrue(np.isfinite(stacked).any())

    def test_stretch_rgb_flags_and_gif(self) -> None:
        wise = PRESET_TARGETS["wise_0855"]
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = generate_spherex_mef_sequence(
                target_id=wise.id,
                ra_deg=wise.ra_deg,
                dec_deg=wise.dec_deg,
                fov_arcmin=6.0,
                output_dir=Path(tmpdir),
            )
            target_wcs, shape_out, _ = build_target_wcs(wise.ra_deg, wise.dec_deg, 6.0)
            reprojected = reproject_sequence(paths, target_wcs, shape_out)

            for stretch in (StretchMethod.asinh, StretchMethod.zscale, StretchMethod.percentile):
                test_arr = reprojected[0].image.copy()
                test_arr[0, 0] = np.nan
                u8 = normalize_to_uint8(test_arr, stretch=stretch)
                self.assertEqual(u8.dtype, np.uint8)
                self.assertEqual(u8.shape, shape_out)

            rgb_frames = build_false_color_rgb_frames(reprojected, stretch=StretchMethod.asinh)
            self.assertEqual(len(rgb_frames), 4)
            self.assertEqual(rgb_frames[0][0].shape, (120, 120, 3))

            # Verificar decodificación de FLAGS en frames con y sin rayo cósmico
            statuses = {decode_quality_flags(e.flags, e.image, e.flag_definitions).status.value for e in reprojected}
            self.assertIn("ok", statuses)
            self.assertTrue("warning" in statuses or "bad" in statuses)

            # Verificar extracción espectral de WISE 0855: mucho más brillante en D5/D6 que en D1
            spec = extract_spectrum(reprojected, target_wcs, wise.ra_deg, wise.dec_deg, aperture_arcsec=12.0)
            self.assertEqual(len(spec), 24)
            d1_flux = np.mean([p.flux for p in spec if p.detector == "D1"])
            d5_flux = np.mean([p.flux for p in spec if p.detector == "D5"])
            self.assertGreater(d5_flux, d1_flux * 3.0)

            # Verificar GIF animado válido
            gif_bytes = create_animated_gif(
                [rgb_frames[0][0], rgb_frames[1][0]],
                [
                    {"obs_utc": "2025-05-15T00:00:00Z", "mjd": 60810.0, "detector": "D5", "wavelength_um": 3.8, "mode": "rgb"},
                    {"obs_utc": "2025-11-14T00:00:00Z", "mjd": 60992.5, "detector": "D5", "wavelength_um": 3.8, "mode": "rgb"},
                ],
                fps=3.0,
            )
            self.assertTrue(gif_bytes.startswith(b"GIF8"))


if __name__ == "__main__":
    unittest.main()

