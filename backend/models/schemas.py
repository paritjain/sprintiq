from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class EventType(str, Enum):
    SPRINT = "sprint"
    JUMP = "jump"

class CameraView(str, Enum):
    SIDE = "side"
    FRONT = "front"
    UNKNOWN = "unknown"

class AnalysisStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class LandmarkPoint(BaseModel):
    id: int
    name: str
    x: float  # Normalized 0..1
    y: float  # Normalized 0..1
    z: float  # Normalized
    visibility: float
    presence: float

class FrameLandmarks(BaseModel):
    frame_index: int
    timestamp_s: float
    landmarks: List[LandmarkPoint]
    mean_confidence: float
    is_valid: bool

class MovementEvent(BaseModel):
    event_id: str
    type: str  # "step_left", "step_right", "takeoff", "landing"
    label: str
    timestamp_s: float
    frame_index: int
    confidence: float
    notes: Optional[str] = None

class VideoMetadata(BaseModel):
    filename: str
    width: int
    height: int
    fps: float
    total_frames: int
    duration_s: float
    file_size_mb: float

class CalibrationConfig(BaseModel):
    known_distance_m: Optional[float] = None
    calibration_points: Optional[List[List[float]]] = None  # [[x1, y1], [x2, y2]] in px
    pixels_per_meter: Optional[float] = None
    is_calibrated: bool = False
    camera_view: CameraView = CameraView.SIDE
    calibration_note: str = ""

class SprintMetrics(BaseModel):
    avg_speed_mps: Optional[float] = None
    peak_speed_mps: Optional[float] = None
    speed_calibrated: bool = False
    cadence_spm: Optional[float] = None
    total_steps: int = 0
    avg_step_time_s: Optional[float] = None
    step_time_std_s: Optional[float] = None
    avg_stride_time_s: Optional[float] = None
    step_symmetry_ratio: Optional[float] = None  # left_step_time / right_step_time
    pose_coverage_pct: float = 0.0
    valid_frames_count: int = 0
    total_frames_analyzed: int = 0

class JumpMetrics(BaseModel):
    flight_time_s: Optional[float] = None
    takeoff_timestamp_s: Optional[float] = None
    landing_timestamp_s: Optional[float] = None
    horizontal_displacement_m: Optional[float] = None
    horizontal_displacement_px: float = 0.0
    displacement_calibrated: bool = False
    peak_hip_height_px: float = 0.0
    takeoff_angle_deg: Optional[float] = None
    pose_coverage_pct: float = 0.0
    valid_frames_count: int = 0
    total_frames_analyzed: int = 0

class ObservationItem(BaseModel):
    category: str  # cadence, velocity, posture, tracking, jump_mechanics
    severity: str  # info, success, warning
    title: str
    description: str
    evidence: str

class TimeSeriesPoint(BaseModel):
    timestamp_s: float
    frame_index: int
    speed_mps: Optional[float] = None
    hip_x_norm: float
    hip_y_norm: float
    left_ankle_y_norm: Optional[float] = None
    right_ankle_y_norm: Optional[float] = None
    confidence: float

class AnalysisSession(BaseModel):
    id: str
    name: str
    event_type: EventType
    status: AnalysisStatus
    progress_pct: int = 0
    status_message: str = "Initialized"
    created_at: str
    updated_at: str
    video_metadata: Optional[VideoMetadata] = None
    calibration: CalibrationConfig = CalibrationConfig()
    sprint_metrics: Optional[SprintMetrics] = None
    jump_metrics: Optional[JumpMetrics] = None
    events: List[MovementEvent] = []
    time_series: List[TimeSeriesPoint] = []
    observations: List[ObservationItem] = []
    video_relative_url: Optional[str] = None
    annotated_video_relative_url: Optional[str] = None
    thumbnail_relative_url: Optional[str] = None
    is_sample: bool = False
    error_message: Optional[str] = None

class CreateAnalysisRequest(BaseModel):
    name: Optional[str] = None
    event_type: EventType
    camera_view: CameraView = CameraView.SIDE
    known_distance_m: Optional[float] = None
    calibration_point_1_x: Optional[float] = None
    calibration_point_1_y: Optional[float] = None
    calibration_point_2_x: Optional[float] = None
    calibration_point_2_y: Optional[float] = None
    sample_interval: int = 1
    processing_mode: str = "detailed"  # "fast" or "detailed"

class HealthResponse(BaseModel):
    status: str
    version: str
    mediapipe_version: str
    model_loaded: bool
    model_path: str
    system_timestamp: str
