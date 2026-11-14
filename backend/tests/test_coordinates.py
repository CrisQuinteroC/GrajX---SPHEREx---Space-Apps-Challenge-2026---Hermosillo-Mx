"""Pruebas de normalización de coordenadas celestes a ICRS."""

from __future__ import annotations

import unittest

from backend.app.irsa_client import format_icrs_sexagesimal, parse_coordinates
from backend.app.presets import find_matching_preset


class TestCoordinateParsing(unittest.TestCase):
    def test_decimal_degrees(self) -> None:
        ra, dec = parse_coordinates("133.79513", "-7.24515")
        self.assertAlmostEqual(ra, 133.79513, places=5)
        self.assertAlmostEqual(dec, -7.24515, places=5)

        ra2, dec2 = parse_coordinates("133.79513, -7.24515")
        self.assertAlmostEqual(ra2, 133.79513, places=5)
        self.assertAlmostEqual(dec2, -7.24515, places=5)

    def test_sexagesimal_hms_dms(self) -> None:
        ra, dec = parse_coordinates("08h55m10.831s", "-7d14m42.53s")
        self.assertAlmostEqual(ra, 133.79513, places=4)
        self.assertAlmostEqual(dec, -7.24515, places=4)

        ra_c, dec_c = parse_coordinates("08h55m10.831s -7d14m42.53s")
        self.assertAlmostEqual(ra_c, 133.79513, places=4)
        self.assertAlmostEqual(dec_c, -7.24515, places=4)

    def test_sexagesimal_colons_and_unicode(self) -> None:
        ra, dec = parse_coordinates("17:57:48.50 +04:41:36.1")
        self.assertAlmostEqual(ra, 269.45208, places=4)
        self.assertAlmostEqual(dec, 4.69336, places=4)

        ra_u, dec_u = parse_coordinates("17h 57m 48.50s", "+04° 41' 36.1\"")
        self.assertAlmostEqual(ra_u, 269.45208, places=4)
        self.assertAlmostEqual(dec_u, 4.69336, places=4)

    def test_preset_name_resolution_and_matching(self) -> None:
        ra, dec = parse_coordinates("WISE 0855")
        self.assertAlmostEqual(ra, 133.79513, places=5)
        self.assertAlmostEqual(dec, -7.24515, places=5)

        matched = find_matching_preset(ra, dec)
        self.assertIsNotNone(matched)
        assert matched is not None
        self.assertEqual(matched.id, "wise_0855")

        ra_hms, dec_dms = format_icrs_sexagesimal(ra, dec)
        self.assertIn("h", ra_hms)
        self.assertIn("°", dec_dms)

    def test_invalid_coordinates_raise(self) -> None:
        with self.assertRaises(ValueError):
            parse_coordinates("365.0", "10.0")
        with self.assertRaises(ValueError):
            parse_coordinates("120.0", "-95.0")
        with self.assertRaises(ValueError):
            parse_coordinates("", None)
        with self.assertRaises(ValueError):
            parse_coordinates("invalid_not_a_sky_target_xyz_123", None)


if __name__ == "__main__":
    unittest.main()

