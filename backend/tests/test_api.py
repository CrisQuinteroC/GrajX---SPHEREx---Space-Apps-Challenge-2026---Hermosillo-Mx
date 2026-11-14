"""Pruebas de integración de los endpoints REST FastAPI y consola de debug."""

from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from backend.app.main import app


class TestBackendApi(unittest.TestCase):
    def test_health_presets_and_debug_page(self) -> None:
        with TestClient(app) as client:
            dbg = client.get("/debug")
            self.assertEqual(dbg.status_code, 200)
            self.assertIn("GrajX", dbg.text)

            root = client.get("/", follow_redirects=False)
            self.assertIn(root.status_code, (302, 307))

            health = client.get("/api/health")
            self.assertEqual(health.status_code, 200)
            h_json = health.json()
            self.assertEqual(h_json["status"], "ok")
            self.assertEqual(len(h_json["presets_ready"]), 5)

            presets = client.get("/api/presets")
            self.assertEqual(presets.status_code, 200)
            p_json = presets.json()
            self.assertEqual(len(p_json), 5)
            ids = {p["id"] for p in p_json}
            self.assertEqual(
                ids,
                {"barnards_star", "epsilon_indi_b", "wise_0855", "rw_aurigae", "r_draconis"},
            )

    def test_coordinates_and_estimate_validation(self) -> None:
        with TestClient(app) as client:
            ok = client.get(
                "/api/coordinates/parse",
                params={"ra": "08h55m10.831s", "dec": "-7d14m42.53s"},
            )
            self.assertEqual(ok.status_code, 200)
            data = ok.json()
            self.assertAlmostEqual(data["ra_deg"], 133.79513, places=4)
            self.assertEqual(data["matched_preset"]["id"], "wise_0855")

            bad = client.get("/api/coordinates/parse", params={"ra": "999", "dec": "100"})
            self.assertEqual(bad.status_code, 400)

            est = client.get("/api/estimate", params={"ra": "133.79513", "dec": "-7.24515", "fov": 15.0})
            self.assertEqual(est.status_code, 200)
            self.assertGreater(est.json()["estimated_size_mb"], 0)

            bad_fov = client.get("/api/estimate", params={"ra": "133.79513", "dec": "-7.24515", "fov": 50.0})
            self.assertEqual(bad_fov.status_code, 400)

    def test_frames_modes_assets_spectrum_and_gif(self) -> None:
        with TestClient(app) as client:
            # 1. Modo diff con máscara 3σ para Barnard's Star
            resp = client.get(
                "/api/frames",
                params={
                    "ra": "barnards_star",
                    "fov": 6.0,
                    "mode": "diff",
                    "detector": "D3",
                    "include_mask": "true",
                    "source": "auto",
                },
            )
            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertEqual(body["data_source"], "preset_cache")
            self.assertEqual(len(body["frames"]), 4)
            first = body["frames"][0]
            self.assertTrue(first["image_url"].startswith("/api/assets/"))
            self.assertIsNotNone(first["mask_overlay_url"])

            img_resp = client.get(first["image_url"])
            self.assertEqual(img_resp.status_code, 200)
            self.assertEqual(img_resp.headers["content-type"], "image/png")

            mask_resp = client.get(first["mask_overlay_url"])
            self.assertEqual(mask_resp.status_code, 200)

            # 2. Por defecto /api/frames debe usar modo rgb (color) y devolver trayectoria para astros en movimiento
            default_resp = client.get("/api/frames", params={"ra": "barnards_star"})
            self.assertEqual(default_resp.status_code, 200)
            default_body = default_resp.json()
            self.assertEqual(default_body["query"]["mode"], "rgb")
            self.assertEqual(len(default_body["frames"]), 4)
            self.assertEqual(len(default_body["trajectory"]), 4)
            self.assertGreater(default_body["trajectory"][-1]["displacement_arcsec"], 8.0)

            # Objeto estacionario variable (RW Aurigae) no debe generar trayectoria falsa
            rw_resp = client.get("/api/frames", params={"ra": "rw_aurigae"})
            self.assertEqual(rw_resp.status_code, 200)
            self.assertEqual(rw_resp.json()["query"]["mode"], "rgb")
            self.assertEqual(rw_resp.json()["trajectory"], [])

            # 3. Modos stack y rgb explícito para WISE 0855
            stack_resp = client.get(
                "/api/frames",
                params={"ra": "133.79513", "dec": "-7.24515", "mode": "stack", "detector": "D5"},
            )
            self.assertEqual(stack_resp.status_code, 200)
            self.assertEqual(len(stack_resp.json()["frames"]), 1)

            rgb_resp = client.get(
                "/api/frames",
                params={"ra": "133.79513", "dec": "-7.24515", "mode": "rgb"},
            )
            self.assertEqual(rgb_resp.status_code, 200)
            self.assertEqual(len(rgb_resp.json()["frames"]), 4)
            self.assertEqual(len(rgb_resp.json()["trajectory"]), 4)
            self.assertGreater(rgb_resp.json()["trajectory"][-1]["displacement_arcsec"], 5.0)

            # 3. Espectro al vuelo y error 400 fuera de FOV
            spec = client.get(
                "/api/spectrum",
                params={"ra": "wise_0855", "fov": 6.0, "aperture_arcsec": 12.0},
            )
            self.assertEqual(spec.status_code, 200)
            self.assertEqual(len(spec.json()["points"]), 24)

            spec_oob = client.get(
                "/api/spectrum",
                params={"ra": "133.79513", "dec": "-7.24515", "fov": 6.0, "target_ra": 140.0, "target_dec": -7.24515},
            )
            self.assertEqual(spec_oob.status_code, 400)

            # 4. Cache miss explícito con source=cache -> 404
            miss = client.get(
                "/api/frames",
                params={"ra": "12.345", "dec": "-45.678", "fov": 6.0, "source": "cache"},
            )
            self.assertEqual(miss.status_code, 404)

            # 5. Exportación GIF
            gif = client.get(
                "/api/export/gif",
                params={"ra": "wise_0855", "mode": "blink", "detector": "D5", "fps": 4.0},
            )
            self.assertEqual(gif.status_code, 200)
            self.assertEqual(gif.headers["content-type"], "image/gif")
            self.assertTrue(gif.content.startswith(b"GIF8"))

            # 6. Verificar los 5 objetos obligatorios en /api/frames y /api/spectrum
            for preset_id in ("barnards_star", "epsilon_indi_b", "wise_0855", "rw_aurigae", "r_draconis"):
                f_res = client.get("/api/frames", params={"ra": preset_id, "mode": "blink", "detector": "D5"})
                self.assertEqual(f_res.status_code, 200)
                self.assertEqual(len(f_res.json()["frames"]), 4)
                s_res = client.get("/api/spectrum", params={"ra": preset_id})
                self.assertEqual(s_res.status_code, 200)
                self.assertGreaterEqual(len(s_res.json()["points"]), 18)


if __name__ == "__main__":
    unittest.main()

