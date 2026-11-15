"""Esquemas Pydantic y enumeraciones para la API REST de GrajX."""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


class ViewMode(str, Enum):
    blink = "blink"
    stack = "stack"
    diff = "diff"
    rgb = "rgb"
    curtain = "curtain"


class DetectorFilter(str, Enum):
    all = "all"
    D1 = "D1"
    D2 = "D2"
    D3 = "D3"
    D4 = "D4"
    D5 = "D5"
    D6 = "D6"
    rgb = "rgb"


class StretchMethod(str, Enum):
    asinh = "asinh"
    zscale = "zscale"
    percentile = "percentile"


class DataSourceMode(str, Enum):
    auto = "auto"
    cache = "cache"
    live = "live"


class QualityStatus(str, Enum):
    ok = "ok"
    warning = "warning"
    bad = "bad"


class HealthResponse(BaseModel):
    status: str = "ok"
    python_version: str
    presets_ready: list[str]
    irsa_reachable: bool
    active_collections: list[str] = Field(default_factory=list)


class PresetTarget(BaseModel):
    id: str
    name: str
    astrophysical_type: str
    ra_deg: float
    dec_deg: float
    ra_hms: str
    dec_dms: str
    default_fov_arcmin: float
    phenomenon: str
    recommended_mode: ViewMode
    recommended_detector: DetectorFilter
    ra: float = 0.0
    dec: float = 0.0
    recommended_fov: float = 6.0
    friendly_title: str = ""
    category: str = ""
    description: str = ""
    fun_fact: str = ""
    motion_rate: str = ""


class CoordinateParseResponse(BaseModel):
    input_ra: str
    input_dec: str | None = None
    ra_deg: float
    dec_deg: float
    ra_hms: str
    dec_dms: str
    matched_preset: PresetTarget | None = None


class EstimateResponse(BaseModel):
    ra_deg: float
    dec_deg: float
    fov_arcmin: float
    estimated_frames: int
    estimated_size_mb: float
    estimated_seconds: float
    cached: bool


class FramesQueryEcho(BaseModel):
    ra_deg: float
    dec_deg: float
    fov_arcmin: float
    mode: ViewMode
    detector: DetectorFilter
    stretch: StretchMethod


class WCSInfo(BaseModel):
    width: int
    height: int
    pixel_scale_arcsec: float
    projection: str = "TAN"
    crval1: float
    crval2: float
    crpix1: float
    crpix2: float
    cdelt1: float
    cdelt2: float


class QualityInfo(BaseModel):
    status: QualityStatus
    contamination_fraction: float
    active_flags: list[str] = Field(default_factory=list)


class StreakletSegment(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class TargetCoords(BaseModel):
    x: float = 0.5
    y: float = 0.5
    brightness: float = 1.0
    companionX: float | None = None
    companionY: float | None = None


class FrameItem(BaseModel):
    index: int
    planeid: str
    image_url: str
    mask_overlay_url: str | None = None
    mjd: float
    obs_utc: str
    detector: str
    band_name: str
    wavelength_um: float
    exposure_sec: float
    flux_unit: str = "MJy/sr"
    quality: QualityInfo
    streaklets: list[StreakletSegment] = Field(default_factory=list)
    frame_index: int = 0
    epoch_label: str = ""
    observation_date_utc: str = ""
    target_coords: TargetCoords = Field(default_factory=TargetCoords)


class TrajectoryPoint(BaseModel):
    frame_index: int
    mjd: float
    obs_utc: str
    x: float
    y: float
    ra_deg: float
    dec_deg: float
    displacement_arcsec: float = 0.0


class FramesResponse(BaseModel):
    query: FramesQueryEcho
    data_source: str
    wcs: WCSInfo
    frames: list[FrameItem]
    total_frames: int = 0
    trajectory: list[TrajectoryPoint] = Field(default_factory=list)


class SpectrumPoint(BaseModel):
    wavelength_um: float
    flux: float
    flux_err: float
    detector: str
    mjd: float
    flagged: bool = False


class MoleculeTag(BaseModel):
    id: str
    name: str
    wavelength: str
    confidence: str


class SpectrumResponse(BaseModel):
    target_ra_deg: float
    target_dec_deg: float
    aperture_arcsec: float
    flux_unit: str = "MJy/sr"
    points: list[SpectrumPoint]
    molecules: list[MoleculeTag] = Field(default_factory=list)
    interpretation_id: str = "continuous"
    interpretation: str = ""

