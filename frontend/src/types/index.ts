export type EventType = 'sprint' | 'jump';
export type CameraView = 'side' | 'front' | 'unknown';
export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface LandmarkPoint {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence: number;
}

export interface FrameLandmarks {
  frame_index: number;
  timestamp_s: number;
  landmarks: LandmarkPoint[];
  mean_confidence: number;
  is_valid: boolean;
}

export interface MovementEvent {
  event_id: string;
  type: string;
  label: string;
  timestamp_s: number;
  frame_index: number;
  confidence: number;
  notes?: string;
}

export interface VideoMetadata {
  filename: string;
  width: number;
  height: number;
  fps: number;
  total_frames: number;
  duration_s: number;
  file_size_mb: number;
}

export interface CalibrationConfig {
  known_distance_m?: number;
  calibration_points?: number[][];
  pixels_per_meter?: number;
  is_calibrated: boolean;
  camera_view: CameraView;
  calibration_note: string;
}

export interface SprintMetrics {
  avg_speed_mps?: number;
  peak_speed_mps?: number;
  speed_calibrated: boolean;
  cadence_spm?: number;
  total_steps: number;
  avg_step_time_s?: number;
  step_time_std_s?: number;
  avg_stride_time_s?: number;
  step_symmetry_ratio?: number;
  pose_coverage_pct: number;
  valid_frames_count: number;
  total_frames_analyzed: number;
}

export interface JumpMetrics {
  flight_time_s?: number;
  takeoff_timestamp_s?: number;
  landing_timestamp_s?: number;
  horizontal_displacement_m?: number;
  horizontal_displacement_px: number;
  displacement_calibrated: boolean;
  peak_hip_height_px: number;
  takeoff_angle_deg?: number;
  pose_coverage_pct: number;
  valid_frames_count: number;
  total_frames_analyzed: number;
}

export interface ObservationItem {
  category: string;
  severity: 'info' | 'success' | 'warning';
  title: string;
  description: string;
  evidence: string;
}

export interface TimeSeriesPoint {
  timestamp_s: number;
  frame_index: number;
  speed_mps?: number;
  hip_x_norm: number;
  hip_y_norm: number;
  left_ankle_y_norm?: number;
  right_ankle_y_norm?: number;
  confidence: number;
}

export interface AnalysisSession {
  id: string;
  name: string;
  event_type: EventType;
  status: AnalysisStatus;
  progress_pct: number;
  status_message: string;
  created_at: string;
  updated_at: string;
  video_metadata?: VideoMetadata;
  calibration: CalibrationConfig;
  sprint_metrics?: SprintMetrics;
  jump_metrics?: JumpMetrics;
  events: MovementEvent[];
  time_series: TimeSeriesPoint[];
  observations: ObservationItem[];
  video_relative_url?: string;
  annotated_video_relative_url?: string;
  thumbnail_relative_url?: string;
  is_sample: boolean;
  error_message?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  mediapipe_version: string;
  model_loaded: boolean;
  model_path: string;
  system_timestamp: string;
}
