import math
from typing import Optional, List, Tuple
from ..models.schemas import CalibrationConfig, CameraView

class SpatialCalibrator:
    @staticmethod
    def compute_scale(
        known_distance_m: Optional[float],
        point1: Optional[List[float]],
        point2: Optional[List[float]],
        camera_view: CameraView = CameraView.SIDE
    ) -> CalibrationConfig:
        config = CalibrationConfig(
            known_distance_m=known_distance_m,
            camera_view=camera_view,
            is_calibrated=False,
            calibration_note="Uncalibrated: Planar metric distance cannot be computed without a known reference scale."
        )

        if not known_distance_m or known_distance_m <= 0:
            config.calibration_note = "Spatial calibration missing: Measurements reported in image pixel space."
            return config

        if not point1 or not point2 or len(point1) < 2 or len(point2) < 2:
            config.calibration_note = "Known distance provided, but 2 reference points not selected. Metrics uncalibrated."
            return config

        dx = point2[0] - point1[0]
        dy = point2[1] - point1[1]
        dist_px = math.sqrt(dx * dx + dy * dy)

        if dist_px < 5.0:
            config.calibration_note = "Calibration distance in pixels is too small (<5px) for reliable scaling."
            return config

        pixels_per_meter = dist_px / known_distance_m
        config.pixels_per_meter = round(pixels_per_meter, 3)
        config.calibration_points = [point1, point2]
        config.is_calibrated = True
        
        view_note = "Side-view planar calibration applied."
        if camera_view == CameraView.FRONT:
            view_note = "Front-view detected: lateral displacement is prone to severe foreshortening errors."
        elif camera_view == CameraView.UNKNOWN:
            view_note = "Camera angle unknown: planar scaling assumes motion is perpendicular to camera optical axis."

        config.calibration_note = f"Calibrated at {round(pixels_per_meter, 2)} px/m ({round(dist_px, 1)}px = {known_distance_m}m). {view_note}"
        return config

    @staticmethod
    def px_to_meters(px_distance: float, calibration: CalibrationConfig) -> Optional[float]:
        if not calibration.is_calibrated or not calibration.pixels_per_meter or calibration.pixels_per_meter <= 0:
            return None
        return round(px_distance / calibration.pixels_per_meter, 3)
