"""Configuración centralizada, rutas y constantes astrofísicas del backend GrajX."""

from __future__ import annotations

from pathlib import Path

# Rutas del repositorio y almacenamiento local
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

DATA_DIR = REPO_ROOT / "data"
PRESETS_DIR = DATA_DIR / "presets"
CACHE_DIR = DATA_DIR / "cache"
ASSETS_DIR = CACHE_DIR / "assets"

# Parámetros de conexión NASA/IPAC IRSA
IRSA_BASE_URL = "https://irsa.ipac.caltech.edu"
IRSA_TAP_URL = f"{IRSA_BASE_URL}/TAP"
IRSA_TIMEOUT_SEC = 15.0
COLLECTION_TTL_SEC = 21600  # 6 horas
MAX_TAP_RESULTS = 200
DOWNLOAD_WORKERS = 4

# Límites espaciales y parámetros WCS por defecto
MIN_FOV_ARCMIN = 1.0
MAX_FOV_ARCMIN = 30.0
DEFAULT_FOV_ARCMIN = 6.0
DEFAULT_PIXEL_SCALE_ARCSEC = 3.0

# Cobertura espectral aproximada por cada conjunto de detectores LVF de SPHEREx (µm)
DETECTOR_BANDS: dict[str, tuple[float, float]] = {
    "D1": (0.75, 1.10),
    "D2": (1.10, 1.62),
    "D3": (1.62, 2.42),
    "D4": (2.42, 3.20),
    "D5": (3.20, 4.15),
    "D6": (4.15, 5.00),
}

# Definición estándar de bits en HDU FLAGS de SPHEREx
FLAG_BIT_DEFINITIONS: dict[int, str] = {
    0: "cosmic_ray",
    1: "saturated",
    2: "hot_dead_pixel",
    3: "persistence",
    4: "stray_light",
    5: "missing_data",
}


def ensure_directories() -> None:
    """Crea los directorios de datos y caché si aún no existen."""
    for directory in (DATA_DIR, PRESETS_DIR, CACHE_DIR, ASSETS_DIR):
        directory.mkdir(parents=True, exist_ok=True)

